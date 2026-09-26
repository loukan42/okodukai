/**
 * Mesures sur une série de valeurs mensuelles. N'utilisent que +, −, ×, ÷ et √
 * (reproductibles bit pour bit).
 */

/** Plus forte baisse depuis un sommet, en fraction positive (0.3 = -30 %). */
export function maxDrawdown(series: readonly number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of series) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > worst) worst = dd;
    }
  }
  return worst;
}

/** Variation totale en fraction (0.12 = +12 %). */
export function totalReturn(series: readonly number[]): number {
  return series[series.length - 1] / series[0] - 1;
}

/**
 * Rendement annuel moyen « simple » (non composé) : variation totale / nombre d'années.
 * Utilisé pour les critères d'acceptation des scénarios parce qu'il reste exact en arithmétique
 * flottante (pas de puissance fractionnaire).
 */
export function simpleAnnualizedReturn(series: readonly number[]): number {
  const years = (series.length - 1) / 12;
  return years > 0 ? totalReturn(series) / years : 0;
}

/** Puissance entière par multiplications successives (déterministe, sans Math.pow). */
export function powInt(x: number, n: number): number {
  let out = 1;
  for (let i = 0; i < n; i++) out *= x;
  return out;
}

/**
 * Compare le rendement annualisé COMPOSÉ d'une variation totale à un taux, sans racine :
 * CAGR ≥ taux  ⟺  ratio¹² ≥ (1 + taux)^mois. Renvoie -1, 0 ou 1.
 */
export function compareAnnualized(ratio: number, months: number, annualRate: number): -1 | 0 | 1 {
  const left = powInt(ratio, 12);
  const right = powInt(1 + annualRate, months);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Vrai si le rendement annualisé composé est dans [min, max]. */
export function annualizedBetween(ratio: number, months: number, min: number, max: number): boolean {
  return compareAnnualized(ratio, months, min) >= 0 && compareAnnualized(ratio, months, max) <= 0;
}

/** Volatilité annualisée des rendements mensuels simples (écart type × √12). */
export function realizedVolatility(series: readonly number[]): number {
  const n = series.length - 1;
  if (n < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i <= n; i++) returns.push(series[i] / series[i - 1] - 1);
  let mean = 0;
  for (const r of returns) mean += r;
  mean /= n;
  let variance = 0;
  for (const r of returns) variance += (r - mean) * (r - mean);
  variance /= n - 1;
  return Math.sqrt(variance) * Math.sqrt(12);
}

/** Écart type d'un échantillon (dispersion des résultats entre trajectoires). */
export function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= n;
  let variance = 0;
  for (const v of values) variance += (v - mean) * (v - mean);
  return Math.sqrt(variance / (n - 1));
}

/** Quantile empirique (interpolation linéaire), q ∈ [0, 1]. */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
