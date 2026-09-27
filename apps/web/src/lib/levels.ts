// Niveaux et XP de l'enfant : ce que le serveur renvoie (`/child/me`) et les mots pour le dire.
// L'XP mesure l'effort et l'apprentissage, jamais l'argent : elle ne se change pas en pièces.
import { defineCopy, localized } from "../i18n";

export interface LevelView {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp?: number;
  maxLevel?: number;
  /** Code du titre actuel (voir `LEVEL_TITLE`). */
  title?: string;
  nextTitle?: { level: number; code: string } | null;
  nextReward?: { boosters: number; title: string | null } | null;
}

export const EMPTY_LEVEL: LevelView = { level: 1, xpIntoLevel: 0, xpForNextLevel: 100 };

/** Titres de la vallée (mots épicènes en français : ils valent pour tous les enfants). */
export const LEVEL_TITLE: Record<string, string> = localized({
  fr: {
    novice: "Novice de la vallée",
    cartographe: "Cartographe",
    stratege: "Stratège du coffre",
    astronome: "Astronome",
    architecte: "Architecte de la vallée",
    sage: "Sage de la bibliothèque",
    legende: "Légende de la vallée",
  } as Record<string, string>,
  en: {
    novice: "Valley newcomer",
    cartographe: "Mapmaker",
    stratege: "Vault strategist",
    astronome: "Stargazer",
    architecte: "Valley architect",
    sage: "Library sage",
    legende: "Valley legend",
  },
});

export function levelTitle(level: LevelView | null | undefined) {
  return level?.title ? LEVEL_TITLE[level.title] ?? "" : "";
}

/** Textes de l'explication « À quoi sert l'XP ? », partagés par l'accueil et le profil. */
export const XP_COPY = defineCopy({
  fr: {
    level: (n: number) => `Niveau ${n}`,
    xpLeft: (n: number, next: number) => `Encore ${n} XP avant le niveau ${next}`,
    maxed: "Tu as atteint le plus haut niveau de la vallée.",
    nextReward: "Au prochain niveau",
    boosterReward: "un booster de niveau",
    titleReward: (title: string) => `le titre « ${title} »`,
    hudNext: (n: number) => `Encore ${n} XP : un booster`,
    whatTitle: "À quoi sert l'XP ?",
    whatBody: "L'XP montre ce que tu as accompli et appris. Quand ta barre est pleine, tu passes au niveau suivant et tu reçois un booster de cartes. À certains niveaux, tu gagnes aussi un nouveau titre.",
    notCoins: "L'XP ne se change jamais en pièces. Tes pièces, elles, servent à dépenser, garder ou placer.",
    fromTitle: "D'où vient ton XP",
    from: [
      "Une quête validée par un parent",
      "Une leçon terminée à la bibliothèque",
      "Ta première répartition à l'observatoire",
      "Un bilan de fin de partie lu jusqu'au bout",
    ],
    titlesTitle: "Les titres de la vallée",
    titleAt: (n: number) => `Niveau ${n}`,
    current: "Ton titre",
  },
  en: {
    level: (n: number) => `Level ${n}`,
    xpLeft: (n: number, next: number) => `${n} more XP to reach level ${next}`,
    maxed: "You've reached the highest level in the valley.",
    nextReward: "At the next level",
    boosterReward: "a level booster",
    titleReward: (title: string) => `the title "${title}"`,
    hudNext: (n: number) => `${n} more XP: a booster`,
    whatTitle: "What is XP for?",
    whatBody: "XP shows what you've done and learned. When your bar is full, you reach the next level and get a booster of cards. At some levels you also earn a new title.",
    notCoins: "XP never turns into coins. Coins are for spending, saving or investing.",
    fromTitle: "Where your XP comes from",
    from: [
      "A quest approved by a parent",
      "A lesson finished in the library",
      "Your first split at the observatory",
      "An end-of-game report read to the end",
    ],
    titlesTitle: "Valley titles",
    titleAt: (n: number) => `Level ${n}`,
    current: "Your title",
  },
});

/** Niveaux où un titre commence (même table que le serveur, `apps/api/src/lib/levels.ts`). */
export const TITLE_STEPS: { level: number; code: string }[] = [
  { level: 1, code: "novice" },
  { level: 3, code: "cartographe" },
  { level: 5, code: "stratege" },
  { level: 8, code: "astronome" },
  { level: 12, code: "architecte" },
  { level: 16, code: "sage" },
  { level: 20, code: "legende" },
];

/** Code du titre pour un niveau donné (quand le serveur n'envoie que le niveau). */
export function titleCodeForLevel(level: number) {
  let code = TITLE_STEPS[0].code;
  for (const step of TITLE_STEPS) if (level >= step.level) code = step.code;
  return code;
}
