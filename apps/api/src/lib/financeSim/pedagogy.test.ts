import { describe, expect, it } from "vitest";
import {
  compoundInterestTable,
  feeDragTable,
  formatUnitsFr,
  inflationTable,
  portfolioRiskLevel,
  priceAfterInflation,
  purchasingPower,
  roundTo,
  roundUnits,
  simpleInterestTable,
  SUPPORTS,
  SUPPORT_CODES,
  toPercent,
  zeroBySupport,
} from "./index.js";

describe("pedagogical calculations", () => {
  it("shows compound interest 100 → 104 → 108,16 → 112,49", () => {
    expect(compoundInterestTable(100, 0.04, 3).map(roundUnits)).toEqual([100, 104, 108.16, 112.49]);
    expect(simpleInterestTable(100, 0.04, 3).map(roundUnits)).toEqual([100, 104, 108, 112]);
  });

  it("shows how yearly fees eat into growth", () => {
    const { withoutFees, withFees } = feeDragTable(100, 0.04, 0.01, 10);
    expect(roundUnits(withoutFees[10])).toBe(148.02);
    expect(roundUnits(withFees[10])).toBe(133.87);
  });

  it("shows inflation: the coins stay, prices move", () => {
    expect(inflationTable(0.02, 2).map(roundUnits)).toEqual([100, 102, 104.04]);
    expect(roundUnits(priceAfterInflation(10, 100, 110))).toBe(11);
    expect(roundUnits(purchasingPower(100, 100, 104))).toBe(96.15);
  });

  it("rounds for display without binary artefacts", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(roundUnits(108.4)).toBe(108.4);
    expect(toPercent(0.0412)).toBe(4.1);
    expect(formatUnitsFr(108.4)).toBe("108,40");
    expect(formatUnitsFr(1234.5)).toBe("1 234,50");
    expect(formatUnitsFr(107.6, 0)).toBe("108");
  });
});

describe("pedagogical risk scale", () => {
  it("gives each support its documented level", () => {
    for (const code of SUPPORT_CODES) {
      const allocation = zeroBySupport();
      allocation[code] = 100;
      expect(portfolioRiskLevel(allocation), code).toBe(SUPPORTS[code].riskLevel);
    }
  });

  it("lets a mix land on a level no single support has (diversification)", () => {
    expect(portfolioRiskLevel({ SECURISE: 0, PRETER: 50, MONDE: 50, ENTREPRISES: 0 })).toBe(3);
    expect(portfolioRiskLevel({ SECURISE: 70, PRETER: 30, MONDE: 0, ENTREPRISES: 0 })).toBe(2);
  });
});
