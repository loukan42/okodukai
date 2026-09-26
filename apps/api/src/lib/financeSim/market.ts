import { createRng, type Rng } from "./rng.js";
import {
  INFLATION_FLOOR,
  INFLATION_NOISE,
  INFLATION_REVERSION,
  INFLATION_START,
  MONTHLY_RETURN_FLOOR,
  REGIME_CODES,
  REGIME_PARAMS,
  SECURE_RATE_ADJUSTMENT,
  SECURE_RATE_START,
  type RegimeCode,
  type TransitionMatrix,
} from "./regimes.js";
import { SCENARIOS, type PathMetrics, type RegimeSource, type ScenarioCode } from "./scenarios.js";
import { SUPPORT_CODES, zeroBySupport, type SupportCode } from "./supports.js";
import { maxDrawdown, realizedVolatility, simpleAnnualizedReturn } from "./metrics.js";
import { ENGINE_VERSION } from "./version.js";

export const MIN_HORIZON_MONTHS = 24;
export const MAX_HORIZON_MONTHS = 120;
export const DEFAULT_MAX_ATTEMPTS = 400;
/** Valeur de départ de chaque « valeur de part » et de l'indice des prix. */
export const BASE_PRICE = 100;

const INV_SQRT12 = 1 / Math.sqrt(12);

/**
 * Trajectoire de marché complète, pré-calculée et figée à la création d'une simulation.
 * Tous les tableaux mensuels sont indexés par l'étape : l'indice 0 est le départ, l'indice t la
 * situation après t mois simulés. `regimes[t-1]` est le régime du mois t.
 * À NE JAMAIS envoyer au client au-delà de l'étape révélée.
 */
export interface MarketPath {
  engineVersion: string;
  seed: string;
  scenario: ScenarioCode;
  horizonMonths: number;
  /** Numéro du tirage accepté (tirage par rejet), pour l'audit. */
  attempt: number;
  /** false si aucun tirage n'a satisfait le critère (on garde alors le dernier) — à journaliser. */
  accepted: boolean;
  regimes: RegimeCode[];
  /** Valeur de part de chaque support (base 100). */
  prices: Record<SupportCode, number[]>;
  /** Indice des prix à la consommation fictif (base 100). */
  priceIndex: number[];
  /** Inflation annualisée du mois t (indice t ; indice 0 = valeur de départ). */
  inflationRate: number[];
  /** Taux annuel avant frais servi par le support Sécurisé pendant le mois t. */
  secureRate: number[];
  metrics: PathMetrics;
}

export interface GenerateMarketPathInput {
  seed: string;
  scenario: ScenarioCode;
  horizonMonths: number;
  maxAttempts?: number;
}

export class MarketPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketPathError";
  }
}

/**
 * Génère la trajectoire de marché d'une simulation. Fonction pure : mêmes entrées (et même
 * version du moteur) ⇒ même trajectoire au bit près.
 */
export function generateMarketPath(input: GenerateMarketPathInput): MarketPath {
  const { seed, scenario, horizonMonths } = input;
  if (!Number.isInteger(horizonMonths) || horizonMonths < MIN_HORIZON_MONTHS || horizonMonths > MAX_HORIZON_MONTHS) {
    throw new MarketPathError(
      `Horizon invalide : ${horizonMonths} mois (attendu entre ${MIN_HORIZON_MONTHS} et ${MAX_HORIZON_MONTHS})`
    );
  }
  const definition = SCENARIOS[scenario];
  if (!definition) throw new MarketPathError(`Scénario inconnu : ${scenario}`);
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  let last: Omit<MarketPath, "attempt" | "accepted"> | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`market|${seed}|${scenario}|${horizonMonths}|${attempt}`);
    const regimes = buildRegimeSequence(definition.phases, horizonMonths, rng);
    const candidate = simulateMarket(regimes, rng);
    last = { engineVersion: ENGINE_VERSION, seed, scenario, horizonMonths, regimes, ...candidate };
    if (definition.accept(candidate.metrics)) return { ...last, attempt, accepted: true };
  }
  if (!last) throw new MarketPathError("maxAttempts doit être ≥ 1");
  return { ...last, attempt: maxAttempts - 1, accepted: false };
}

