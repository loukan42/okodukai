export type AgeBand = "AGE_8_9" | "AGE_10_12";

export type QuestStatus =
  | "DISPONIBLE"
  | "ACCEPTEE"
  | "EN_COURS"
  | "DECLAREE_TERMINEE"
  | "EN_ATTENTE_VALIDATION"
  | "VALIDEE"
  | "A_REFAIRE"
  | "REFUSEE";

export type QuestCategory =
  | "MAISON"
  | "AUTONOMIE"
  | "APPRENTISSAGE"
  | "ENTRAIDE"
  | "CREATIVITE"
  | "ECOLE"
  | "JARDIN"
  | "ANIMAUX";

export type QuestDifficulty = "FACILE" | "MOYENNE" | "IMPORTANTE" | "EXCEPTIONNELLE";
export type QuestRecurrence = "UNIQUE" | "QUOTIDIENNE" | "HEBDOMADAIRE";

export type RewardCategory = "EXPERIENCE" | "OBJET";
export type RedemptionStatus = "DEMANDEE" | "ACCEPTEE" | "A_UTILISER" | "UTILISEE" | "REFUSEE";

export type CardRarity = "COMMUNE" | "PEU_COMMUNE" | "RARE" | "EPIQUE" | "LEGENDAIRE";
export type MasteryTier = "DECOUVERTE" | "CONNAISSEUR" | "EXPERT" | "MAITRE" | null;

export const RARITY_LABELS: Record<CardRarity, string> = {
  COMMUNE: "Commune",
  PEU_COMMUNE: "Peu commune",
  RARE: "Rare",
  EPIQUE: "Épique",
  LEGENDAIRE: "Légendaire",
};

export const RARITY_ICONS: Record<CardRarity, string> = {
  COMMUNE: "⚪",
  PEU_COMMUNE: "🔵",
  RARE: "🟣",
  EPIQUE: "🟡",
  LEGENDAIRE: "🌈",
};

export interface WalletBalances {
  available: number;
  vault: number;
}
