// Placements école : libellés, formats et types (docs/INVESTMENT_UX.md §0).
// Les valeurs viennent toutes du serveur ; ici on ne fait que les écrire.

export type SupportCode = "SECURISE" | "PRETER" | "MONDE" | "ENTREPRISES";
export const SUPPORT_ORDER: SupportCode[] = ["SECURISE", "PRETER", "MONDE", "ENTREPRISES"];

export interface SupportCopy {
  name: string;
  realWord: string;
  place: string;
  young: string;
  older: string;
  realLife: string;
}

export const SUPPORTS: Record<SupportCode, SupportCopy> = {
  SECURISE: {
    name: "Sécurisé",
    realWord: "épargne sécurisée",
    place: "La tour de garde",
    young: "Ta part est gardée à l'abri. Elle grandit tout doucement et ne baisse pas.",
    older: "Ta part grandit lentement et régulièrement. Dans ce jeu, elle ne baisse pas avec les marchés.",
    realLife: "Cela ressemble à un livret d'épargne, ou au « fonds en euros » d'une assurance-vie.",
  },
  PRETER: {
    name: "Prêter",
    realWord: "obligations",
    place: "Le pont en construction",
    young: "Tu prêtes tes unités à une ville imaginaire. Elle te les rend plus tard, avec un petit supplément.",
    older: "Tu prêtes à des villes et à des entreprises imaginaires. Elles te remboursent avec des intérêts. Sa valeur bouge un peu.",
    realLife: "Un prêt qu'on peut acheter et revendre s'appelle une obligation.",
  },
  MONDE: {
    name: "Panier Monde",
    realWord: "fonds",
    place: "Le marché aux mille échoppes",
    young: "Un panier avec un tout petit morceau de très nombreuses entreprises.",
    older: "Un panier qui contient une petite part de très nombreuses entreprises du monde entier. Quand certaines baissent, d'autres peuvent monter.",
    realLife: "Cela ressemble à un fonds qui suit un indice mondial.",
  },
  ENTREPRISES: {
    name: "Entreprises",
    realWord: "actions",
    place: "Trois ateliers d'artisans",
    young: "Tu as un morceau de quelques entreprises imaginaires : la Forge, la Verrerie, le Moulin. Leur valeur peut beaucoup bouger.",
    older: "Tu possèdes une petite part de quelques entreprises imaginaires. Si elles réussissent, ta part peut monter ; si elles ont des difficultés, elle peut baisser fortement.",
    realLife: "Une petite part d'une entreprise s'appelle une action.",
  },
};

export const RISK_WORD = ["", "Très calme", "Calme", "Ça bouge", "Ça bouge beaucoup", "Ça bouge très fort"];
export const RISK_SENTENCE = [
  "",
  "Niveau 1 sur 5 : la valeur varie très peu.",
  "Niveau 2 sur 5 : la valeur varie un peu.",
  "Niveau 3 sur 5 : la valeur peut varier.",
  "Niveau 4 sur 5 : la valeur peut varier fortement.",
  "Niveau 5 sur 5 : la valeur peut varier très fortement, vers le haut comme vers le bas.",
];
export const RISK_NOTE = "Plus le niveau est élevé, plus la valeur peut varier fortement. Cela ne dit pas si elle va monter ou baisser.";

export interface InvestRun {
  id: string;
  mode: "MIROIR" | "ASSURANCE_VIE";
  status: "EN_COURS" | "TERMINEE";
  feesPaid: number;
  feeRates: { entry: number; managementAnnual: number | null; arbitrage: number };
  monthlyPlan: number;
  ageYears: number;
  horizonMonths: number;
  rhythm: "RAPIDE" | "STANDARD" | "LONG";
  clock: { revealedSteps: number; elapsed: { years: number; months: number }; nextRendezVousAt: string | null; rendezVousCount: number };
  value: number;
  contributed: number;
  gain: number;
  performance: number;
  bySupport: Record<SupportCode, number>;
  actualAllocation: Record<SupportCode, number>;
  targetAllocation: Record<SupportCode, number>;
  riskLevel: number;
  supportsRisk: Record<SupportCode, number>;
  allowedSupports: SupportCode[];
  allocationStep: number;
  series: { step: number; value: number; contributed: number }[];
  statements: { index: number; step: number; scheduledAt: string; value: number; seen: boolean }[];
  unseen: number;
  lastStatement: null | { fromStep: number; toStep: number; startValue: number; endValue: number; performance: number; netFlows: number; marketEffect: number; bySupportChange: Record<SupportCode, number> };
  pendingOperations: number;
  scenarioRevealed: string | null;
  /** XP reçue pour le bilan final lu (0 avant). */
  completionXp: number;
}

export interface InvestState {
  ageBand: "AGE_8_9" | "AGE_10_12";
  gate: "disabled" | "locked" | "onboarding" | "open";
  settings: { enabled: boolean; rhythm: string; horizonMonths: number };
  allocationStep: number;
  allowedSupports?: SupportCode[];
  firstRendezVousAt?: string;
  run: InvestRun | null;
  orchard?: { gate: "hidden" | "locked" | "onboarding" | "open"; run: InvestRun | null };
}

const UNITS_2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const UNITS_0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 8-9 : unités entières ; 10-12 : deux décimales. */
export function units(value: number, young: boolean) {
  return young ? UNITS_0.format(Math.round(value)) : UNITS_2.format(value);
}

/** Variation signée en unités (« +4,20 », « −3 »), vrai signe moins. */
export function signedUnits(delta: number, young: boolean) {
  const rounded = young ? Math.round(delta) : Math.round(delta * 100) / 100;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${units(Math.abs(rounded), young)}`;
}

/** Pourcentage signé (10-12 seulement) : « +4,2 % ». */
export function signedPercent(fraction: number) {
  const v = Math.round(fraction * 1000) / 10;
  if (v === 0) return "0,0 %";
  return `${v > 0 ? "+" : "−"}${PCT.format(Math.abs(v))} %`;
}

export type Trend = "up" | "down" | "flat";

/** Stable sous 0,5 % (ou 0 unité arrondie en 8-9). */
export function trendOf(delta: number, base: number, young: boolean): Trend {
  if (young ? Math.round(delta) === 0 : Math.abs(delta / (base || 1)) < 0.005) return "flat";
  return delta > 0 ? "up" : "down";
}

export const TREND_GLYPH: Record<Trend, string> = { up: "▲", down: "▼", flat: "=" };

export function trendWords(trend: Trend, delta: number, young: boolean) {
  if (trend === "flat") return "presque pas bougé";
  const n = units(Math.abs(delta), young);
  return trend === "up" ? `${n} de plus` : `${n} de moins`;
}

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const HOUR = new Intl.DateTimeFormat("fr-FR", { hour: "numeric" });

/** « aujourd'hui à 17 h », « demain », « jeudi ». */
export function rendezVousLabel(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "";
  const d = new Date(iso);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (same(d, now)) return `aujourd'hui à ${HOUR.format(d).replace(" ", " ")}`;
  if (same(d, tomorrow)) return "demain";
  return DAY.format(d);
}

export function yearOf(step: number) {
  return Math.floor(step / 12) + 1;
}
