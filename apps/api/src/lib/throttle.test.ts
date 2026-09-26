import { describe, expect, it } from "vitest";
import { CHILD_PIN, registerAttempt } from "./throttle.js";

const MINUTE = 60_000;
const at = (ms: number) => new Date(Date.UTC(2026, 8, 26) + ms);
const fresh = () => ({ attempts: 0, windowStartedAt: at(0), lockedUntil: null as Date | null, lockouts: 0 });

/** Enchaîne `n` essais au même instant et renvoie l'état et le dernier résultat. */
function attempts(n: number, state = fresh(), now = at(0)) {
  let outcome;
  for (let i = 0; i < n; i++) ({ state, outcome } = registerAttempt(state, CHILD_PIN, now));
  return { state, outcome: outcome! };
}

describe("limitation des tentatives de connexion", () => {
  it("laisse passer le quota, bloque sur le dernier essai puis refuse sans compter", () => {
    expect(attempts(4).outcome).toEqual({ allowed: true, lockedMs: null });
    const { state, outcome } = attempts(5);
    expect(outcome).toEqual({ allowed: true, lockedMs: 5 * MINUTE });
    const refused = registerAttempt(state, CHILD_PIN, at(2 * MINUTE));
    expect(refused.outcome).toEqual({ allowed: false, retryAfterMs: 3 * MINUTE });
    expect(refused.state).toBe(state);
  });

  it("double la durée à chaque blocage, jusqu'au plafond", () => {
    let state = fresh();
    const durations: number[] = [];
    let now = 0;
    for (let lock = 0; lock < 6; lock++) {
      const round = attempts(5, state, at(now));
      durations.push(round.outcome.allowed ? round.outcome.lockedMs! : -1);
      state = round.state;
      now = state.lockedUntil!.getTime() - at(0).getTime();
    }
    expect(durations.map((d) => d / MINUTE)).toEqual([5, 10, 20, 40, 60, 60]);
  });

  it("repart de zéro quand la fenêtre expire, et oublie les blocages après un jour", () => {
    const partial = attempts(4).state;
    expect(registerAttempt(partial, CHILD_PIN, at(16 * MINUTE)).state.attempts).toBe(1);

    const locked = attempts(5).state;
    expect(locked.lockouts).toBe(1);
    const nextDay = attempts(5, locked, at(5 * MINUTE + 24 * 60 * MINUTE));
    expect(nextDay.outcome).toEqual({ allowed: true, lockedMs: 5 * MINUTE });
  });
});
