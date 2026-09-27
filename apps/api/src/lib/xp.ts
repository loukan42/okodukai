import type { Prisma, XpSourceType } from "@prisma/client";
import { levelFromTotalXp, LEVEL_TITLES } from "./levels.js";

type Tx = Prisma.TransactionClient;

export interface GrantXpInput {
  childId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  idempotencyKey: string;
}

/**
 * Booster de niveau : un par niveau gagné, une seule fois (sourceId `level:N`). Il vient d'un
 * univers activé par le foyer, à tour de rôle ; sans univers activé, le niveau est fêté sans booster.
 */
async function grantLevelRewards(tx: Tx, childId: string, householdId: string, from: number, to: number) {
  const definitions = await tx.boosterDefinition.findMany({
    where: { universe: { active: true, householdGrants: { some: { householdId } }, cards: { some: { active: true } } } },
    orderBy: { code: "asc" },
    select: { id: true },
  });
  for (let level = from + 1; level <= to; level++) {
    const sourceId = `level:${level}`;
    const already = await tx.boosterInstance.findFirst({ where: { childId, sourceType: "level_up", sourceId } });
    let boosters = 0;
    if (!already && definitions.length > 0) {
      await tx.boosterInstance.create({
        data: { childId, definitionId: definitions[level % definitions.length].id, sourceType: "level_up", sourceId },
      });
      boosters = 1;
    }
    if (already) continue;
    await tx.notification.create({
      data: {
        householdId,
        audience: "CHILD",
        childId,
        type: "level_up",
        payload: { level, boosters, title: LEVEL_TITLES.find((t) => t.level === level)?.code ?? null },
      },
    });
  }
}

export async function grantXp(tx: Tx, input: GrantXpInput) {
  if (input.amount <= 0) return null;

  // Un seul gain d'XP à la fois par enfant : le passage de niveau (et son booster) n'est compté qu'une fois.
  await tx.$queryRaw`SELECT "id" FROM "ChildProfile" WHERE "id" = ${input.childId} FOR UPDATE`;

  const existing = await tx.xpTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return null;

  await tx.xpTransaction.create({
    data: {
      childId: input.childId,
      amount: input.amount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
    },
  });

  const totalXp = await tx.xpTransaction.aggregate({
    where: { childId: input.childId },
    _sum: { amount: true },
  });

  const total = totalXp._sum.amount ?? 0;
  const { level } = levelFromTotalXp(total);

  const before = await tx.childProfile.findUniqueOrThrow({ where: { id: input.childId } });

  await tx.childProfile.update({
    where: { id: input.childId },
    data: { currentXp: total, currentLevel: level },
  });

  const leveledUp = level > before.currentLevel;
  if (leveledUp) await grantLevelRewards(tx, input.childId, before.householdId, before.currentLevel, level);

  return { totalXp: total, level, leveledUp };
}
