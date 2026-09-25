import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { openBooster, generateBoosterSeed, type BoosterSlotConfig } from "../lib/boosters.js";
import { checkAndAwardBadges } from "../lib/badges.js";

export const collectionRouter = Router();
collectionRouter.use(attachSession);

collectionRouter.get("/child/universes", requireChild, async (req, res) => {
  const householdId = req.session!.householdId;
  const grants = await prisma.householdUniverse.findMany({
    where: { householdId },
    include: { universe: true },
  });
  res.json({ universes: grants.map((g) => g.universe) });
});

collectionRouter.get("/child/collection/:universeId", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const householdId = req.session!.householdId;
  const { universeId } = req.params;

  const grant = await prisma.householdUniverse.findUnique({
    where: { householdId_universeId: { householdId, universeId } },
  });
  if (!grant) return res.status(403).json({ error: "Univers non activé pour ce foyer" });

  const [cards, owned] = await Promise.all([
    prisma.card.findMany({ where: { universeId, active: true }, orderBy: { cardNumber: "asc" } }),
    prisma.childCard.findMany({ where: { childId, card: { universeId } } }),
  ]);

  const ownedByCardId = new Map(owned.map((o) => [o.cardId, o]));

  res.json({
    cards: cards.map((card) => ({
      ...card,
      owned: ownedByCardId.has(card.id),
      quantity: ownedByCardId.get(card.id)?.quantity ?? 0,
      masteryTier: masteryTierFromQuantity(ownedByCardId.get(card.id)?.quantity ?? 0),
    })),
    completion: { owned: owned.length, total: cards.length },
  });
});

function masteryTierFromQuantity(quantity: number): string | null {
  if (quantity >= 10) return "MAITRE";
  if (quantity >= 5) return "EXPERT";
  if (quantity >= 3) return "CONNAISSEUR";
  if (quantity >= 1) return "DECOUVERTE";
  return null;
}

collectionRouter.get("/child/boosters", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const boosters = await prisma.boosterInstance.findMany({
    where: { childId, status: "NON_OUVERT" },
    include: { definition: { include: { universe: true } } },
    orderBy: { grantedAt: "asc" },
  });
  res.json({ boosters });
});

async function cardsFromOpening(boosterInstanceId: string) {
  const opening = await prisma.boosterOpening.findUnique({ where: { boosterInstanceId } });
  if (!opening) return [];
  const cards = await prisma.card.findMany({ where: { id: { in: opening.resultCardIds } } });
  return opening.resultCardIds.map((id) => cards.find((card) => card.id === id)!).filter(Boolean);
}

collectionRouter.post("/child/boosters/:id/open", requireChild, async (req, res, next) => {
  const childId = childSession(req).childId;
  const instance = await prisma.boosterInstance.findUnique({
    where: { id: req.params.id },
    include: { definition: true },
  });

  if (!instance || instance.childId !== childId) {
    return res.status(404).json({ error: "Booster introuvable" });
  }
  if (instance.status === "OUVERT") {
    return res.json({ alreadyOpened: true, cards: await cardsFromOpening(instance.id) });
  }

  const [availableCards, ownedCards] = await Promise.all([
    prisma.card.findMany({ where: { universeId: instance.definition.universeId, active: true } }),
    prisma.childCard.findMany({ where: { childId, card: { universeId: instance.definition.universeId } } }),
  ]);

  const totalCards = availableCards.length;
  const completionRatio = totalCards > 0 ? ownedCards.length / totalCards : 0;

  const recentOpenings = await prisma.boosterOpening.count({
    where: { childId, boosterInstance: { definition: { universeId: instance.definition.universeId } } },
  });

  const config = instance.definition.slotConfig as unknown as BoosterSlotConfig;
  const seed = generateBoosterSeed();

  const { cardIds, guaranteeTriggered } = openBooster({
    config,
    seed,
    availableCards,
    ownedCardIds: new Set(ownedCards.map((c) => c.cardId)),
    completionRatio,
    boostersSinceGuarantee: config.guarantee ? recentOpenings % config.guarantee.everyNBoosters : 0,
  });

  try {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.boosterInstance.updateMany({
      where: { id: instance.id, status: "NON_OUVERT" },
      data: { status: "OUVERT", openedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("BOOSTER_ALREADY_OPENED");

    await tx.boosterOpening.create({
      data: {
        boosterInstanceId: instance.id,
        childId,
        rngVersion: instance.definition.rngVersion,
        rngSeed: seed,
        resultCardIds: cardIds,
      },
    });

    for (const cardId of cardIds) {
      await tx.childCard.upsert({
        where: { childId_cardId: { childId, cardId } },
        update: { quantity: { increment: 1 }, lastObtainedAt: new Date() },
        create: { childId, cardId },
      });
    }

    await tx.auditLog.create({
      data: {
        householdId: req.session!.householdId,
        action: "booster_opened",
        targetType: "BoosterInstance",
        targetId: instance.id,
        metadata: { cardIds, guaranteeTriggered },
      },
    });

    await checkAndAwardBadges(tx, childId, req.session!.householdId);
  });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOSTER_ALREADY_OPENED") {
      return res.json({ alreadyOpened: true, cards: await cardsFromOpening(instance.id) });
    }
    return next(error);
  }

  const cards = await prisma.card.findMany({ where: { id: { in: cardIds } } });
  // conserve l'ordre du tirage (findMany ne garantit pas l'ordre d'entrée)
  const orderedCards = cardIds.map((id) => cards.find((c) => c.id === id)!).filter(Boolean);

  res.json({ alreadyOpened: false, cards: orderedCards, guaranteeTriggered });
});
