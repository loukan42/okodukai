// Objectifs d'épargne : Mon coffre les remplit dans l'ordre. Appelé après chaque mouvement du coffre.
import type { Prisma } from "@prisma/client";
import { checkAndAwardBadges } from "./badges.js";
import { activeGoals, allocateGoals } from "./money.js";

type Tx = Prisma.TransactionClient;

/** Marque atteints les objectifs que Mon coffre remplit désormais (une seule fois chacun). */
export async function syncGoals(tx: Tx, childId: string, householdId: string, vault: number) {
  const goals = await activeGoals(tx, childId);
  const views = allocateGoals(goals, vault);
  let reachedNow = false;
  for (const [i, view] of views.entries()) {
    if (view.reached && !goals[i].achievedAt) {
      reachedNow = true;
      await tx.savingsGoal.update({ where: { id: view.id }, data: { achievedAt: new Date() } });
      await tx.notification.create({
        data: { householdId, audience: "CHILD", childId, type: "goal_completed", payload: { goalId: view.id, goalTitle: view.title } },
      });
    }
  }
  const first = views.find((v) => !v.reached) ?? views[0];
  await tx.childProfile.update({ where: { id: childId }, data: { activeGoalId: first?.id ?? null } });
  if (reachedNow) await checkAndAwardBadges(tx, childId, householdId);
}
