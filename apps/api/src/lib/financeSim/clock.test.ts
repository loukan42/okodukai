import { describe, expect, it } from "vitest";
import {
  ClockError,
  RHYTHMS,
  clockState,
  compressionFactor,
  generateMarketPath,
  listRendezVous,
  projectedEndDate,
  realDaysForHorizon,
  rendezVousNeeded,
  revealMarket,
  simulatedElapsed,
  stepAtRendezVous,
  zonedTimeToUtc,
} from "./index.js";

const PARIS = { timeZone: "Europe/Paris" };

describe("compressed financial time", () => {
  it("documents the compression factor of each rhythm", () => {
    expect(compressionFactor(RHYTHMS.RAPIDE)).toBeCloseTo(365.25, 6); // 1 an simulé / jour
    expect(compressionFactor(RHYTHMS.STANDARD)).toBeCloseTo(182.625, 6); // 1 an / 2 jours
    expect(compressionFactor(RHYTHMS.LONG)).toBeCloseTo(52.18, 2); // 1 an / semaine
    expect(realDaysForHorizon(RHYTHMS.RAPIDE, 60)).toBeCloseTo(5, 6);
    expect(realDaysForHorizon(RHYTHMS.STANDARD, 60)).toBeCloseTo(10, 6);
    expect(realDaysForHorizon(RHYTHMS.LONG, 60)).toBeCloseTo(35, 6);
    expect(rendezVousNeeded(RHYTHMS.RAPIDE, 60)).toBe(20);
    expect(stepAtRendezVous(RHYTHMS.STANDARD, 3, 60)).toBe(18);
    expect(simulatedElapsed(27)).toEqual({ years: 2, months: 3 });
  });

  it("reveals the same market whatever the rhythm: only the pace changes", () => {
    const path = generateMarketPath({ seed: "rhythm", scenario: "MARCHE_VOLATIL", horizonMonths: 60 });
    const rapide = revealMarket(path, stepAtRendezVous(RHYTHMS.RAPIDE, 4, 60));
    const long = revealMarket(path, stepAtRendezVous(RHYTHMS.LONG, 2, 60));
    expect(rapide).toEqual(long);
  });

  it("places rendez-vous at local wall-clock times across a DST change", () => {
    // Passage à l'heure d'été à Paris le 29 mars 2026 : 17 h = 16 h UTC avant, 15 h UTC après.
    const slots = listRendezVous(RHYTHMS.STANDARD, new Date("2026-03-27T12:00:00Z"), 3, PARIS);
    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-03-27T16:00:00.000Z",
      "2026-03-28T16:00:00.000Z",
      "2026-03-29T15:00:00.000Z",
    ]);
    expect(zonedTimeToUtc(2026, 10, 25, 17 * 60, "Europe/Paris").toISOString()).toBe("2026-10-25T16:00:00.000Z");
  });

  it("keeps the LONG rhythm on Wednesdays and Saturdays", () => {
    const slots = listRendezVous(RHYTHMS.LONG, new Date("2026-09-21T08:00:00Z"), 4, PARIS); // lundi
    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-09-23T15:00:00.000Z",
      "2026-09-26T15:00:00.000Z",
      "2026-09-30T15:00:00.000Z",
      "2026-10-03T15:00:00.000Z",
    ]);
  });

  it("waits at least the lead time before the first rendez-vous", () => {
    // Démarrage à 11 h 30 (Paris) en RAPIDE : le rendez-vous de 12 h est trop proche.
    const [first] = listRendezVous(RHYTHMS.RAPIDE, new Date("2026-01-05T10:30:00Z"), 1, PARIS);
    expect(first.toISOString()).toBe("2026-01-05T15:00:00.000Z");
  });

  it("skips rendez-vous during a parent pause", () => {
    const slots = listRendezVous(RHYTHMS.STANDARD, new Date("2026-03-27T12:00:00Z"), 2, {
      ...PARIS,
      pauses: [{ from: new Date("2026-03-28T00:00:00Z"), to: new Date("2026-03-29T00:00:00Z") }],
    });
    expect(slots.map((d) => d.toISOString())).toEqual(["2026-03-27T16:00:00.000Z", "2026-03-29T15:00:00.000Z"]);
  });

  it("computes the revealed steps from real time, capped at the horizon", () => {
    const base = { rhythm: RHYTHMS.RAPIDE, startAt: new Date("2026-01-05T06:00:00Z"), horizonMonths: 60, ...PARIS };
    const midway = clockState({ ...base, now: new Date("2026-01-07T10:00:00Z") });
    expect(midway).toMatchObject({ rendezVousCount: 9, revealedSteps: 27, finished: false });
    expect(midway.nextRendezVousAt?.toISOString()).toBe("2026-01-07T11:00:00.000Z");

    const before = clockState({ ...base, now: new Date("2026-01-05T06:30:00Z") });
    expect(before).toMatchObject({ rendezVousCount: 0, revealedSteps: 0, lastRendezVousAt: null });

    const done = clockState({ ...base, now: new Date("2026-02-01T00:00:00Z") });
    expect(done).toMatchObject({ rendezVousCount: 20, revealedSteps: 60, finished: true, nextRendezVousAt: null });
    expect(projectedEndDate(RHYTHMS.RAPIDE, base.startAt, 60, PARIS).toISOString()).toBe("2026-01-09T19:00:00.000Z");
  });

  it("rejects an unknown time zone", () => {
    expect(() => listRendezVous(RHYTHMS.STANDARD, new Date(), 1, { timeZone: "Mars/Olympus" })).toThrow(ClockError);
  });
});
