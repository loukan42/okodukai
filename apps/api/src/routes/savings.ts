import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, requireParent, childSession, parentSession } from "../middleware/requireAuth.js";
import { recordWalletTransaction, getBalances, InsufficientFundsError } from "../lib/ledger.js";
import { checkAndAwardBadges } from "../lib/badges.js";

export const savingsRouter = Router();
savingsRouter.use(attachSession);

const createGoalSchema = z.object({
  title: z.string().min(1).max(120),
  targetCoins: z.number().int().positive(),
  rewardId: z.string().uuid().optional(),
});

savingsRouter.post("/child/savings/goals", requireChild, validateBody(createGoalSchema), async (req, res) => {
  const childId = childSession(req).childId;
  const goal = await prisma.savingsGoal.create({
    data: { childId, title: req.body.title, targetCoins: req.body.targetCoins, rewardId: req.body.rewardId },
  });
  await prisma.childProfile.update({ where: { id: childId }, data: { activeGoalId: goal.id } });
  res.status(201).json({ goal });
});

savingsRouter.get("/child/savings/goals", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const goals = await prisma.savingsGoal.findMany({ where: { childId }, orderBy: { createdAt: "desc" } });
  res.json({ goals });
});

const moveSchema = z.object({ amount: z.number().int().positive() });

savingsRouter.post("/child/savings/lock", requireChild, validateBody(moveSchema), async (req, res) => {
  const childId = childSession(req).childId;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });

  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "SAVINGS_LOCK",
        actorId: childId,
        idempotencyKey: `savings-lock:${childId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      });
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) return res.status(400).json({ error: "Solde insuffisant" });
    throw err;
  }

  await maybeCompleteActiveGoal(childId);
  const balances = await getBalances(prisma, wallet.id);
  res.json({ balances });
});

savingsRouter.post("/child/savings/unlock", requireChild, validateBody(moveSchema), async (req, res) => {
  const childId = childSession(req).childId;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });

  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "SAVINGS_UNLOCK",
        actorId: childId,
        idempotencyKey: `savings-unlock:${childId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      });
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) return res.status(400).json({ error: "Coffre insuffisant" });
    throw err;
  }

  const balances = await getBalances(prisma, wallet.id);
  res.json({ balances });
});

const bonusSchema = z.object({ childId: z.string().uuid(), amount: z.number().int().positive(), reason: z.string().max(200).optional() });

savingsRouter.post("/household/savings/bonus", requireParent, validateBody(bonusSchema), async (req, res) => {
  const householdId = req.session!.householdId;
  const child = await prisma.childProfile.findUnique({ where: { id: req.body.childId } });
  if (!child || child.householdId !== householdId) return res.status(404).json({ error: "Enfant introuvable" });

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId: child.id } });
  await prisma.$transaction(async (tx) => {
    await recordWalletTransaction(tx, {
      walletId: wallet.id,
      amount: req.body.amount,
      type: "SAVINGS_BONUS",
      actorId: parentSession(req).userId,
      idempotencyKey: `savings-bonus:${child.id}:${Date.now()}`,
      reason: req.body.reason ?? "Bonus d'épargne",
    });
  });

  const balances = await getBalances(prisma, wallet.id);
  res.json({ balances });
});

async function maybeCompleteActiveGoal(childId: string) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child?.activeGoalId) return;
  const goal = await prisma.savingsGoal.findUnique({ where: { id: child.activeGoalId } });
  if (!goal || goal.achievedAt) return;

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });
  const balances = await getBalances(prisma, wallet.id);
  if (balances.vault >= goal.targetCoins) {
    await prisma.$transaction(async (tx) => {
      await tx.savingsGoal.update({ where: { id: goal.id }, data: { achievedAt: new Date() } });
      await tx.notification.create({
        data: {
          householdId: child.householdId,
          audience: "CHILD",
          childId,
          type: "goal_completed",
          payload: { goalId: goal.id, goalTitle: goal.title },
        },
      });
      await checkAndAwardBadges(tx, childId, child.householdId);
    });
  }
}
