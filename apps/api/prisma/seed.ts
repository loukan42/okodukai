import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import type { CardRarity } from "@prisma/client";
import { DEFAULT_SLOT_CONFIG } from "../src/lib/boosters.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed Okodukai — foyer de démonstration Martin");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.simulationTransaction.deleteMany(),
    prisma.simulationPortfolio.deleteMany(),
    prisma.simulationScenario.deleteMany(),
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
    data: { name: "Famille Martin", currencyName: "Pièces" },
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
      avatarId: "avatar-fox",
      pinHash: await argon2.hash("1234"),
    },
  });
  const lucas = await prisma.childProfile.create({
    data: {
      householdId: household.id,
      displayName: "Lucas",
      ageBand: "AGE_10_12",
      avatarId: "avatar-owl",
      pinHash: await argon2.hash("5678"),
    },
  });

  const emmaWallet = await prisma.wallet.create({ data: { childId: emma.id } });
  const lucasWallet = await prisma.wallet.create({ data: { childId: lucas.id } });

  // -- Univers & cartes ------------------------------------------------------

  const universeSeeds: { code: string; title: string; description: string; sortOrder: number }[] = [
    { code: "dinosaures", title: "Dinosaures", description: "Des géants disparus il y a des millions d'années.", sortOrder: 1 },
    { code: "espace", title: "Espace", description: "Planètes, étoiles et exploration spatiale.", sortOrder: 2 },
    { code: "animaux-extraordinaires", title: "Animaux extraordinaires", description: "Les créatures les plus étonnantes de la planète.", sortOrder: 3 },
  ];

  const rarityPlan: { rarity: CardRarity; count: number }[] = [
    { rarity: "COMMUNE", count: 20 },
    { rarity: "PEU_COMMUNE", count: 10 },
    { rarity: "RARE", count: 6 },
    { rarity: "EPIQUE", count: 3 },
    { rarity: "LEGENDAIRE", count: 1 },
  ];

  const cardNamesByUniverse: Record<string, string[]> = {
    dinosaures: [
      "Tricératops", "Tyrannosaure", "Vélociraptor", "Diplodocus", "Stégosaure",
      "Spinosaure", "Ankylosaure", "Ptéranodon", "Brachiosaure", "Iguanodon",
      "Allosaure", "Parasaurolophus", "Compsognathus", "Carnotaure", "Deinonychus",
      "Pachycephalosaure", "Gallimimus", "Therizinosaure", "Styracosaure", "Oviraptor",
      "Mosasaure", "Elasmosaure", "Quetzalcoatlus", "Giganotosaure", "Baryonyx",
      "Euoplocephale", "Camarasaure", "Cryolophosaure", "Kentrosaure", "Microraptor",
      "Torosaure", "Pentaceratops", "Amargasaure", "Nothosaure", "Archaeopteryx",
      "Suchomimus", "Majungasaure", "Edmontosaure", "Sinoceratops", "Rex Doré",
    ],
    espace: [
      "Mercure", "Vénus", "Terre", "Mars", "Jupiter",
      "Saturne", "Uranus", "Neptune", "Lune", "Soleil",
      "Comète de Halley", "Ceinture d'astéroïdes", "Station spatiale", "Fusée Ariane", "Trou noir",
      "Nébuleuse de l'Aigle", "Voie lactée", "Étoile filante", "Télescope Hubble", "Sonde Voyager",
      "Astronaute", "Cratère lunaire", "Anneau de Saturne", "Galaxie spirale", "Supernova",
      "Exoplanète", "Combinaison spatiale", "Module lunaire", "Satellite météo", "Étoile naine blanche",
      "Constellation d'Orion", "Aurore boréale", "Météorite", "Rover martien", "Étoile géante rouge",
      "Nuage d'Oort", "Quasar", "Pulsar", "Anneau de débris", "Étoile Polaire dorée",
    ],
    "animaux-extraordinaires": [
      "Poulpe mimétique", "Axolotl", "Pangolin", "Narval", "Okapi",
      "Fourmilier géant", "Étoile de mer", "Caméléon", "Ornithorynque", "Tigre de Sibérie",
      "Méduse immortelle", "Bernard-l'ermite", "Paresseux", "Toucan", "Manchot empereur",
      "Loutre de mer", "Chauve-souris frugivore", "Hippocampe", "Tatou", "Iguane marin",
      "Poisson-lune", "Dragon de Komodo", "Fennec", "Wombat", "Kakapo",
      "Requin-baleine", "Gecko volant", "Calmar géant", "Pieuvre à anneaux bleus", "Renard arctique",
      "Colibri abeille", "Lémurien", "Tortue luth", "Raie manta", "Gavial du Gange",
      "Écureuil volant", "Salamandre géante", "Cigogne royale", "Grand panda", "Phénix doré",
    ],
  };

  for (const uSeed of universeSeeds) {
    const universe = await prisma.universe.create({ data: uSeed });
    await prisma.householdUniverse.create({ data: { householdId: household.id, universeId: universe.id } });

    const names = cardNamesByUniverse[uSeed.code];
    let cardNumber = 1;
    for (const { rarity, count } of rarityPlan) {
      for (let i = 0; i < count; i++) {
        const name = names[cardNumber - 1] ?? `${uSeed.title} #${cardNumber}`;
        await prisma.card.create({
          data: {
            universeId: universe.id,
            cardNumber,
            name,
            rarity,
            educationalFact: `Une carte de la collection ${uSeed.title}.`,
          },
        });
        cardNumber += 1;
      }
    }

    await prisma.boosterDefinition.create({
      data: {
        universeId: universe.id,
        code: `booster-${uSeed.code}`,
        title: `Booster ${uSeed.title}`,
        cardCount: 5,
        rngVersion: "v1",
        slotConfig: DEFAULT_SLOT_CONFIG as object,
      },
    });
  }

  const dinoBooster = await prisma.boosterDefinition.findFirstOrThrow({ where: { code: "booster-dinosaures" } });
  const espaceBooster = await prisma.boosterDefinition.findFirstOrThrow({ where: { code: "booster-espace" } });

  // -- Quêtes ------------------------------------------------------------

  const questSeeds = [
    { child: emma, title: "Vider le lave-vaisselle", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
    { child: emma, title: "Ranger sa chambre", category: "AUTONOMIE", difficulty: "MOYENNE", coins: 15, xp: 20 },
    { child: emma, title: "Mettre la table", category: "ENTRAIDE", difficulty: "FACILE", coins: 5, xp: 10 },
    { child: emma, title: "Lire 15 minutes", category: "APPRENTISSAGE", difficulty: "FACILE", coins: 5, xp: 15, booster: dinoBooster.id },
    { child: emma, title: "Préparer son sac d'école", category: "AUTONOMIE", difficulty: "FACILE", coins: 5, xp: 10 },
    { child: lucas, title: "Sortir les poubelles", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
    { child: lucas, title: "Aider à nettoyer la voiture", category: "ENTRAIDE", difficulty: "IMPORTANTE", coins: 40, xp: 35, booster: espaceBooster.id },
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

  // -- Badges catalogue ------------------------------------------------------

  await prisma.badge.createMany({
    data: [
      { code: "premier_objectif", title: "Premier objectif", description: "Atteindre son premier objectif d'épargne." },
      { code: "super_epargnant", title: "Super épargnant", description: "Conserver une somme dans son coffre." },
      { code: "explorateur", title: "Explorateur", description: "Découvrir trois modules éducatifs." },
      { code: "collectionneur", title: "Collectionneur", description: "Obtenir 50 cartes différentes." },
      { code: "perseverant", title: "Persévérant", description: "Terminer dix quêtes." },
    ],
  });

  // -- Modules pédagogiques (spec §51-53) ------------------------------------

  await prisma.learningModule.createMany({
    data: [
      {
        code: "budget",
        order: 1,
        title: "Mes pièces ne sont pas infinies",
        subtitle: "Budget",
        ageBand: "ALL",
        rewardXp: 20,
        content: {
          situation: "Tu possèdes 100 pièces.",
          choice: { a: "Tout utiliser d'un coup", b: "Garder une partie de côté" },
          consequence: "Si tu gardes une partie, tu peux encore choisir plus tard.",
          explanation: "Un budget, c'est décider à l'avance comment répartir ce que l'on a.",
          vocabulary: "Dans la vraie vie, cela s'appelle un budget.",
          quiz: { question: "Si tu dépenses tout, que te reste-t-il ?", answer: "rien" },
        },
      },
      {
        code: "epargne",
        order: 2,
        title: "Maintenant ou plus tard ?",
        subtitle: "Épargne",
        ageBand: "ALL",
        rewardXp: 20,
        content: {
          situation: "Tu veux un objet qui coûte plus que ce que tu as.",
          choice: { a: "Dépenser ce que tu as sur autre chose", b: "Mettre de côté chaque semaine" },
          consequence: "En mettant de côté, tu peux atteindre ton objectif.",
          explanation: "Ne pas utiliser tout de suite permet de disposer de plus plus tard.",
          vocabulary: "Cela s'appelle épargner.",
          quiz: { question: "Épargner, c'est...", answer: "mettre de côté" },
        },
      },
      {
        code: "inflation",
        order: 3,
        title: "Pourquoi les prix changent ?",
        subtitle: "Inflation",
        ageBand: "AGE_10_12",
        rewardXp: 25,
        content: {
          situation: "Une glace coûte 10 pièces aujourd'hui.",
          choice: { a: "Le prix reste toujours pareil", b: "Le prix peut augmenter avec le temps" },
          consequence: "Plus tard, la même glace peut coûter 12 pièces.",
          explanation: "Quand les prix augmentent globalement, on parle d'inflation.",
          vocabulary: "Cela s'appelle l'inflation.",
          quiz: { question: "L'inflation, c'est quand les prix...", answer: "augmentent" },
        },
      },
    ],
  });

  // -- Simulateur : scénarios financiers pédagogiques ("unités école") -------

  await prisma.simulationScenario.create({
    data: {
      code: "cycle-standard",
      title: "Un cycle d'investissement",
      description: "Cinq périodes avec des hauts et des bas, comme dans la vraie vie.",
      returnSeries: {
        PRUDENT: [1, 0.5, 1, 0.5, 1],
        EQUILIBRE: [3, -2, 4, 1, 2],
        DYNAMIQUE: [8, -10, 12, -4, 6],
      },
    },
  });

  console.log("Seed terminé.");
  console.log("Connexion parent démo : sophie.martin@example.com / motdepasse123");
  console.log(`Foyer : ${household.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
