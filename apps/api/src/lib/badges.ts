import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Codes de badges catalogue (spec §33). L'évaluation reste volontairement simple pour le MVP :
 * un badge est acquis dès que sa condition est vraie, vérifiée après l'événement pertinent.
 */
export async function checkAndAwardBadges(tx: Tx, childId: string, householdId: string) {
  const newlyAwarded: string[] = [];

  const award = async (code: string) => {
    const badge = await tx.badge.findUnique({ where: { code } });
    if (!badge) return;
    const existing = await tx.childBadge.findUnique({
      where: { childId_badgeId: { childId, badgeId: badge.id } },
    });
    if (existing) return;
    await tx.childBadge.create({ data: { childId, badgeId: badge.id } });
    await tx.notification.create({
      data: {
        householdId,
        audience: "CHILD",
        childId,
        type: "badge_earned",
        payload: { badgeCode: code, badgeTitle: badge.title },
      },
    });
    newlyAwarded.push(code);
  };

  const [validatedQuests, achievedGoals, distinctCards] = await Promise.all([
    tx.questCompletion.count({ where: { childId, status: "VALIDEE" } }),
    tx.savingsGoal.count({ where: { childId, achievedAt: { not: null } } }),
    tx.childCard.count({ where: { childId } }),
  ]);

  if (achievedGoals >= 1) await award("premier_objectif");
  if (validatedQuests >= 10) await award("perseverant");
  if (distinctCards >= 50) await award("collectionneur");

  return newlyAwarded;
}
