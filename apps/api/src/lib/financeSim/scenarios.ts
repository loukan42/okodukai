import type { RegimeCode, TransitionMatrix } from "./regimes.js";
import { REALISTIC_TRANSITIONS } from "./regimes.js";
import type { SupportCode } from "./supports.js";
import { createRng } from "./rng.js";
import { annualizedBetween } from "./metrics.js";

/** Rendement annualisé composé du support dans [min, max] (calcul exact, cf. metrics.ts). */
const cagrIn = (m: PathMetrics, code: SupportCode, min: number, max: number) =>
  annualizedBetween(m.finalRatio[code], m.months, min, max);

/**
 * Scénarios de marché. Un scénario = une suite de phases (régimes fixes ou mini-chaînes de
 * Markov) dont les durées sont tirées au hasard, puis un critère d'acceptation qui garantit que
 * la trajectoire obtenue ressemble vraiment à son nom (tirage par rejet, seedé).
 */

export const SCENARIO_CODES = [
  "CROISSANCE_REGULIERE",
  "MARCHE_VOLATIL",
  "FORTE_BAISSE",
  "CRISE_PUIS_REPRISE",
  "STAGNATION",
  "INFLATION_IMPORTANTE",
  "MARCHE_FAVORABLE",
  "REALISTE",
] as const;
export type ScenarioCode = (typeof SCENARIO_CODES)[number];

/** Les 7 expériences pédagogiques distribuées par défaut (REALISTE est un mode à part). */
export const PEDAGOGICAL_SCENARIOS: readonly ScenarioCode[] = [
  "CROISSANCE_REGULIERE",
  "MARCHE_VOLATIL",
  "FORTE_BAISSE",
  "CRISE_PUIS_REPRISE",
  "STAGNATION",
  "INFLATION_IMPORTANTE",
  "MARCHE_FAVORABLE",
];

/** Premières expériences : ni euphorie ni catastrophe pour une toute première simulation. */
export const OPENING_SCENARIOS: readonly ScenarioCode[] = [
  "CROISSANCE_REGULIERE",
  "MARCHE_VOLATIL",
  "CRISE_PUIS_REPRISE",
];

/** Mesures d'une trajectoire candidate, fournies au critère d'acceptation. */
export interface PathMetrics {
  months: number;
  finalRatio: Record<SupportCode, number>;
  simpleAnnualized: Record<SupportCode, number>;
  maxDrawdown: Record<SupportCode, number>;
  realizedVolatility: Record<SupportCode, number>;
  /** Hausse totale de l'indice des prix (0.2 = +20 %). */
  inflationTotal: number;
  inflationSimpleAnnualized: number;
}

export type RegimeSource =
  | RegimeCode
  | { chain: TransitionMatrix; start: RegimeCode | Partial<Record<RegimeCode, number>> };

export interface ScenarioPhase {
  regimes: RegimeSource;
  /** Part de l'horizon [min, max] ; absent = la phase occupe le reste de l'horizon. */
  share?: readonly [number, number];
  /** Bornes absolues en mois appliquées après le tirage de la part. */
  months?: readonly [number, number];
}

/**
 * Tonalité attendue pour les supports risqués à la fin du scénario (mesurée, cf. doc) ;
 * sert à vérifier qu'un ensemble de scénarios n'est pas biaisé.
 */
export type ScenarioTone = "FAVORABLE" | "MITIGE" | "DEFAVORABLE";

export interface ScenarioDefinition {
  code: ScenarioCode;
  tone: ScenarioTone | null;
  phases: readonly ScenarioPhase[];
  accept: (m: PathMetrics) => boolean;
}

