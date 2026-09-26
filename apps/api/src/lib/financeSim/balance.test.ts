import { describe, expect, it } from "vitest";
import {
  NO_FEES,
  OPENING_SCENARIOS,
  PEDAGOGICAL_SCENARIOS,
  ScenarioPoolError,
  generateMarketPath,
  pickScenario,
  standardDeviation,
  valuePortfolio,
  type Allocation,
  type MarketPath,
  type ScenarioCode,
} from "./index.js";

/**
 * Tests statistiques (seeds fixes, donc déterministes) : l'honnêteté pédagogique du moteur.
 */

function finalValue(market: MarketPath, allocation: Allocation): number {
  const { points } = valuePortfolio({
    market,
    operations: [{ type: "VERSEMENT", step: 0, amount: 100, allocation }],
    fees: NO_FEES,
  });
  return points[points.length - 1].value;
}

const only = (code: keyof Allocation): Allocation => ({ SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0, [code]: 100 });

describe("no 'risky always wins' bias", () => {
  const perScenario = new Map<ScenarioCode, { mondeBehind: number; entreprisesBehind: number }>();
  const N = 60;
  for (const scenario of PEDAGOGICAL_SCENARIOS) {
    let mondeBehind = 0;
    let entreprisesBehind = 0;
    for (let i = 0; i < N; i++) {
      const m = generateMarketPath({ seed: `balance-${i}`, scenario, horizonMonths: 60 }).metrics.finalRatio;
      if (m.MONDE < m.SECURISE) mondeBehind++;
      if (m.ENTREPRISES < m.SECURISE) entreprisesBehind++;
    }
    perScenario.set(scenario, { mondeBehind: mondeBehind / N, entreprisesBehind: entreprisesBehind / N });
  }

  it("makes risky supports finish behind Sécurisé about half the time across the scenario set", () => {
    const rates = [...perScenario.values()];
    const avg = (key: "mondeBehind" | "entreprisesBehind") => rates.reduce((s, r) => s + r[key], 0) / rates.length;
    expect(avg("mondeBehind")).toBeGreaterThan(0.35);
    expect(avg("mondeBehind")).toBeLessThan(0.65);
    expect(avg("entreprisesBehind")).toBeGreaterThan(0.35);
    expect(avg("entreprisesBehind")).toBeLessThan(0.65);
  });

  it("contains experiences where risk clearly pays and others where it clearly does not", () => {
    expect(perScenario.get("FORTE_BAISSE")!.mondeBehind).toBeGreaterThan(0.9);
    expect(perScenario.get("STAGNATION")!.mondeBehind).toBeGreaterThan(0.85);
    expect(perScenario.get("CROISSANCE_REGULIERE")!.mondeBehind).toBeLessThan(0.1);
    expect(perScenario.get("MARCHE_FAVORABLE")!.mondeBehind).toBeLessThan(0.1);
  });

  it("keeps the realistic mode realistic: risk usually pays over time, but not always", () => {
    let behind = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const m = generateMarketPath({ seed: `realiste-${i}`, scenario: "REALISTE", horizonMonths: 60 }).metrics.finalRatio;
      if (m.MONDE < m.SECURISE) behind++;
    }
    expect(behind / n).toBeGreaterThan(0.15);
    expect(behind / n).toBeLessThan(0.45);
  });
});

describe("diversification really reduces dispersion", () => {
  const outcomes = { entreprises: [] as number[], monde: [] as number[], preter: [] as number[], mix: [] as number[], all4: [] as number[] };
  for (let i = 0; i < 300; i++) {
    const market = generateMarketPath({ seed: `div-${i}`, scenario: "REALISTE", horizonMonths: 60 });
    outcomes.entreprises.push(finalValue(market, only("ENTREPRISES")));
    outcomes.monde.push(finalValue(market, only("MONDE")));
    outcomes.preter.push(finalValue(market, only("PRETER")));
    outcomes.mix.push(finalValue(market, { SECURISE: 0, PRETER: 50, MONDE: 50, ENTREPRISES: 0 }));
    outcomes.all4.push(finalValue(market, { SECURISE: 25, PRETER: 25, MONDE: 25, ENTREPRISES: 25 }));
  }
  const sd = Object.fromEntries(Object.entries(outcomes).map(([k, v]) => [k, standardDeviation(v)])) as Record<
    keyof typeof outcomes,
    number
  >;

  it("spreads outcomes less with many companies (Monde) than with a few (Entreprises)", () => {
    expect(sd.monde).toBeLessThan(sd.entreprises * 0.8);
  });

  it("spreads a 50/50 mix less than the average of its parts", () => {
    expect(sd.mix).toBeLessThan(0.5 * sd.monde + 0.5 * sd.preter);
  });

  it("spreads an even 4-way mix less than any single risky support", () => {
    expect(sd.all4).toBeLessThan(sd.monde);
    expect(sd.all4).toBeLessThan(sd.entreprises);
  });
});

describe("balanced scenario assignment", () => {
  it("opens with a balanced experience, then deals every scenario once per cycle, never twice in a row", () => {
    for (let child = 0; child < 20; child++) {
      const history: ScenarioCode[] = [];
      for (let k = 0; k < 21; k++) history.push(pickScenario({ seed: `child-${child}:${k}`, history }));
      expect(OPENING_SCENARIOS).toContain(history[0]);
      for (let cycle = 0; cycle < 3; cycle++) {
        expect(new Set(history.slice(cycle * 7, cycle * 7 + 7)).size).toBe(7);
      }
      for (let k = 1; k < history.length; k++) expect(history[k]).not.toBe(history[k - 1]);
    }
  });

  it("refuses a pool that would only ever show one side of risk", () => {
    expect(() => pickScenario({ seed: "x", history: [], pool: ["CROISSANCE_REGULIERE", "MARCHE_FAVORABLE"] })).toThrow(
      ScenarioPoolError
    );
    expect(() => pickScenario({ seed: "x", history: [], pool: ["FORTE_BAISSE", "STAGNATION"] })).toThrow(ScenarioPoolError);
    expect(pickScenario({ seed: "x", history: [], pool: ["FORTE_BAISSE", "MARCHE_FAVORABLE"] })).toBeDefined();
  });
});
