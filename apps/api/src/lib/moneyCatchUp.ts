// Ce qui tombe tout seul sur l'argent d'un enfant (argent de poche, prime du coffre) est versé à la
// lecture : l'API tourne en serverless, sans tâche planifiée. À appeler avant de lire des soldes.
import { applyAllowance } from "./allowance.js";
import { syncGoals } from "./goals.js";
import { getBalances } from "./ledger.js";
import { activeRun, syncRun } from "./invest.js";
import { prisma } from "./prisma.js";
import { applyVaultPrime } from "./vaultPrime.js";

export async function catchUpMoney(childId: string, now = new Date()) {
  await applyAllowance(childId, now);
  const prime = await applyVaultPrime(childId, now);
  if (prime.coins > 0) {
    const [child, wallet] = await Promise.all([
      prisma.childProfile.findUniqueOrThrow({ where: { id: childId }, select: { householdId: true } }),
      prisma.wallet.findUniqueOrThrow({ where: { childId } }),
    ]);
    await prisma.$transaction(async (tx) => {
      // La prime peut remplir un objectif : même suivi qu'après un dépôt.
      await syncGoals(tx, childId, child.householdId, (await getBalances(tx, wallet.id)).vault);
      await tx.notification.create({
        data: { householdId: child.householdId, audience: "CHILD", childId, type: "vault_prime", payload: { amount: prime.coins, weeks: prime.count, step: prime.step } },
      });
    });
  }
  const run = await activeRun(prisma, childId);
  if (run && run.fundedAmount !== null && run.settledAt === null) await syncRun(prisma, run, now);
}
