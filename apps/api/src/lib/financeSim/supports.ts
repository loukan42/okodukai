/**
 * Les 4 supports fictifs du simulateur. Aucun ne correspond à un produit, un indice ou une
 * entreprise réels. Les libellés affichés vivent dans l'i18n du front ; ici, seulement les codes
 * et les caractéristiques techniques.
 */

export const SUPPORT_CODES = ["SECURISE", "PRETER", "MONDE", "ENTREPRISES"] as const;
export type SupportCode = (typeof SUPPORT_CODES)[number];

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export interface SupportDefinition {
  code: SupportCode;
  /**
   * Niveau de risque pédagogique (1 à 5) : amplitude possible des variations, dans les deux
   * sens. Ne dit RIEN du rendement à attendre.
   */
  riskLevel: RiskLevel;
  /**
   * Famille assurance-vie : `FONDS_EUROS` (valeur lissée, ne baisse pas avec les marchés dans le
   * simulateur) ou `UNITE_DE_COMPTE` (valeur de part qui monte et descend).
   */
  family: "FONDS_EUROS" | "UNITE_DE_COMPTE";
}

export const SUPPORTS: Readonly<Record<SupportCode, SupportDefinition>> = {
  // Rapproché du fonds en euros : rendement lissé, crédité chaque mois, jamais négatif avant frais.
  SECURISE: { code: "SECURISE", riskLevel: 1, family: "FONDS_EUROS" },
  // Prêter (obligations) : on prête à des États / entreprises fictifs qui paient des intérêts.
  PRETER: { code: "PRETER", riskLevel: 2, family: "UNITE_DE_COMPTE" },
  // Panier Monde : un petit morceau de très nombreuses entreprises de nombreux pays.
  MONDE: { code: "MONDE", riskLevel: 4, family: "UNITE_DE_COMPTE" },
  // Entreprises : quelques entreprises seulement (concentration → plus de dispersion).
  ENTREPRISES: { code: "ENTREPRISES", riskLevel: 5, family: "UNITE_DE_COMPTE" },
};

export type Allocation = Readonly<Record<SupportCode, number>>;

export function zeroBySupport(): Record<SupportCode, number> {
  return { SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };
}

/**
 * Statistiques de référence (mensuelles annualisées) mesurées sur le scénario REALISTE
 * (chaîne de Markov libre, 5 000 trajectoires de 10 ans, moteur finsim-1.0.0), arrondies.
 * Servent uniquement à calculer le niveau de risque d'une répartition — pas à prévoir quoi que ce soit.
 */
export const REFERENCE_VOLATILITY: Readonly<Record<SupportCode, number>> = {
  SECURISE: 0.001,
  PRETER: 0.041,
  MONDE: 0.151,
  ENTREPRISES: 0.243,
};

export const REFERENCE_CORRELATION: Readonly<Record<SupportCode, Readonly<Record<SupportCode, number>>>> = {
  SECURISE: { SECURISE: 1, PRETER: 0, MONDE: 0, ENTREPRISES: 0 },
  PRETER: { SECURISE: 0, PRETER: 1, MONDE: 0.15, ENTREPRISES: 0.1 },
  MONDE: { SECURISE: 0, PRETER: 0.15, MONDE: 1, ENTREPRISES: 0.7 },
  ENTREPRISES: { SECURISE: 0, PRETER: 0.1, MONDE: 0.7, ENTREPRISES: 1 },
};

/** Seuils de volatilité annualisée pour passer d'un niveau au suivant (1→2, 2→3, 3→4, 4→5). */
export const RISK_LEVEL_THRESHOLDS = [0.01, 0.05, 0.1, 0.18] as const;

/** Volatilité de référence d'une répartition (√(wᵀ Σ w)). */
export function referenceVolatility(allocation: Allocation): number {
  let variance = 0;
  for (const i of SUPPORT_CODES) {
    for (const j of SUPPORT_CODES) {
      variance +=
        (allocation[i] / 100) *
        (allocation[j] / 100) *
        REFERENCE_VOLATILITY[i] *
        REFERENCE_VOLATILITY[j] *
        REFERENCE_CORRELATION[i][j];
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Niveau de risque pédagogique (1-5) d'une répartition. Un mélange peut tomber à un niveau
 * qu'aucun support n'a seul (ex. 50 % Prêter + 50 % Monde → 3) : c'est l'effet de la
 * diversification.
 */
export function portfolioRiskLevel(allocation: Allocation): RiskLevel {
  const vol = referenceVolatility(allocation);
  let level = 1;
  for (const threshold of RISK_LEVEL_THRESHOLDS) {
    if (vol >= threshold) level++;
  }
  return level as RiskLevel;
}
