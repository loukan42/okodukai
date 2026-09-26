import { describe, expect, it } from "vitest";
import {
  EXAMPLE_CONTRACT_FEES,
  FinanceSimError,
  NO_FEES,
  SUPPORT_CODES,
  alternativeOutcomes,
  checkAllocation,
  compareWithAndWithoutFees,
  computePathMetrics,
  createRng,
  generateMarketPath,
  summarizePeriod,
  valuePortfolio,
  type Allocation,
  type MarketPath,
  type SimOperation,
  type SupportCode,
} from "./index.js";

const ALL_SECURE: Allocation = { SECURISE: 100, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };
const ALL_MONDE: Allocation = { SECURISE: 0, PRETER: 0, MONDE: 100, ENTREPRISES: 0 };
const HALF_HALF: Allocation = { SECURISE: 50, PRETER: 0, MONDE: 50, ENTREPRISES: 0 };

/** Trajectoire synthétique : chaque support suit la fonction `price(code, t)`. */
function syntheticMarket(months: number, price: (code: SupportCode, t: number) => number = () => 100): MarketPath {
  const prices = { SECURISE: [] as number[], PRETER: [] as number[], MONDE: [] as number[], ENTREPRISES: [] as number[] };
  for (const code of SUPPORT_CODES) for (let t = 0; t <= months; t++) prices[code].push(price(code, t));
  const priceIndex = Array.from({ length: months + 1 }, (_, t) => 100 * (1 + 0.002 * t));
  return {
    engineVersion: "test",
    seed: "synthetic",
    scenario: "REALISTE",
    horizonMonths: months,
    attempt: 0,
    accepted: true,
    regimes: Array.from({ length: months }, () => "EXPANSION" as const),
    prices,
    priceIndex,
    inflationRate: priceIndex.map(() => 0.024),
    secureRate: priceIndex.map(() => 0),
    metrics: computePathMetrics(prices, priceIndex),
  };
}

const last = <T>(xs: T[]) => xs[xs.length - 1];