export const SCENARIOS: Readonly<Record<ScenarioCode, ScenarioDefinition>> = {
  CROISSANCE_REGULIERE: {
    code: "CROISSANCE_REGULIERE",
    tone: "FAVORABLE",
    phases: [
      {
        regimes: {
          chain: {
            EXPANSION: { EXPANSION: 0.94, VOLATIL: 0.06 },
            VOLATIL: { VOLATIL: 0.7, EXPANSION: 0.3 },
          },
          start: "EXPANSION",
        },
      },
    ],
    // Hausse de 4 à 11 %/an sans baisse de plus de 18 % : ni catastrophe, ni euphorie.
    accept: (m) => cagrIn(m, "MONDE", 0.04, 0.11) && m.maxDrawdown.MONDE <= 0.18,
  },
  MARCHE_VOLATIL: {
    code: "MARCHE_VOLATIL",
    tone: "MITIGE",
    phases: [
      {
        regimes: {
          chain: {
            VOLATIL: { VOLATIL: 0.85, EXPANSION: 0.08, CRISE: 0.04, REPRISE: 0.03 },
            EXPANSION: { EXPANSION: 0.8, VOLATIL: 0.2 },
            CRISE: { CRISE: 0.7, REPRISE: 0.3 },
            REPRISE: { REPRISE: 0.75, VOLATIL: 0.25 },
          },
          start: "VOLATIL",
        },
      },
    ],
    // Beaucoup de mouvement (volatilité ≥ 17 %, au moins une baisse de 12 %) pour presque rien.
    accept: (m) =>
      m.realizedVolatility.MONDE >= 0.17 && cagrIn(m, "MONDE", -0.04, 0.04) && m.maxDrawdown.MONDE >= 0.12,
  },
  FORTE_BAISSE: {
    code: "FORTE_BAISSE",
    tone: "DEFAVORABLE",
    phases: [
      { regimes: "EXPANSION", share: [0.05, 0.15], months: [2, 12] },
      { regimes: "CRISE", share: [0.15, 0.25], months: [8, 14] },
      {
        regimes: {
          chain: {
            STAGNATION: { STAGNATION: 0.88, VOLATIL: 0.07, REPRISE: 0.05 },
            VOLATIL: { VOLATIL: 0.75, STAGNATION: 0.25 },
            REPRISE: { REPRISE: 0.75, STAGNATION: 0.25 },
          },
          start: "STAGNATION",
        },
      },
    ],
    // Baisse de 25 à 55 % depuis le sommet, et on finit en dessous de 90 % du départ.
    accept: (m) => m.maxDrawdown.MONDE >= 0.25 && m.maxDrawdown.MONDE <= 0.55 && m.finalRatio.MONDE <= 0.9,
  },
  CRISE_PUIS_REPRISE: {
    code: "CRISE_PUIS_REPRISE",
    tone: "FAVORABLE",
    phases: [
      { regimes: "EXPANSION", share: [0.1, 0.2], months: [3, 18] },
      { regimes: "CRISE", share: [0.12, 0.2], months: [6, 14] },
      { regimes: "REPRISE", share: [0.25, 0.35], months: [8, 30] },
      { regimes: "EXPANSION" },
    ],
    // Une vraie crise (≥ 20 %) puis un retour au-dessus du point de départ.
    accept: (m) => m.maxDrawdown.MONDE >= 0.2 && m.maxDrawdown.MONDE <= 0.5 && m.finalRatio.MONDE >= 1,
  },
  STAGNATION: {
    code: "STAGNATION",
    tone: "DEFAVORABLE",
    phases: [
      {
        regimes: {
          chain: {
            STAGNATION: { STAGNATION: 0.92, VOLATIL: 0.05, EXPANSION: 0.03 },
            VOLATIL: { VOLATIL: 0.75, STAGNATION: 0.25 },
            EXPANSION: { EXPANSION: 0.75, STAGNATION: 0.25 },
          },
          start: "STAGNATION",
        },
      },
    ],
    // Le Panier Monde fait du surplace : entre -1,5 et +1,5 %/an.
    accept: (m) => cagrIn(m, "MONDE", -0.015, 0.015),
  },
  INFLATION_IMPORTANTE: {
    code: "INFLATION_IMPORTANTE",
    tone: "DEFAVORABLE",
    phases: [
      { regimes: "EXPANSION", share: [0.05, 0.15], months: [2, 12] },
      { regimes: "INFLATION", share: [0.4, 0.55], months: [12, 40] },
      {
        regimes: {
          chain: {
            STAGNATION: { STAGNATION: 0.85, EXPANSION: 0.15 },
            EXPANSION: { EXPANSION: 0.9, STAGNATION: 0.1 },
          },
          start: "STAGNATION",
        },
      },
    ],
    // Prix en hausse d'au moins 3 %/an en moyenne sur tout l'horizon, et Prêter finit en baisse.
    accept: (m) =>
      annualizedBetween(1 + m.inflationTotal, m.months, 0.03, Number.POSITIVE_INFINITY) && m.finalRatio.PRETER < 1,
  },
  MARCHE_FAVORABLE: {
    code: "MARCHE_FAVORABLE",
    tone: "FAVORABLE",
    phases: [
      {
        regimes: {
          chain: {
            HAUSSE: { HAUSSE: 0.9, EXPANSION: 0.1 },
            EXPANSION: { EXPANSION: 0.85, HAUSSE: 0.12, VOLATIL: 0.03 },
            VOLATIL: { VOLATIL: 0.7, EXPANSION: 0.3 },
          },
          start: "HAUSSE",
        },
      },
    ],
    // Hausse nette de 9 à 15 %/an, sans baisse de plus de 15 %.
    accept: (m) => cagrIn(m, "MONDE", 0.09, 0.15) && m.maxDrawdown.MONDE <= 0.15,
  },
  REALISTE: {
    code: "REALISTE",
    tone: null,
    phases: [
      {
        regimes: {
          chain: REALISTIC_TRANSITIONS,
          start: { EXPANSION: 0.6, VOLATIL: 0.15, STAGNATION: 0.15, HAUSSE: 0.1 },
        },
      },
    ],
    accept: () => true,
  },
};

