/**
 * Moteur de simulation d'investissement d'Okodukai (unités école uniquement).
 *
 * Module PUR : aucun accès base, réseau ou Express, aucune dépendance. Il ne connaît pas les
 * pièces familiales et ne doit jamais être branché sur le ledger WalletTransaction.
 * Spécification : docs/FINANCIAL_SIMULATION_ENGINE.md et docs/INSURANCE_LIFE_SIMULATION.md.
 */

export { ENGINE_VERSION } from "./version.js";
export { PARAMETERS_FINGERPRINT, MODEL_PARAMETERS, stableStringify } from "./audit.js";
export { createRng, hashString, fingerprint, type Rng } from "./rng.js";
export {
  SUPPORT_CODES,
  SUPPORTS,
  REFERENCE_VOLATILITY,
  REFERENCE_CORRELATION,
  RISK_LEVEL_THRESHOLDS,
  portfolioRiskLevel,
  referenceVolatility,
  zeroBySupport,
  type Allocation,
  type RiskLevel,
  type SupportCode,
  type SupportDefinition,
} from "./supports.js";
export {
  REGIME_CODES,
  REGIME_PARAMS,
  REALISTIC_TRANSITIONS,
  type RegimeCode,
  type RegimeParams,
  type TransitionMatrix,
} from "./regimes.js";
export {
  SCENARIO_CODES,
  SCENARIOS,
  PEDAGOGICAL_SCENARIOS,
  OPENING_SCENARIOS,
  pickScenario,
  assertBalancedPool,
  ScenarioPoolError,
  type PathMetrics,
  type PickScenarioInput,
  type ScenarioCode,
  type ScenarioDefinition,
  type ScenarioTone,
} from "./scenarios.js";
export {
  BASE_PRICE,
  DEFAULT_MAX_ATTEMPTS,
  MAX_HORIZON_MONTHS,
  MIN_HORIZON_MONTHS,
  MarketPathError,
  computePathMetrics,
  generateMarketPath,
  revealMarket,
  type GenerateMarketPathInput,
  type MarketPath,
  type RevealedMarket,
} from "./market.js";
export {
  EXAMPLE_CONTRACT_FEES,
  NO_FEES,
  FinanceSimError,
  alternativeOutcomes,
  checkAllocation,
  compareWithAndWithoutFees,
  summarizePeriod,
  valuePortfolio,
  type FeeSchedule,
  type FeesBreakdown,
  type FinanceSimErrorCode,
  type PeriodSummary,
  type PortfolioValuation,
  type SimOperation,
  type ValuationPoint,
  type ValuePortfolioInput,
} from "./portfolio.js";
export {
  RHYTHMS,
  ClockError,
  clockState,
  compressionFactor,
  listRendezVous,
  projectedEndDate,
  realDaysForHorizon,
  rendezVousNeeded,
  simulatedElapsed,
  stepAtRendezVous,
  zonedTimeToUtc,
  type ClockState,
  type ClockStateInput,
  type Pause,
  type RhythmCode,
  type RhythmDefinition,
  type ScheduleOptions,
} from "./clock.js";
export {
  compoundInterestTable,
  feeDragTable,
  formatUnitsFr,
  inflationTable,
  priceAfterInflation,
  purchasingPower,
  roundTo,
  roundUnits,
  simpleInterestTable,
  toPercent,
} from "./pedagogy.js";
export { maxDrawdown, quantile, realizedVolatility, simpleAnnualizedReturn, standardDeviation, totalReturn } from "./metrics.js";
