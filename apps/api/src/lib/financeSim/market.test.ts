import { readdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  PARAMETERS_FINGERPRINT,
  SCENARIO_CODES,
  SUPPORT_CODES,
  createRng,
  generateMarketPath,
  revealMarket,
  standardDeviation,
} from "./index.js";

describe("seeded RNG", () => {
  it("replays the same sequence for the same seed and differs otherwise", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-a");
    const c = createRng("seed-b");
    const seqA = Array.from({ length: 20 }, () => a.uniform());
    expect(Array.from({ length: 20 }, () => b.uniform())).toEqual(seqA);
    expect(Array.from({ length: 20 }, () => c.uniform())).not.toEqual(seqA);
    expect(seqA.every((u) => u >= 0 && u < 1)).toBe(true);
  });

  it("produces standard normal draws (mean ≈ 0, sd ≈ 1, bounded)", () => {
    const rng = createRng("normal-check");
    const draws = Array.from({ length: 20_000 }, () => rng.normal());
    const mean = draws.reduce((s, x) => s + x, 0) / draws.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(standardDeviation(draws)).toBeGreaterThan(0.97);
    expect(standardDeviation(draws)).toBeLessThan(1.03);
    expect(draws.every((z) => Math.abs(z) <= 6)).toBe(true);
  });
});

describe("market path generation", () => {
  it("is deterministic for a seed, scenario and horizon", () => {
    const input = { seed: "audit-seed", scenario: "CRISE_PUIS_REPRISE" as const, horizonMonths: 60 };
    const first = generateMarketPath(input);
    expect(generateMarketPath(input)).toEqual(first);
    expect(first.engineVersion).toBe(ENGINE_VERSION);
    expect(generateMarketPath({ ...input, seed: "other-seed" }).prices.MONDE).not.toEqual(first.prices.MONDE);
  });

  it("is bit-for-bit reproducible (pinned values for finsim-1.0.0)", () => {
    // Si ce test casse sans changement volontaire du modèle, la reproductibilité est rompue.
    const path = generateMarketPath({ seed: "pinned", scenario: "REALISTE", horizonMonths: 24 });
    expect(path.prices.MONDE[24]).toBe(PINNED.monde24);
    expect(path.prices.SECURISE[24]).toBe(PINNED.securise24);
    expect(path.priceIndex[24]).toBe(PINNED.priceIndex24);
  });

  it("pins the parameter fingerprint to the engine version", () => {
    // Paramètre modifié ? Incrémenter ENGINE_VERSION puis mettre à jour cette empreinte.
    expect({ version: ENGINE_VERSION, fingerprint: PARAMETERS_FINGERPRINT }).toEqual({
      version: "finsim-1.0.0",
      fingerprint: PINNED.fingerprint,
    });
  });

  it("never yields NaN, zero or negative prices, for every scenario and horizon", () => {
    for (const scenario of SCENARIO_CODES) {
      for (const horizonMonths of [24, 60, 120]) {
        for (let i = 0; i < 15; i++) {
          const path = generateMarketPath({ seed: `validity-${i}`, scenario, horizonMonths });
          expect(path.regimes).toHaveLength(horizonMonths);
          for (const code of SUPPORT_CODES) {
            expect(path.prices[code]).toHaveLength(horizonMonths + 1);
            expect(path.prices[code].every((p) => Number.isFinite(p) && p > 0)).toBe(true);
          }
          expect(path.priceIndex.every((p) => Number.isFinite(p) && p > 0)).toBe(true);
        }
      }
    }
  });

  it("finds a path matching every scenario's shape quickly", () => {
    for (const scenario of SCENARIO_CODES) {
      for (const horizonMonths of [24, 60, 120]) {
        for (let i = 0; i < 25; i++) {
          const path = generateMarketPath({ seed: `accept-${i}`, scenario, horizonMonths });
          expect(path.accepted, `${scenario} ${horizonMonths} seed ${i}`).toBe(true);
          expect(path.attempt).toBeLessThan(150);
        }
      }
    }
  });

  it("keeps the Sécurisé support smooth: it never goes down before fees", () => {
    for (const scenario of SCENARIO_CODES) {
      const { prices } = generateMarketPath({ seed: "smooth", scenario, horizonMonths: 120 });
      for (let t = 1; t < prices.SECURISE.length; t++) {
        expect(prices.SECURISE[t]).toBeGreaterThanOrEqual(prices.SECURISE[t - 1]);
      }
    }
  });

  it("compresses time, never returns: monthly moves stay at annual-scale magnitudes", () => {
    // Croissance régulière : ≈ 8-10 %/an pour le Panier Monde, soit < 1 % par mois simulé en
    // moyenne. Si le moteur appliquait 7 % par jour réel, on serait très au-dessus.
    const monthly: number[] = [];
    for (let i = 0; i < 40; i++) {
      const { prices } = generateMarketPath({ seed: `scale-${i}`, scenario: "CROISSANCE_REGULIERE", horizonMonths: 60 });
      for (let t = 1; t <= 60; t++) monthly.push(prices.MONDE[t] / prices.MONDE[t - 1] - 1);
    }
    const annualizedMean = (monthly.reduce((s, r) => s + r, 0) / monthly.length) * 12;
    expect(annualizedMean).toBeGreaterThan(0.04);
    expect(annualizedMean).toBeLessThan(0.14);
    expect(Math.max(...monthly.map(Math.abs))).toBeLessThan(0.25);
  });

  it("rejects invalid horizons", () => {
    expect(() => generateMarketPath({ seed: "x", scenario: "REALISTE", horizonMonths: 12 })).toThrow();
    expect(() => generateMarketPath({ seed: "x", scenario: "REALISTE", horizonMonths: 121 })).toThrow();
    expect(() => generateMarketPath({ seed: "x", scenario: "REALISTE", horizonMonths: 60.5 })).toThrow();
  });

  it("reveals only the past: nothing beyond the revealed step leaks", () => {
    const path = generateMarketPath({ seed: "reveal", scenario: "FORTE_BAISSE", horizonMonths: 60 });
    const view = revealMarket(path, 18);
    expect(view.revealedSteps).toBe(18);
    expect(view.prices.MONDE).toEqual(path.prices.MONDE.slice(0, 19));
    expect(view.regimes).toHaveLength(18);
    expect(Object.keys(view)).not.toContain("seed");
    expect(Object.keys(view)).not.toContain("scenario");
    expect(revealMarket(path, 999).revealedSteps).toBe(60);
  });
});

describe("module purity", () => {
  it("imports nothing outside the financeSim folder (no DB, no wallet, no Express)", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      const source = readFileSync(`${dir}/${file}`, "utf8");
      const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      for (const spec of specifiers) expect(spec, `${file} imports ${spec}`).toMatch(/^\.\/[a-zA-Z]+\.js$/);
    }
  });
});

/** Valeurs de référence de finsim-1.0.0 (seed "pinned", REALISTE, 24 mois). */
const PINNED = {
  monde24: 92.95092076083876,
  securise24: 103.90053848199237,
  priceIndex24: 103.32769799069875,
  fingerprint: "5942d7ffd36ee79e0c6574e5e15a2344",
};
