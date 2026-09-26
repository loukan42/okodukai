import argon2 from "argon2";
import type { PrismaClient } from "@prisma/client";
import { seedContent } from "./contentSeed.js";

/**
 * Recrée le foyer de démonstration "Famille Martin" (spec §107-109).
 * Utilisé à la fois par `prisma/seed.ts` (CLI) et par la route `/dev/reseed`
 * (uniquement montée hors production, voir routes/dev.ts).
 */
export async function seedDatabase(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.learningProgress.deleteMany(),
    prisma.learningModule.deleteMany(),
    prisma.boosterOpening.deleteMany(),
    prisma.boosterInstance.deleteMany(),
    prisma.childCard.deleteMany(),
    prisma.card.deleteMany(),
    prisma.collectionSeries.deleteMany(),
    prisma.boosterDefinition.deleteMany(),
    prisma.householdUniverse.deleteMany(),
    prisma.universe.deleteMany(),
    prisma.childBadge.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.xpTransaction.deleteMany(),
    prisma.savingsGoal.deleteMany(),
    prisma.rewardRedemption.deleteMany(),
    prisma.reward.deleteMany(),
    prisma.questCompletion.deleteMany(),
    prisma.quest.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.childProfile.deleteMany(),
    prisma.householdMembership.deleteMany(),
    prisma.household.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const household = await prisma.household.create({
    data: { name: "Famille Martin", currencyName: "Pièces", onboardingCompletedAt: new Date() },
  });

  const sophie = await prisma.user.create({
    data: {
      email: "sophie.martin@example.com",
      passwordHash: await argon2.hash("motdepasse123"),
      displayName: "Sophie",
    },
  });
  const thomas = await prisma.user.create({
    data: {
      email: "thomas.martin@example.com",
      passwordHash: await argon2.hash("motdepasse123"),
      displayName: "Thomas",
    },
  });

  await prisma.householdMembership.create({
    data: { householdId: household.id, userId: sophie.id, role: "PARENT_ADMIN" },
  });
  await prisma.householdMembership.create({
    data: { householdId: household.id, userId: thomas.id, role: "PARENT" },
  });

  const emma = await prisma.childProfile.create({
    data: {
      householdId: household.id,
      displayName: "Emma",
      ageBand: "AGE_8_9",
      avatarId: "aventurier-06",
      pinHash: await argon2.hash("1234"),
    },
  });
  const lucas = await prisma.childProfile.create({
    data: {
      householdId: household.id,
      displayName: "Lucas",
      ageBand: "AGE_10_12",
      avatarId: "aventurier-05",
      pinHash: await argon2.hash("5678"),
    },
  });

  const emmaWallet = await prisma.wallet.create({ data: { childId: emma.id } });
  const lucasWallet = await prisma.wallet.create({ data: { childId: lucas.id } });

  // -- Univers & cartes (import du vrai contenu "Heros de la classe") --------

  // Contenu de référence (univers, cartes, boosters, badges, modules), le même qu'en production.
  const importedUniverses = await seedContent(prisma);

  for (const universe of importedUniverses) {
    await prisma.householdUniverse.create({
      data: { householdId: household.id, universeId: universe.id },
    });
  }

  const dinoBooster = importedUniverses.find((u) => u.code === "dinosaures-et-creatures-prehistoriques")!;
  const espaceBooster = importedUniverses.find((u) => u.code === "les-planetes-du-systeme-solaire")!;

  // -- Quêtes ------------------------------------------------------------

  const questSeeds = [
    { child: emma, title: "Vider le lave-vaisselle", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
    { child: emma, title: "Ranger sa chambre", category: "AUTONOMIE", difficulty: "MOYENNE", coins: 15, xp: 20 },
    { child: emma, title: "Mettre la table", category: "ENTRAIDE", difficulty: "FACILE", coins: 5, xp: 10 },
    { child: emma, title: "Lire 15 minutes", category: "APPRENTISSAGE", difficulty: "FACILE", coins: 5, xp: 15, booster: dinoBooster.boosterDefinitionId },
    { child: emma, title: "Préparer son sac d'école", category: "AUTONOMIE", difficulty: "FACILE", coins: 5, xp: 10 },
    { child: lucas, title: "Sortir les poubelles", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
    { child: lucas, title: "Aider à nettoyer la voiture", category: "ENTRAIDE", difficulty: "IMPORTANTE", coins: 40, xp: 35, booster: espaceBooster.boosterDefinitionId },
    { child: lucas, title: "Nourrir le chat", category: "ANIMAUX", difficulty: "FACILE", coins: 5, xp: 10, recurrence: "QUOTIDIENNE" as const },
    { child: lucas, title: "Terminer un module financier", category: "APPRENTISSAGE", difficulty: "MOYENNE", coins: 15, xp: 25 },
    { child: lucas, title: "Trier sa bibliothèque", category: "MAISON", difficulty: "MOYENNE", coins: 20, xp: 20 },
  ];

  for (const q of questSeeds) {
    await prisma.quest.create({
      data: {
        householdId: household.id,
        creatorId: sophie.id,
        childId: q.child.id,
        title: q.title,
        category: q.category as never,
        difficulty: q.difficulty as never,
        rewardCoins: q.coins,
        rewardXp: q.xp,
        boosterDefinitionId: q.booster,
        recurrence: q.recurrence ?? "UNIQUE",
      },
    });
  }

  // -- Boutique ------------------------------------------------------------

  const rewardSeeds = [
    { title: "Choisir le film", category: "EXPERIENCE", price: 20 },
    { title: "Choisir le dessert", category: "EXPERIENCE", price: 10 },
    { title: "Glace en famille", category: "EXPERIENCE", price: 100 },
    { title: "Soirée jeux de société", category: "EXPERIENCE", price: 30 },
    { title: "Sortie vélo", category: "EXPERIENCE", price: 25 },
    { title: "Choisir la musique en voiture", category: "EXPERIENCE", price: 10 },
    { title: "Inviter un ami à la maison", category: "EXPERIENCE", price: 40 },
    { title: "30 minutes d'écran supplémentaires", category: "EXPERIENCE", price: 20 },
    { title: "Petite figurine", category: "OBJET", price: 60 },
    { title: "Livre au choix", category: "OBJET", price: 50 },
  ];

  for (const r of rewardSeeds) {
    await prisma.reward.create({
      data: {
        householdId: household.id,
        title: r.title,
        category: r.category as never,
        priceCoins: r.price,
      },
    });
  }

  // -- Épargne : objectif glace pour Emma -----------------------------------

  await prisma.savingsGoal.create({
    data: { childId: emma.id, title: "Glace en famille", targetCoins: 100 },
  });

  // -- Historique de démonstration (quelques transactions) -----------------

  await prisma.walletTransaction.create({
    data: {
      walletId: emmaWallet.id,
      amount: 10,
      type: "QUEST_REWARD",
      actorId: sophie.id,
      idempotencyKey: `seed-demo-emma-1`,
      sourceType: "quest_completion",
    },
  });
  await prisma.walletTransaction.create({
    data: {
      walletId: emmaWallet.id,
      amount: 72,
      type: "PARENT_BONUS",
      actorId: sophie.id,
      idempotencyKey: `seed-demo-emma-2`,
      reason: "Solde de démarrage pour la démo",
    },
  });
  await prisma.walletTransaction.create({
    data: {
      walletId: lucasWallet.id,
      amount: 110,
      type: "PARENT_BONUS",
      actorId: sophie.id,
      idempotencyKey: `seed-demo-lucas-1`,
      reason: "Solde de démarrage pour la démo",
    },
  });

  return { household, sophie, thomas, emma, lucas };
}
