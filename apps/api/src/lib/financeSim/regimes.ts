/**
 * Régimes de marché et leurs paramètres. Toutes les valeurs sont ANNUELLES (0.09 = 9 % par an) ;
 * le moteur les convertit en mois (μ/12, σ/√12). On compresse le temps, jamais les rendements.
 *
 * Ordres de grandeur inspirés de l'histoire longue des marchés (actions mondiales ≈ 7 %/an en
 * moyenne avec ≈ 15 % de volatilité, obligations ≈ 2-4 %, fonds en euros ≈ 1-3 % ces dernières
 * années, inflation cible 2 %), arrondis et simplifiés. Ce ne sont PAS des prévisions.
 */

export const REGIME_CODES = [
  "EXPANSION",
  "HAUSSE",
  "VOLATIL",
  "CRISE",
  "REPRISE",
  "STAGNATION",
  "INFLATION",
] as const;
export type RegimeCode = (typeof REGIME_CODES)[number];

export interface RegimeParams {
  /** Taux annuel vers lequel converge (lentement) le rendement du support Sécurisé, avant frais. */
  secureTargetRate: number;
  /** Inflation annuelle vers laquelle converge l'indice des prix. */
  inflationTarget: number;
  /** Prêter : rendement annuel moyen, volatilité annuelle, corrélation avec le facteur actions. */
  preter: { mu: number; sigma: number; rhoWithEquity: number };
  /** Panier Monde : exposé au seul facteur actions mondial. */
  monde: { mu: number; sigma: number };
  /**
   * Entreprises : sensibilité `beta` au facteur actions + risque propre (`idioSigma`) qui ne
   * disparaît pas faute de diversification. `mu` proche de Monde : le risque propre n'est pas
   * rémunéré, ce qui est le constat empirique standard.
   */
  entreprises: { mu: number; beta: number; idioSigma: number };
}

export const REGIME_PARAMS: Readonly<Record<RegimeCode, RegimeParams>> = {
  // Croissance calme : l'économie va bien, les marchés montent sans excès.
  EXPANSION: {
    secureTargetRate: 0.022,
    inflationTarget: 0.02,
    preter: { mu: 0.035, sigma: 0.035, rhoWithEquity: 0.2 },
    monde: { mu: 0.1, sigma: 0.12 },
    entreprises: { mu: 0.1, beta: 1.1, idioSigma: 0.16 },
  },
  // Marché favorable : hausse nette et assez régulière.
  HAUSSE: {
    secureTargetRate: 0.022,
    inflationTarget: 0.02,
    preter: { mu: 0.035, sigma: 0.035, rhoWithEquity: 0.2 },
    monde: { mu: 0.16, sigma: 0.11 },
    entreprises: { mu: 0.17, beta: 1.15, idioSigma: 0.17 },
  },
  // Marché agité : fortes variations sans tendance claire.
  VOLATIL: {
    secureTargetRate: 0.02,
    inflationTarget: 0.022,
    preter: { mu: 0.02, sigma: 0.05, rhoWithEquity: 0 },
    monde: { mu: 0.03, sigma: 0.22 },
    entreprises: { mu: 0.03, beta: 1.15, idioSigma: 0.2 },
  },
  // Forte baisse : ≈ -25 à -40 % sur 8 à 14 mois pour le Panier Monde. Prêter résiste en partie.
  CRISE: {
    secureTargetRate: 0.015,
    inflationTarget: 0.01,
    preter: { mu: 0.01, sigma: 0.06, rhoWithEquity: -0.2 },
    monde: { mu: -0.35, sigma: 0.28 },
    entreprises: { mu: -0.4, beta: 1.2, idioSigma: 0.24 },
  },
  // Reprise après une crise : rebond rapide mais irrégulier.
  REPRISE: {
    secureTargetRate: 0.015,
    inflationTarget: 0.015,
    preter: { mu: 0.04, sigma: 0.045, rhoWithEquity: 0.2 },
    monde: { mu: 0.22, sigma: 0.18 },
    entreprises: { mu: 0.24, beta: 1.15, idioSigma: 0.2 },
  },
  // Stagnation : taux bas, marché plat qui oscille.
  STAGNATION: {
    secureTargetRate: 0.01,
    inflationTarget: 0.008,
    preter: { mu: 0.01, sigma: 0.03, rhoWithEquity: 0.1 },
    monde: { mu: 0.01, sigma: 0.13 },
    entreprises: { mu: 0.01, beta: 1.1, idioSigma: 0.17 },
  },
  // Inflation importante : les prix montent vite, les taux montent, obligations et actions
  // baissent ensemble (la diversification protège moins — cf. 2022).
  INFLATION: {
    secureTargetRate: 0.03,
    inflationTarget: 0.07,
    preter: { mu: -0.06, sigma: 0.07, rhoWithEquity: 0.5 },
    monde: { mu: -0.03, sigma: 0.18 },
    entreprises: { mu: -0.04, beta: 1.1, idioSigma: 0.19 },
  },
};

