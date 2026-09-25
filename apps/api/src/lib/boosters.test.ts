import { describe, expect, it } from "vitest";
import type { Card } from "@prisma/client";
import { openBooster } from "./boosters.js";

const card = (id: string, rarity: Card["rarity"]) => ({ id, rarity } as Card);

describe("server booster draw", () => {
  it("replays the same result for an audit seed without repeating a card in one pack", () => {
    const params = {
      config: { slots: Array.from({ length: 3 }, () => ({ weights: { COMMUNE: 100 } })) },
      seed: "audit-seed",
      availableCards: [card("a", "COMMUNE"), card("b", "COMMUNE"), card("c", "COMMUNE")],
      ownedCardIds: new Set<string>(), completionRatio: 0, boostersSinceGuarantee: 0,
    };
    const first = openBooster(params);
    expect(openBooster(params)).toEqual(first);
    expect(new Set(first.cardIds).size).toBe(3);
  });

  it("delivers the configured minimum rarity when the guarantee is due", () => {
    const result = openBooster({
      config: { slots: [{ weights: { COMMUNE: 100 } }], guarantee: { minRarity: "EPIQUE", everyNBoosters: 2 } },
      seed: "guarantee-seed",
      availableCards: [card("common", "COMMUNE"), card("epic", "EPIQUE")],
      ownedCardIds: new Set<string>(), completionRatio: 0, boostersSinceGuarantee: 1,
    });
    expect(result).toEqual({ cardIds: ["epic"], guaranteeTriggered: true });
  });

  it("prefers a new card while album completion is below 70 percent", () => {
    const result = openBooster({
      config: { slots: [{ weights: { COMMUNE: 100 } }] },
      seed: "new-card-seed",
      availableCards: [card("owned", "COMMUNE"), card("new", "COMMUNE")],
      ownedCardIds: new Set(["owned"]), completionRatio: 0.5, boostersSinceGuarantee: 0,
    });
    expect(result.cardIds).toEqual(["new"]);
  });
});