/** Découpe l'horizon en phases puis déroule les régimes mois par mois. */
export function buildRegimeSequence(
  phases: readonly { regimes: RegimeSource; share?: readonly [number, number]; months?: readonly [number, number] }[],
  horizonMonths: number,
  rng: Rng
): RegimeCode[] {
  // 1. Durées des phases à durée tirée ; la phase sans `share` prend le reste.
  const durations = phases.map((phase) => {
    if (!phase.share) return null;
    let months = Math.round(horizonMonths * rng.between(phase.share[0], phase.share[1]));
    if (phase.months) months = Math.min(phase.months[1], Math.max(phase.months[0], months));
    return Math.max(1, months);
  });
  const fixedTotal = durations.reduce<number>((sum, d) => sum + (d ?? 0), 0);
  const restPhases = durations.filter((d) => d === null).length;
  const budget = restPhases > 0 ? horizonMonths - restPhases : horizonMonths;
  if (fixedTotal > budget) {
    // Horizon court : on réduit proportionnellement les phases fixes.
    let assigned = 0;
    const fixedIdx = durations.map((d, i) => (d === null ? -1 : i)).filter((i) => i >= 0);
    fixedIdx.forEach((i, k) => {
      const scaled =
        k === fixedIdx.length - 1
          ? budget - assigned
          : Math.max(1, Math.floor(((durations[i] as number) * budget) / fixedTotal));
      durations[i] = scaled;
      assigned += scaled;
    });
  }
  const used = durations.reduce<number>((sum, d) => sum + (d ?? 0), 0);
  const restEach = restPhases > 0 ? Math.floor((horizonMonths - used) / restPhases) : 0;
  let restRemainder = restPhases > 0 ? horizonMonths - used - restEach * restPhases : 0;
  const finalDurations = durations.map((d) => {
    if (d !== null) return d;
    const extra = restRemainder > 0 ? 1 : 0;
    restRemainder -= extra;
    return restEach + extra;
  });

  // 2. Déroulé mois par mois.
  const regimes: RegimeCode[] = [];
  phases.forEach((phase, i) => {
    const length = finalDurations[i];
    if (length <= 0) return;
    const source = phase.regimes;
    if (typeof source === "string") {
      for (let m = 0; m < length; m++) regimes.push(source);
      return;
    }
    let current = typeof source.start === "string" ? source.start : weightedPick(source.start, rng);
    for (let m = 0; m < length; m++) {
      if (m > 0) current = nextRegime(source.chain, current, rng);
      regimes.push(current);
    }
  });
  // Filet de sécurité : longueur exacte.
  while (regimes.length < horizonMonths) regimes.push(regimes[regimes.length - 1] ?? "EXPANSION");
  return regimes.slice(0, horizonMonths);
}

function weightedPick(weights: Partial<Record<RegimeCode, number>>, rng: Rng): RegimeCode {
  const entries = REGIME_CODES.filter((code) => (weights[code] ?? 0) > 0).map(
    (code) => [code, weights[code] as number] as const
  );
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.uniform() * total;
  for (const [code, w] of entries) {
    if (roll < w) return code;
    roll -= w;
  }
  return entries[entries.length - 1][0];
}

function nextRegime(chain: TransitionMatrix, current: RegimeCode, rng: Rng): RegimeCode {
  const row = chain[current];
  // Régime absent de la chaîne : on y reste (état absorbant), jamais d'erreur à l'exécution.
  if (!row) return current;
  return weightedPick(row, rng);
}

/**
 * Cœur du modèle : rendements mensuels à facteurs corrélés.
 *   Monde       r = μM/12 + σM/√12 · zActions
 *   Entreprises r = μE/12 + β·σM/√12 · zActions + σidio/√12 · zPropre
 *   Prêter      r = μP/12 + σP/√12 · (ρ·zActions + √(1-ρ²) · zTaux)
 *   Sécurisé    r = s/12, s lissé vers la cible du régime, jamais < 0
 *   Inflation   π ← π + κ(π* − π) + bruit, indice ×(1 + π/12)
 * Les 4 aléas sont tirés à chaque mois dans un ordre fixe (flux RNG stable).
 */
