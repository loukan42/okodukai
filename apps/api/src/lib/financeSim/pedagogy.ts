/**
 * Calculs pédagogiques déterministes (sans marché) et règles d'arrondi d'affichage.
 * Ces tableaux ILLUSTRENT un mécanisme ; ils ne sont jamais présentés comme une prévision.
 */

/**
 * Arrondi « au plus proche, moitié vers l'extérieur » à `decimals` décimales, sans l'erreur
 * binaire classique (1.005 → 1.01 et non 1.00).
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) >= 1e15) return Math.round(value);
  const sign = value < 0 ? -1 : 1;
  const shifted = Number(`${Math.abs(value)}e${decimals}`);
  return sign * Number(`${Math.round(shifted)}e-${decimals}`);
}

/** Arrondi d'affichage des unités école (2 décimales : 108,40). */
export function roundUnits(value: number): number {
  return roundTo(value, 2);
}

/** Fraction → pourcentage arrondi (0.0412 → 4.1). */
export function toPercent(fraction: number, decimals = 1): number {
  return roundTo(fraction * 100, decimals);
}

/**
 * Formatage français d'un nombre d'unités : « 1 234,50 » (espace fine insécable pour les
 * milliers). `decimals = 0` pour les plus jeunes (« 108 »).
 */
export function formatUnitsFr(value: number, decimals = 2): string {
  const rounded = roundTo(value, decimals);
  const [intPart, decPart] = Math.abs(rounded).toFixed(decimals).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = rounded < 0 ? "-" : "";
  return decPart ? `${sign}${grouped},${decPart}` : `${sign}${grouped}`;
}

/**
 * Intérêts composés : valeur au début puis à la fin de chaque année.
 * compoundInterestTable(100, 0.04, 3) → [100, 104, 108.16, 112.4864].
 */
export function compoundInterestTable(principal: number, annualRate: number, years: number): number[] {
  const out = [principal];
  for (let y = 1; y <= years; y++) out.push(out[y - 1] * (1 + annualRate));
  return out;
}

/** Même calcul SANS intérêts composés (intérêts simples), pour la comparaison. */
export function simpleInterestTable(principal: number, annualRate: number, years: number): number[] {
  const out: number[] = [];
  for (let y = 0; y <= years; y++) out.push(principal + principal * annualRate * y);
  return out;
}

/**
 * Effet des frais annuels sur une croissance régulière : chaque année, +rendement puis −frais.
 * feeDragTable(100, 0.04, 0.01, 10) → sans frais 148,02 ; avec frais 1 % ≈ 134,01.
 */
export function feeDragTable(principal: number, annualRate: number, annualFeeRate: number, years: number) {
  const withoutFees = [principal];
  const withFees = [principal];
  for (let y = 1; y <= years; y++) {
    withoutFees.push(withoutFees[y - 1] * (1 + annualRate));
    withFees.push(withFees[y - 1] * (1 + annualRate) * (1 - annualFeeRate));
  }
  return { withoutFees, withFees };
}

/** Prix d'un objet après inflation, à partir de l'indice des prix de la trajectoire. */
export function priceAfterInflation(basePrice: number, priceIndexStart: number, priceIndexNow: number): number {
  return (basePrice * priceIndexNow) / priceIndexStart;
}

/** Pouvoir d'achat d'une somme, exprimé en unités « du départ ». */
export function purchasingPower(value: number, priceIndexStart: number, priceIndexNow: number): number {
  return (value * priceIndexStart) / priceIndexNow;
}

/** Inflation constante : prix d'un panier à 100 au fil des années. */
export function inflationTable(annualInflation: number, years: number, basePrice = 100): number[] {
  return compoundInterestTable(basePrice, annualInflation, years);
}
