import { fingerprint } from "./rng.js";
import {
  INFLATION_FLOOR,
  INFLATION_NOISE,
  INFLATION_REVERSION,
  INFLATION_START,
  MONTHLY_RETURN_FLOOR,
  REALISTIC_TRANSITIONS,
  REGIME_PARAMS,
  SECURE_RATE_ADJUSTMENT,
  SECURE_RATE_START,
} from "./regimes.js";
import { OPENING_SCENARIOS, PEDAGOGICAL_SCENARIOS, SCENARIOS, SCENARIO_CODES } from "./scenarios.js";
import { REFERENCE_CORRELATION, REFERENCE_VOLATILITY, RISK_LEVEL_THRESHOLDS, SUPPORTS } from "./supports.js";
import { RHYTHMS } from "./clock.js";
import { ENGINE_VERSION } from "./version.js";

/** JSON à clés triées : même objet ⇒ même texte, quel que soit l'ordre d'insertion. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .filter((k) => typeof (value as Record<string, unknown>)[k] !== "function")
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Tous les paramètres qui influencent un résultat. Leur empreinte est épinglée dans les tests :
 * modifier un paramètre sans changer ENGINE_VERSION fait échouer la suite.
 * (Les critères d'acceptation des scénarios sont du code : les modifier impose aussi un
 * changement de version, cf. doc §Versionnage.)
 */
export const MODEL_PARAMETERS = {
  engineVersion: ENGINE_VERSION,
  supports: SUPPORTS,
  regimes: REGIME_PARAMS,
  constants: {
    SECURE_RATE_ADJUSTMENT,
    SECURE_RATE_START,
    INFLATION_REVERSION,
    INFLATION_NOISE,
    INFLATION_START,
    INFLATION_FLOOR,
    MONTHLY_RETURN_FLOOR,
  },
  realisticTransitions: REALISTIC_TRANSITIONS,
  scenarios: SCENARIO_CODES.map((code) => ({ code, tone: SCENARIOS[code].tone, phases: SCENARIOS[code].phases })),
  pedagogicalScenarios: PEDAGOGICAL_SCENARIOS,
  openingScenarios: OPENING_SCENARIOS,
  risk: { REFERENCE_VOLATILITY, REFERENCE_CORRELATION, RISK_LEVEL_THRESHOLDS },
  rhythms: RHYTHMS,
};

export const PARAMETERS_FINGERPRINT = fingerprint(stableStringify(MODEL_PARAMETERS));