function simulateMarket(regimes: readonly RegimeCode[], rng: Rng) {
  const months = regimes.length;
  const prices = { SECURISE: [BASE_PRICE], PRETER: [BASE_PRICE], MONDE: [BASE_PRICE], ENTREPRISES: [BASE_PRICE] };
  const priceIndex = [BASE_PRICE];
  const inflationRate = [INFLATION_START];
  const secureRate = [SECURE_RATE_START];
  let secure = SECURE_RATE_START;
  let inflation = INFLATION_START;

  for (let t = 1; t <= months; t++) {
    const p = REGIME_PARAMS[regimes[t - 1]];
    const zEquity = rng.normal();
    const zRates = rng.normal();
    const zOwn = rng.normal();
    const zInflation = rng.normal();

    const equityShock = p.monde.sigma * INV_SQRT12 * zEquity;
    const rho = p.preter.rhoWithEquity;
    const returns: Record<SupportCode, number> = {
      MONDE: p.monde.mu / 12 + equityShock,
      ENTREPRISES:
        p.entreprises.mu / 12 + p.entreprises.beta * equityShock + p.entreprises.idioSigma * INV_SQRT12 * zOwn,
      PRETER: p.preter.mu / 12 + p.preter.sigma * INV_SQRT12 * (rho * zEquity + Math.sqrt(1 - rho * rho) * zRates),
      SECURISE: 0,
    };
    secure = Math.max(0, secure + (p.secureTargetRate - secure) * SECURE_RATE_ADJUSTMENT);
    returns.SECURISE = secure / 12;

    for (const code of SUPPORT_CODES) {
      const r = Math.max(MONTHLY_RETURN_FLOOR, returns[code]);
      const series = prices[code];
      series.push(series[t - 1] * (1 + r));
    }

    inflation = Math.max(
      INFLATION_FLOOR,
      inflation + (p.inflationTarget - inflation) * INFLATION_REVERSION + INFLATION_NOISE * zInflation
    );
    priceIndex.push(priceIndex[t - 1] * (1 + inflation / 12));
    inflationRate.push(inflation);
    secureRate.push(secure);
  }

  return { prices, priceIndex, inflationRate, secureRate, metrics: computePathMetrics(prices, priceIndex) };
}

export function computePathMetrics(prices: Record<SupportCode, number[]>, priceIndex: number[]): PathMetrics {
  const finalRatio = zeroBySupport();
  const simpleAnnualized = zeroBySupport();
  const drawdown = zeroBySupport();
  const vol = zeroBySupport();
  for (const code of SUPPORT_CODES) {
    const series = prices[code];
    finalRatio[code] = series[series.length - 1] / series[0];
    simpleAnnualized[code] = simpleAnnualizedReturn(series);
    drawdown[code] = maxDrawdown(series);
    vol[code] = realizedVolatility(series);
  }
  return {
    months: priceIndex.length - 1,
    finalRatio,
    simpleAnnualized,
    maxDrawdown: drawdown,
    realizedVolatility: vol,
    inflationTotal: priceIndex[priceIndex.length - 1] / priceIndex[0] - 1,
    inflationSimpleAnnualized: simpleAnnualizedReturn(priceIndex),
  };
}

/**
 * Vue d'une trajectoire tronquée à l'étape révélée : c'est la SEULE forme à exposer au client
 * (pas de seed, pas de scénario, pas de mois futurs, pas de métriques de fin).
 */
export interface RevealedMarket {
  revealedSteps: number;
  prices: Record<SupportCode, number[]>;
  priceIndex: number[];
  regimes: RegimeCode[];
}

export function revealMarket(path: MarketPath, revealedSteps: number): RevealedMarket {
  const upTo = Math.max(0, Math.min(path.horizonMonths, Math.floor(revealedSteps)));
  const prices = zeroBySupportArrays();
  for (const code of SUPPORT_CODES) prices[code] = path.prices[code].slice(0, upTo + 1);
  return {
    revealedSteps: upTo,
    prices,
    priceIndex: path.priceIndex.slice(0, upTo + 1),
    regimes: path.regimes.slice(0, upTo),
  };
}

function zeroBySupportArrays(): Record<SupportCode, number[]> {
  return { SECURISE: [], PRETER: [], MONDE: [], ENTREPRISES: [] };
}