describe("portfolio valuation", () => {
  it("applies the entry fee on each contribution", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [{ type: "VERSEMENT", step: 0, amount: 100, allocation: ALL_SECURE }],
      fees: { ...NO_FEES, entryRate: 0.02 },
    });
    expect(points[0].valueAtReveal).toBe(0);
    expect(points[0].value).toBeCloseTo(98, 10);
    expect(points[0].fees.entry).toBeCloseTo(2, 10);
    expect(points[0].contributed).toBe(100);
    expect(points[0].gain).toBeCloseTo(-2, 10);
  });

  it("takes management fees monthly at 1/12 of the annual rate", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [{ type: "VERSEMENT", step: 0, amount: 1000, allocation: HALF_HALF }],
      fees: { ...NO_FEES, managementRateAnnual: 0.012 },
    });
    expect(points[12].value).toBeCloseTo(1000 * (1 - 0.001) ** 12, 9);
    expect(points[12].fees.management).toBeCloseTo(1000 - points[12].value, 9);
  });

  it("always ends below the fee-free twin when fees are charged", () => {
    const market = generateMarketPath({ seed: "fees", scenario: "CROISSANCE_REGULIERE", horizonMonths: 120 });
    const operations: SimOperation[] = [
      { type: "VERSEMENT", step: 0, amount: 100, allocation: HALF_HALF },
      { type: "VERSEMENTS_PROGRAMMES", step: 0, amountPerMonth: 10 },
      { type: "ARBITRAGE", step: 36, allocation: ALL_MONDE },
    ];
    const { withFees, withoutFees, gap } = compareWithAndWithoutFees({ market, operations, fees: EXAMPLE_CONTRACT_FEES });
    expect(gap).toBeGreaterThan(0);
    for (let t = 0; t <= 120; t++) expect(withFees.points[t].value).toBeLessThan(withoutFees.points[t].value);
    const fees = last(withFees.points).fees;
    expect(fees.entry).toBeGreaterThan(0);
    expect(fees.management).toBeGreaterThan(0);
    expect(fees.arbitrage).toBeGreaterThan(0);
    expect(fees.total).toBeCloseTo(fees.entry + fees.management + fees.arbitrage, 9);
    expect(last(withoutFees.points).fees.total).toBe(0);
  });

  it("charges arbitrage fees only on the amount moved, with optional free arbitrages", () => {
    const market = syntheticMarket(36);
    const operations: SimOperation[] = [
      { type: "VERSEMENT", step: 0, amount: 100, allocation: ALL_SECURE },
      { type: "ARBITRAGE", step: 1, allocation: HALF_HALF },
      { type: "ARBITRAGE", step: 2, allocation: ALL_SECURE },
    ];
    const paid = valuePortfolio({ market, operations, fees: { ...NO_FEES, arbitrageRate: 0.005 } });
    expect(paid.points[1].value).toBeCloseTo(100 - 50 * 0.005, 10);
    expect(paid.points[1].actualAllocation.MONDE).toBeCloseTo(50, 10);
    const free = valuePortfolio({
      market,
      operations,
      fees: { ...NO_FEES, arbitrageRate: 0.005, freeArbitragesPerYear: 1 },
    });
    expect(free.points[1].value).toBeCloseTo(100, 10);
    expect(free.points[2].fees.arbitrage).toBeGreaterThan(0);
    expect(free.targetAllocation).toEqual(ALL_SECURE);
  });

  it("measures performance without counting contributions (time-weighted index)", () => {
    // Le Panier Monde double au mois 1 puis reste plat.
    const market = syntheticMarket(24, (code, t) => (code === "MONDE" && t >= 1 ? 200 : 100));
    const { points } = valuePortfolio({
      market,
      operations: [
        { type: "VERSEMENT", step: 0, amount: 100, allocation: ALL_MONDE },
        { type: "VERSEMENT", step: 1, amount: 1000 },
      ],
      fees: NO_FEES,
    });
    expect(points[1].valueAtReveal).toBeCloseTo(200, 10);
    expect(points[1].value).toBeCloseTo(1200, 10);
    expect(points[1].performanceIndex).toBeCloseTo(200, 10);
    expect(points[5].performanceIndex).toBeCloseTo(200, 10);
    const summary = summarizePeriod(points, 0, 1);
    expect(summary.netFlows).toBe(1000);
    expect(summary.marketEffect).toBeCloseTo(100, 10);
    expect(summary.performance).toBeCloseTo(1, 10);
  });

  it("starts monthly contributions the month after they are set, and stops at 0", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [
        { type: "VERSEMENT", step: 0, amount: 50, allocation: ALL_SECURE },
        { type: "VERSEMENTS_PROGRAMMES", step: 0, amountPerMonth: 10 },
        { type: "VERSEMENTS_PROGRAMMES", step: 6, amountPerMonth: 0 },
      ],
      fees: NO_FEES,
    });
    expect(points[0].contributed).toBe(50);
    expect(points[1].contributed).toBe(60);
    expect(points[6].contributed).toBe(110);
    expect(points[12].contributed).toBe(110);
  });

  it("enforces the parent's cap on net contributions, including monthly ones", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [
        { type: "VERSEMENT", step: 0, amount: 50, allocation: ALL_SECURE },
        { type: "VERSEMENTS_PROGRAMMES", step: 0, amountPerMonth: 20 },
        { type: "RETRAIT", step: 3, amount: 30 },
      ],
      fees: NO_FEES,
      contributionCap: 100,
    });
    expect(points[2].contributed).toBe(90);
    expect(points[3].contributed).toBe(100);
    expect(points[3].refusedByCap).toBe(10);
    // Après un retrait de 30, il redevient possible de verser 30.
    expect(points[5].contributed).toBe(130);
    expect(points[5].contributed - points[5].withdrawn).toBe(100);
  });

  it("caps withdrawals at the portfolio value and keeps working after a full withdrawal", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [
        { type: "VERSEMENT", step: 0, amount: 100, allocation: HALF_HALF },
        { type: "RETRAIT", step: 3, amount: 500 },
        { type: "VERSEMENT", step: 4, amount: 20 },
      ],
      fees: NO_FEES,
    });
    expect(points[3].value).toBe(0);
    expect(points[3].withdrawn).toBeCloseTo(100, 10);
    expect(points[4].value).toBeCloseTo(20, 10);
    expect(Number.isFinite(points[4].performanceIndex)).toBe(true);
  });

  it("never produces NaN or negative values under random decisions", () => {
    for (let i = 0; i < 40; i++) {
      const rng = createRng(`fuzz-${i}`);
      const market = generateMarketPath({ seed: `fuzz-${i}`, scenario: "REALISTE", horizonMonths: 60 });
      const randomAllocation = (): Allocation => {
        const a = rng.intBetween(0, 100);
        const b = rng.intBetween(0, 100 - a);
        const c = rng.intBetween(0, 100 - a - b);
        return { SECURISE: a, PRETER: b, MONDE: c, ENTREPRISES: 100 - a - b - c };
      };
      const operations: SimOperation[] = [{ type: "VERSEMENT", step: 0, amount: rng.between(1, 500), allocation: randomAllocation() }];
      for (let k = 0; k < 12; k++) {
        const step = rng.intBetween(0, 60);
        const kind = rng.intBetween(0, 3);
        if (kind === 0) operations.push({ type: "VERSEMENT", step, amount: rng.between(1, 100) });
        if (kind === 1) operations.push({ type: "VERSEMENTS_PROGRAMMES", step, amountPerMonth: rng.intBetween(0, 20) });
        if (kind === 2) operations.push({ type: "ARBITRAGE", step, allocation: randomAllocation() });
        if (kind === 3) operations.push({ type: "RETRAIT", step, amount: rng.between(1, 300) });
      }
      const { points, holdings } = valuePortfolio({ market, operations, fees: EXAMPLE_CONTRACT_FEES });
      for (const p of points) {
        for (const v of [p.value, p.valueAtReveal, p.realValue, p.performanceIndex, p.fees.total, p.contributed]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
      for (const code of SUPPORT_CODES) expect(holdings[code]).toBeGreaterThanOrEqual(0);
    }
  });

  it("expresses value in starting purchasing power", () => {
    const { points } = valuePortfolio({
      market: syntheticMarket(24),
      operations: [{ type: "VERSEMENT", step: 0, amount: 100, allocation: ALL_SECURE }],
      fees: NO_FEES,
    });
    // Prix +2,4 % sur 12 mois, valeur inchangée : 100 unités n'achètent plus que ≈ 97,66.
    expect(points[12].value).toBeCloseTo(100, 10);
    expect(points[12].realValue).toBeCloseTo(100 / 1.024, 10);
    expect(summarizePeriod(points, 0, 12).purchasingPowerChange).toBeCloseTo(1 / 1.024 - 1, 10);
  });

  it("computes 'what if' outcomes with the same contributions on a single support", () => {
    const market = generateMarketPath({ seed: "whatif", scenario: "FORTE_BAISSE", horizonMonths: 60 });
    const operations: SimOperation[] = [
      { type: "VERSEMENT", step: 0, amount: 100, allocation: HALF_HALF },
      { type: "ARBITRAGE", step: 12, allocation: ALL_MONDE },
    ];
    const outcomes = alternativeOutcomes({ market, operations, fees: NO_FEES });
    expect(outcomes.SECURISE).toBeCloseTo(100 * (market.prices.SECURISE[60] / 100), 9);
    expect(outcomes.MONDE).toBeCloseTo(100 * (market.prices.MONDE[60] / 100), 9);
  });

  it("rejects invalid decisions with explicit error codes", () => {
    const market = syntheticMarket(24);
    const run = (operations: SimOperation[], untilStep?: number) => () =>
      valuePortfolio({ market, operations, fees: NO_FEES, untilStep });
    const codeOf = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof FinanceSimError ? e.code : "OTHER";
      }
      return null;
    };
    expect(checkAllocation({ SECURISE: 50, PRETER: 40 })).toBe("ALLOCATION_SUM");
    expect(checkAllocation({ SECURISE: 50.5, MONDE: 49.5 })).toBe("ALLOCATION_INVALID");
    expect(checkAllocation({ CRYPTO: 100 })).toBe("ALLOCATION_INVALID");
    expect(checkAllocation(HALF_HALF)).toBeNull();
    expect(codeOf(run([{ type: "VERSEMENT", step: 0, amount: 10 }]))).toBe("NO_TARGET_ALLOCATION");
    expect(codeOf(run([{ type: "VERSEMENT", step: 0, amount: -5, allocation: ALL_SECURE }]))).toBe("AMOUNT_INVALID");
    expect(codeOf(run([{ type: "VERSEMENT", step: 10, amount: 5, allocation: ALL_SECURE }], 6))).toBe("STEP_INVALID");
    expect(codeOf(run([{ type: "ARBITRAGE", step: 0, allocation: { ...HALF_HALF, MONDE: 10 } }]))).toBe("ALLOCATION_SUM");
  });
});
