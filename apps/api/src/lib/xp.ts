import type { Prisma, XpSourceType } from "@prisma/client";
import { levelFromTotalXp } from "./levels.js";

type Tx = Prisma.TransactionClient;

export interface GrantXpInput {
  childId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  idempotencyKey: string;
}

export async function grantXp(tx: Tx, input: GrantXpInput) {
  if (input.amount <= 0) return null;

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

  return { totalXp: total, level, leveledUp: level > before.currentLevel };
}
