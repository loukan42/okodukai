import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireParent, parentSession } from "../middleware/requireAuth.js";
import { getBalances, recordWalletTransaction, InsufficientFundsError } from "../lib/ledger.js";
import { levelFromTotalXp } from "../lib/levels.js";
import { newIdempotencyKey } from "../lib/boosters.js";

export const householdRouter = Router();
householdRouter.use(attachSession, requireParent);

/** Vérifie que le foyer de la session correspond bien à la ressource demandée. */
function assertOwnHousehold(req: { session?: { kind: string; householdId: string } }, householdId: string) {
  return req.session?.householdId === householdId;
}

const createChildSchema = z.object({
  displayName: z.string().min(1).max(40),
  ageBand: z.enum(["AGE_8_9", "AGE_10_12"]),
  avatarId: z.string().min(1),
  pin: z.string().length(4),
});

householdRouter.post("/children", validateBody(createChildSchema), async (req, res) => {
  const householdId = req.session!.householdId;
  const pinHash = await argon2.hash(req.body.pin);

  const child = await prisma.$transaction(async (tx) => {
    const child = await tx.childProfile.create({
      data: {
        householdId,
        displayName: req.body.displayName,
        ageBand: req.body.ageBand,
        avatarId: req.body.avatarId,
        pinHash,
      },
    });
    await tx.wallet.create({ data: { childId: child.id } });
    await tx.auditLog.create({
      data: {
        householdId,
        actorUserId: req.session!.kind === "parent" ? req.session!.userId : undefined,
        action: "child_created",
        targetType: "ChildProfile",
        targetId: child.id,
      },
    });
    return child;
  });

  res.status(201).json({ child: { ...child, pinHash: undefined } });
});

const profileSchema = z.object({
  parentName: z.string().trim().min(1).max(40),
  householdName: z.string().trim().min(1).max(60),
});

/** Accueil : le parent donne son prénom et le nom de la famille (le foyer est créé provisoire). */
householdRouter.put("/profile", validateBody(profileSchema), async (req, res) => {
  const session = parentSession(req);
  const [user, household] = await prisma.$transaction([
    prisma.user.update({ where: { id: session.userId }, data: { displayName: req.body.parentName } }),
    prisma.household.update({ where: { id: session.householdId }, data: { name: req.body.householdName } }),
  ]);
  res.json({ parentName: user.displayName, householdName: household.name });
});

householdRouter.post("/onboarding/complete", async (req, res) => {
  const session = parentSession(req);
  await prisma.household.updateMany({
    where: { id: session.householdId, onboardingCompletedAt: null },
    data: { onboardingCompletedAt: new Date() },
  });
  res.json({ ok: true });
});

householdRouter.get("/children", async (req, res) => {
  const householdId = req.session!.householdId;
  const children = await prisma.childProfile.findMany({ where: { householdId } });

  const withBalances = await Promise.all(
    children.map(async (child) => {
      const wallet = await prisma.wallet.findUnique({ where: { childId: child.id } });
      const balances = wallet ? await getBalances(prisma, wallet.id) : { available: 0, vault: 0 };
      return {
        ...child,
        pinHash: undefined,
        balances,
      };
    })
  );

  res.json({ children: withBalances });
});

