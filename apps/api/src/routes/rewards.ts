import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireParent, requireChild, childSession, parentSession } from "../middleware/requireAuth.js";
import { recordWalletTransaction, InsufficientFundsError } from "../lib/ledger.js";

export const rewardsRouter = Router();
rewardsRouter.use(attachSession);

const createRewardSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  category: z.enum(["EXPERIENCE", "OBJET"]),
  priceCoins: z.number().int().positive(),
  allowedChildIds: z.array(z.string().uuid()).default([]),
  quantityAvailable: z.number().int().positive().optional(),
  cooldownHours: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

rewardsRouter.post("/rewards", requireParent, validateBody(createRewardSchema), async (req, res) => {
  const householdId = req.session!.householdId;
  const reward = await prisma.reward.create({
    data: {
      householdId,
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      category: req.body.category,
      priceCoins: req.body.priceCoins,
      allowedChildIds: req.body.allowedChildIds,
      quantityAvailable: req.body.quantityAvailable,
      cooldownHours: req.body.cooldownHours,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    },
  });
  res.status(201).json({ reward });
});

rewardsRouter.get("/rewards", requireParent, async (req, res) => {
  const householdId = req.session!.householdId;
  const rewards = await prisma.reward.findMany({ where: { householdId }, orderBy: { createdAt: "desc" } });
  res.json({ rewards });
});

rewardsRouter.patch("/rewards/:id", requireParent, async (req, res) => {
  const householdId = req.session!.householdId;
  const reward = await prisma.reward.findUnique({ where: { id: req.params.id } });
  if (!reward || reward.householdId !== householdId) return res.status(404).json({ error: "Récompense introuvable" });

  const parsed = createRewardSchema.partial().extend({ active: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });

  const updated = await prisma.reward.update({
    where: { id: reward.id },
    data: { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined },
  });
  res.json({ reward: updated });
});

rewardsRouter.get("/child/rewards", requireChild, async (req, res) => {
  const householdId = req.session!.householdId;
  const childId = childSession(req).childId;
  const rewards = await prisma.reward.findMany({
    where: { householdId, active: true },
  });
  const visible = rewards.filter((r) => r.allowedChildIds.length === 0 || r.allowedChildIds.includes(childId));
  res.json({ rewards: visible });
});

rewardsRouter.post("/child/rewards/:id/redeem", requireChild, async (req, res) => {
  const householdId = req.session!.householdId;
  const childId = childSession(req).childId;
  const reward = await prisma.reward.findUnique({ where: { id: req.params.id } });

  if (!reward || reward.householdId !== householdId || !reward.active) {
    return res.status(404).json({ error: "Récompense introuvable" });
  }
  if (reward.allowedChildIds.length > 0 && !reward.allowedChildIds.includes(childId)) {
    return res.status(403).json({ error: "Récompense non disponible pour ce profil" });
  }
  if (reward.expiresAt && reward.expiresAt < new Date()) {
    return res.status(410).json({ error: "Récompense expirée" });
  }

  if (reward.quantityAvailable !== null && reward.quantityAvailable !== undefined) {
    const claimed = await prisma.rewardRedemption.count({
      where: { rewardId: reward.id, status: { not: "REFUSEE" } },
    });
    if (claimed >= reward.quantityAvailable) {
      return res.status(409).json({ error: "Cette récompense n'est plus disponible" });
    }
  }

  if (reward.cooldownHours) {
    const since = new Date(Date.now() - reward.cooldownHours * 60 * 60 * 1000);
    const recent = await prisma.rewardRedemption.findFirst({
      where: { rewardId: reward.id, childId, requestedAt: { gte: since }, status: { not: "REFUSEE" } },
    });
    if (recent) return res.status(429).json({ error: "Cette récompense revient bientôt disponible" });
  }

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });

  try {
    const redemption = await prisma.$transaction(async (tx) => {
      const redemption = await tx.rewardRedemption.create({
        data: { rewardId: reward.id, childId, priceCoinsAtPurchase: reward.priceCoins },
      });

      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: reward.priceCoins,
        type: "REWARD_PURCHASE",
        actorId: childId,
        idempotencyKey: `reward-redemption:${redemption.id}:purchase`,
        sourceType: "reward_redemption",
        sourceId: redemption.id,
      });

      await tx.notification.create({
        data: {
          householdId,
          audience: "PARENT",
          type: "reward_requested",
          payload: { rewardId: reward.id, rewardTitle: reward.title, childId },
        },
      });

      return redemption;
    });

    res.status(201).json({ redemption });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }
    throw err;
  }
});

const redemptionReviewSchema = z.object({ decision: z.enum(["ACCEPTEE", "REFUSEE"]) });

rewardsRouter.post(
  "/reward-redemptions/:id/review",
  requireParent,
  validateBody(redemptionReviewSchema),
  async (req, res) => {
    const householdId = req.session!.householdId;
    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id: req.params.id },
      include: { reward: true },
    });
    if (!redemption || redemption.reward.householdId !== householdId) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    if (redemption.status !== "DEMANDEE") {
      return res.status(409).json({ error: "Cette demande a déjà été traitée" });
    }

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId: redemption.childId } });

    const updated = await prisma.$transaction(async (tx) => {
      if (req.body.decision === "REFUSEE") {
        await recordWalletTransaction(tx, {
          walletId: wallet.id,
          amount: redemption.priceCoinsAtPurchase,
          type: "REWARD_REFUND",
          actorId: parentSession(req).userId,
          idempotencyKey: `reward-redemption:${redemption.id}:refund`,
          sourceType: "reward_redemption",
          sourceId: redemption.id,
        });
      }

      return tx.rewardRedemption.update({
        where: { id: redemption.id },
        data: {
          status: req.body.decision,
          reviewedAt: new Date(),
          reviewedById: parentSession(req).userId,
        },
      });
    });

    res.json({ redemption: updated });
  }
);

rewardsRouter.post("/reward-redemptions/:id/mark-ready", requireParent, async (req, res) => {
  const householdId = req.session!.householdId;
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: req.params.id },
    include: { reward: true },
  });
  if (!redemption || redemption.reward.householdId !== householdId || redemption.status !== "ACCEPTEE") {
    return res.status(409).json({ error: "Action impossible" });
  }
  const updated = await prisma.rewardRedemption.update({
    where: { id: redemption.id },
    data: { status: "A_UTILISER" },
  });
  res.json({ redemption: updated });
});

rewardsRouter.post("/child/reward-redemptions/:id/mark-used", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const redemption = await prisma.rewardRedemption.findUnique({ where: { id: req.params.id } });
  if (!redemption || redemption.childId !== childId || redemption.status !== "A_UTILISER") {
    return res.status(409).json({ error: "Action impossible" });
  }
  const updated = await prisma.rewardRedemption.update({
    where: { id: redemption.id },
    data: { status: "UTILISEE", usedAt: new Date() },
  });
  res.json({ redemption: updated });
});

rewardsRouter.get("/child/reward-redemptions", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const redemptions = await prisma.rewardRedemption.findMany({
    where: { childId },
    include: { reward: true },
    orderBy: { requestedAt: "desc" },
  });
  res.json({ redemptions });
});
