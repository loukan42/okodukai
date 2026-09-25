import { randomUUID, randomBytes } from "node:crypto";
import type { Card, CardRarity } from "@prisma/client";

/**
 * Configuration d'un slot de booster : distribution de probabilité par rareté (%),
 * doit sommer à 100. Voir spec §42.
 */
export interface SlotConfig {
  weights: Partial<Record<CardRarity, number>>;
}

export interface BoosterSlotConfig {
  slots: SlotConfig[];
  /** Garantie minimale : au moins une carte de rareté >= à ce seuil tous les N boosters. */
  guarantee?: {
    minRarity: CardRarity;
    everyNBoosters: number;
  };
}

const RARITY_ORDER: CardRarity[] = ["COMMUNE", "PEU_COMMUNE", "RARE", "EPIQUE", "LEGENDAIRE"];

export const DEFAULT_SLOT_CONFIG: BoosterSlotConfig = {
  slots: [
    { weights: { COMMUNE: 70, PEU_COMMUNE: 30 } },
    { weights: { COMMUNE: 70, PEU_COMMUNE: 30 } },
    { weights: { COMMUNE: 60, PEU_COMMUNE: 40 } },
    { weights: { PEU_COMMUNE: 60, RARE: 40 } },
    { weights: { RARE: 75, EPIQUE: 20, LEGENDAIRE: 5 } },
  ],
  guarantee: { minRarity: "EPIQUE", everyNBoosters: 10 },
};

/** RNG déterministe (mulberry32) à partir d'une seed — permet l'audit/replay. */
function seededRng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function generateBoosterSeed(): string {
  return randomBytes(16).toString("hex");
}

function pickRarity(rng: () => number, weights: Partial<Record<CardRarity, number>>): CardRarity {
  const entries = Object.entries(weights) as [CardRarity, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [rarity, weight] of entries) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

export interface OpenBoosterParams {
  config: BoosterSlotConfig;
  seed: string;
  /** Cartes disponibles dans l'univers, groupées par rareté. */
  availableCards: Card[];
  /** IDs de cartes déjà possédées par l'enfant (pour l'anti-frustration). */
  ownedCardIds: Set<string>;
  /** Complétion actuelle de l'album (0-1), pour moduler l'anti-doublon. */
  completionRatio: number;
  /** Nombre de boosters ouverts depuis la dernière garantie satisfaite. */
  boostersSinceGuarantee: number;
}

export interface OpenBoosterResult {
  cardIds: string[];
  guaranteeTriggered: boolean;
}

/**
 * Tire les cartes d'un booster de façon déterministe à partir de la seed.
 * Anti-frustration (spec §43) : tant que l'album est complété à moins de 70%,
 * on favorise fortement les cartes non possédées à rareté équivalente.
 */
export function openBooster(params: OpenBoosterParams): OpenBoosterResult {
  const rng = seededRng(params.seed);
  const byRarity = new Map<CardRarity, Card[]>();
  for (const rarity of RARITY_ORDER) {
    byRarity.set(
      rarity,
      params.availableCards.filter((c) => c.rarity === rarity)
    );
  }

  const favorNew = params.completionRatio < 0.7;
  const resultCardIds: string[] = [];
  let guaranteeTriggered = false;

  const shouldForceGuarantee =
    params.config.guarantee !== undefined &&
    params.boostersSinceGuarantee + 1 >= params.config.guarantee.everyNBoosters;

  params.config.slots.forEach((slot, slotIndex) => {
    let rarity = pickRarity(rng, slot.weights);

    if (
      shouldForceGuarantee &&
      slotIndex === params.config.slots.length - 1 &&
      params.config.guarantee &&
      RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(params.config.guarantee.minRarity)
    ) {
      rarity = params.config.guarantee.minRarity;
      guaranteeTriggered = true;
    }

    const pool = byRarity.get(rarity) ?? [];
    const usableInThisBooster = pool.filter((c) => !resultCardIds.includes(c.id));
    if (usableInThisBooster.length === 0) {
      // repli sur toute rareté si le pool est vide (petit univers)
      const fallback = params.availableCards.filter((c) => !resultCardIds.includes(c.id));
      if (fallback.length === 0) return;
      resultCardIds.push(pickFromPool(rng, fallback, params.ownedCardIds, favorNew).id);
      return;
    }

    resultCardIds.push(pickFromPool(rng, usableInThisBooster, params.ownedCardIds, favorNew).id);
  });

  return { cardIds: resultCardIds, guaranteeTriggered };
}

function pickFromPool(rng: () => number, pool: Card[], ownedCardIds: Set<string>, favorNew: boolean): Card {
  const newCards = pool.filter((c) => !ownedCardIds.has(c.id));
  const candidates = favorNew && newCards.length > 0 ? newCards : pool;
  const index = Math.floor(rng() * candidates.length);
  return candidates[index];
}

export function newIdempotencyKey(): string {
  return randomUUID();
}
