import type { Prisma, PrismaClient } from "@prisma/client";
import { importKidsgamebookCollection } from "./kidsgamebookImport.js";

// Contenu de référence d'Okodukai (univers et cartes, boosters, badges, modules pédagogiques).
// Rejouable sans effet de bord (upserts) : lancé à chaque déploiement de production après les
// migrations (apps/api/vercel.json), et par le seed de démonstration en local.

const BADGES: Prisma.BadgeCreateInput[] = [
  { code: "premier_objectif", title: "Premier objectif", description: "Atteindre son premier objectif d'épargne." },
  { code: "super_epargnant", title: "Super épargnant", description: "Conserver une somme dans son coffre." },
  { code: "explorateur", title: "Explorateur", description: "Découvrir trois modules éducatifs." },
  { code: "collectionneur", title: "Collectionneur", description: "Obtenir 50 cartes différentes." },
  { code: "perseverant", title: "Persévérant", description: "Terminer dix quêtes." },
];

const MODULES: Prisma.LearningModuleCreateInput[] = [
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
      quiz: {
        question: "Si tu dépenses tout, que te reste-t-il ?",
        options: ["Encore la moitié", "Rien", "Le double"],
        answerIndex: 1,
        explanation: "Tout ce qui est dépensé est sorti : il ne reste rien pour plus tard.",
      },
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
      quiz: {
        question: "Épargner, c'est…",
        options: ["Tout dépenser tout de suite", "Mettre de côté pour plus tard", "Emprunter à un ami"],
        answerIndex: 1,
        explanation: "Épargner, c'est garder une partie de ce qu'on a pour l'utiliser plus tard.",
      },
    },
  },
  {
    code: "inflation",
    order: 3,
    title: "Pourquoi les prix changent ?",
    subtitle: "Inflation",
    ageBand: "AGE_10_12",
    rewardXp: 25,
    // En unités école, sur la liste du marché : jamais avec les prix de la boutique familiale.
    content: {
      situation: "Au marché de la vallée, la liste de courses coûte 100 unités école.",
      choice: { a: "Elle coûtera toujours 100", b: "Son prix peut changer avec le temps" },
      consequence: "Un an plus tard, la même liste coûte 103 unités école.",
      explanation: "Quand la plupart des prix montent avec le temps, on parle d'inflation. Les prix de ta boutique familiale, eux, sont fixés par tes parents.",
      vocabulary: "Cela s'appelle l'inflation.",
      quiz: {
        question: "L'inflation, c'est quand la plupart des prix…",
        options: ["Baissent", "Restent toujours pareils", "Augmentent"],
        answerIndex: 2,
        explanation: "L'inflation, c'est quand la plupart des prix montent avec le temps.",
      },
    },
  },
];

export async function seedContent(prisma: PrismaClient) {
  const universes = await importKidsgamebookCollection(prisma);
  for (const badge of BADGES) {
    await prisma.badge.upsert({ where: { code: badge.code }, create: badge, update: { title: badge.title, description: badge.description } });
  }
  for (const module of MODULES) {
    await prisma.learningModule.upsert({ where: { code: module.code }, create: module, update: module });
  }
  return universes;
}