/** Vitesse mensuelle d'ajustement du taux Sécurisé vers sa cible (lissage type fonds en euros). */
export const SECURE_RATE_ADJUSTMENT = 1 / 12;
/** Taux Sécurisé de départ (annuel, avant frais). */
export const SECURE_RATE_START = 0.022;
/** Vitesse mensuelle de retour de l'inflation vers la cible du régime. */
export const INFLATION_REVERSION = 0.15;
/** Bruit mensuel sur l'inflation annualisée. */
export const INFLATION_NOISE = 0.003;
/** Inflation de départ et plancher (déflation légère possible). */
export const INFLATION_START = 0.02;
export const INFLATION_FLOOR = -0.01;
/**
 * Garde-fou : un rendement mensuel ne peut pas être inférieur à -95 %. Avec les paramètres
 * ci-dessus ce plancher n'est jamais atteint (bruit borné à ±6σ) ; il garantit seulement
 * qu'aucune valeur ne devient négative si quelqu'un modifie un paramètre.
 */
export const MONTHLY_RETURN_FLOOR = -0.95;

/** Transitions mensuelles d'une chaîne de Markov : probabilités par régime d'arrivée (somme 1). */
export type TransitionMatrix = Partial<Record<RegimeCode, Partial<Record<RegimeCode, number>>>>;

/**
 * Chaîne « réaliste » (scénario REALISTE) : durées moyennes ≈ 1/(1-p_stay) mois.
 * EXPANSION ≈ 25 mois, HAUSSE ≈ 10, VOLATIL ≈ 7, CRISE ≈ 8, REPRISE ≈ 14, STAGNATION ≈ 14,
 * INFLATION ≈ 20. Une crise est toujours suivie d'une reprise ou d'une stagnation.
 */
export const REALISTIC_TRANSITIONS: TransitionMatrix = {
  EXPANSION: { EXPANSION: 0.96, HAUSSE: 0.013, VOLATIL: 0.016, CRISE: 0.003, STAGNATION: 0.005, INFLATION: 0.003 },
  HAUSSE: { HAUSSE: 0.9, EXPANSION: 0.065, VOLATIL: 0.03, CRISE: 0.005 },
  VOLATIL: { VOLATIL: 0.86, EXPANSION: 0.095, CRISE: 0.025, STAGNATION: 0.02 },
  CRISE: { CRISE: 0.88, REPRISE: 0.09, STAGNATION: 0.03 },
  REPRISE: { REPRISE: 0.93, EXPANSION: 0.06, VOLATIL: 0.01 },
  STAGNATION: { STAGNATION: 0.93, EXPANSION: 0.04, VOLATIL: 0.02, INFLATION: 0.01 },
  INFLATION: { INFLATION: 0.95, STAGNATION: 0.03, VOLATIL: 0.02 },
};