householdRouter.get("/dashboard", async (req, res) => {
  const householdId = req.session!.householdId;

  const [pendingCompletions, pendingRedemptions, recentAudit] = await Promise.all([
    prisma.questCompletion.findMany({
      where: { status: "EN_ATTENTE", quest: { householdId } },
      include: { quest: true, child: { select: { id: true, displayName: true, avatarId: true } } },
      orderBy: { declaredAt: "asc" },
    }),
    prisma.rewardRedemption.findMany({
      where: { status: "DEMANDEE", reward: { householdId } },
      include: { reward: true, child: { select: { id: true, displayName: true, avatarId: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  res.json({ pendingCompletions, pendingRedemptions, recentAudit });
});

const universeToggleSchema = z.object({ enabled: z.boolean() });

householdRouter.get("/universes", async (req, res) => {
  const householdId = req.session!.householdId;
  const universes = await prisma.universe.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { householdGrants: { where: { householdId } } },
  });
  res.json({
    universes: universes.map((u) => ({ ...u, householdGrants: undefined, enabled: u.householdGrants.length > 0 })),
  });
});

householdRouter.put("/universes/:universeId", validateBody(universeToggleSchema), async (req, res) => {
  const householdId = req.session!.householdId;
  const { universeId } = req.params;

  if (req.body.enabled) {
    await prisma.householdUniverse.upsert({
      where: { householdId_universeId: { householdId, universeId } },
      update: {},
      create: { householdId, universeId },
    });
  } else {
    const enabledCount = await prisma.householdUniverse.count({ where: { householdId } });
    const existing = await prisma.householdUniverse.findUnique({ where: { householdId_universeId: { householdId, universeId } } });
    if (existing && enabledCount <= 1) {
      return res.status(409).json({ error: "Gardez au moins un univers actif pour les boosters gagnés après chaque quête." });
    }
    await prisma.householdUniverse
      .delete({ where: { householdId_universeId: { householdId, universeId } } })
      .catch(() => undefined);
  }

  res.json({ ok: true });
});

const adjustmentSchema = z.object({
  amount: z.number().int().positive(),
  direction: z.enum(["credit", "debit"]),
  reason: z.string().min(1).max(200),
});

householdRouter.post("/children/:childId/wallet/adjust", validateBody(adjustmentSchema), async (req, res) => {
  const { childId } = req.params;
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || !assertOwnHousehold(req, child.householdId)) {
    return res.status(404).json({ error: "Enfant introuvable" });
  }

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });

  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "PARENT_ADJUSTMENT",
        direction: req.body.direction,
        actorId: req.session!.kind === "parent" ? req.session!.userId : "",
        idempotencyKey: newIdempotencyKey(),
        reason: req.body.reason,
      });
      await tx.auditLog.create({
        data: {
          householdId: child.householdId,
          actorUserId: req.session!.kind === "parent" ? req.session!.userId : undefined,
          action: "wallet_adjustment",
          targetType: "ChildProfile",
          targetId: childId,
          metadata: { amount: req.body.amount, direction: req.body.direction, reason: req.body.reason },
        },
      });
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return res.status(400).json({ error: "Solde insuffisant pour ce retrait" });
    }
    throw err;
  }

  const balances = await getBalances(prisma, wallet.id);
  res.json({ balances });
});

householdRouter.get("/children/:childId/wallet", async (req, res) => {
  const { childId } = req.params;
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || !assertOwnHousehold(req, child.householdId)) {
    return res.status(404).json({ error: "Enfant introuvable" });
  }
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });
  const balances = await getBalances(prisma, wallet.id);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const level = levelFromTotalXp(child.currentXp);
  res.json({ balances, transactions, level });
});

const pedagogySchema = z.object({ level: z.enum(["AUTO", "DECOUVERTE", "APPROFONDI"]) });

/**
 * Niveau pédagogique d'un enfant (docs/FINANCIAL_EDUCATION.md §4.1) : prioritaire sur l'âge pour les
 * mots, les pourcentages et les fonctionnalités de placement. Le portefeuille continue sans rupture.
 */
householdRouter.put("/children/:childId/pedagogy", validateBody(pedagogySchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await prisma.childProfile.findFirst({ where: { id: req.params.childId, householdId } });
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  await prisma.childProfile.update({ where: { id: child.id }, data: { pedagogyLevel: req.body.level } });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: "pedagogy_level_updated", targetType: "ChildProfile", targetId: child.id, metadata: { level: req.body.level } } });
  res.json({ level: req.body.level });
});