export class ScenarioPoolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioPoolError";
  }
}

/**
 * Vérifie qu'un ensemble de scénarios autorisés contient au moins une expérience favorable ET
 * une défavorable aux supports risqués — sinon l'enfant apprendrait que « le risqué gagne
 * toujours » (ou « perd toujours »).
 */
export function assertBalancedPool(pool: readonly ScenarioCode[]): void {
  const tones = new Set(pool.map((code) => SCENARIOS[code].tone));
  if (pool.includes("REALISTE")) return;
  if (!tones.has("FAVORABLE") || !tones.has("DEFAVORABLE")) {
    throw new ScenarioPoolError(
      "Le jeu de scénarios doit contenir au moins un scénario favorable et un scénario défavorable aux supports risqués"
    );
  }
}

export interface PickScenarioInput {
  /** Seed propre à ce tirage (ex. `${childId}:${numéroDeSimulation}`), gardée côté serveur. */
  seed: string;
  /** Scénarios déjà vécus par l'enfant, du plus ancien au plus récent. */
  history: readonly ScenarioCode[];
  /** Scénarios autorisés (par défaut les 7 pédagogiques). */
  pool?: readonly ScenarioCode[];
}

/**
 * Attribution équilibrée : on choisit parmi les scénarios les moins vécus (sac « sans remise »),
 * jamais deux fois le même d'affilée, et la toute première simulation vient d'un scénario
 * d'ouverture équilibré. Sur 7 simulations, l'enfant vit chacune des 7 expériences une fois.
 */
export function pickScenario(input: PickScenarioInput): ScenarioCode {
  const pool = input.pool ?? PEDAGOGICAL_SCENARIOS;
  if (pool.length === 0) throw new ScenarioPoolError("Aucun scénario autorisé");
  assertBalancedPool(pool);
  const rng = createRng(`scenario-pick|${input.seed}`);
  const history = input.history.filter((code) => pool.includes(code));

  let candidates: ScenarioCode[];
  if (history.length === 0) {
    const openers = OPENING_SCENARIOS.filter((code) => pool.includes(code));
    candidates = openers.length > 0 ? openers : [...pool];
  } else {
    const counts = new Map<ScenarioCode, number>(pool.map((code) => [code, 0]));
    for (const code of history) counts.set(code, (counts.get(code) ?? 0) + 1);
    const min = Math.min(...counts.values());
    candidates = pool.filter((code) => counts.get(code) === min);
    const last = history[history.length - 1];
    if (candidates.length > 1) {
      candidates = candidates.filter((code) => code !== last);
    } else if (candidates[0] === last && pool.length > 1) {
      // Le seul scénario le moins vécu vient d'être joué : on prend le suivant le moins vécu.
      const others = pool.filter((code) => code !== last);
      const nextMin = Math.min(...others.map((code) => counts.get(code) ?? 0));
      candidates = others.filter((code) => counts.get(code) === nextMin);
    }
  }
  return candidates[rng.intBetween(0, candidates.length - 1)];
}
