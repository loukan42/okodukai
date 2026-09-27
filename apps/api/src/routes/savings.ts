import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, requireParent, childSession, parentSession } from "../middleware/requireAuth.js";
import { recordWalletTransaction, DuplicateTransactionError, InsufficientFundsError } from "../lib/ledger.js";
import { applyAllowance } from "../lib/allowance.js";
import { syncGoals } from "../lib/goals.js";
import { catchUpMoney } from "../lib/moneyCatchUp.js";
import { vaultPrimeRule, vaultPrimeView } from "../lib/vaultPrime.js";
import { readLedger, weekSummary, allocateGoals, vaultAvailability, activeGoals, monthKeyParis, monthSummary, previousMonthKey, type Place } from "../lib/money.js";
import { locale } from "../lib/i18n.js";

export const savingsRouter = Router();
savingsRouter.use(attachSession);

type Tx = Prisma.TransactionClient;

const MAX_ACTIVE_GOALS = 5;

async function walletOf(childId: string) {
  return prisma.wallet.findUniqueOrThrow({ where: { childId } });
}

/** Photographie complète de Mon trésor : soldes, semaine, objectifs, règle du coffre. */
async function moneyState(childId: string) {
  await catchUpMoney(childId);
  const wallet = await walletOf(childId);
  const [ledger, goals, rule, pending] = await Promise.all([
    readLedger(prisma, wallet.id),
    activeGoals(prisma, childId),
    prisma.vaultRule.findUnique({ where: { childId } }),
    prisma.vaultWithdrawalRequest.findFirst({ where: { childId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);
  const goalViews = allocateGoals(goals, ledger.balances.vault);
  const availability = vaultAvailability(ledger.transactions, rule, goalViews[0]);
  return { wallet, ledger, goals: goalViews, availability, pendingRequest: pending };
}

function isDuplicate(err: unknown) {
  return err instanceof DuplicateTransactionError || (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002");
}

// ---------------------------------------------------------------------------
// Lecture (enfant)
// ---------------------------------------------------------------------------

savingsRouter.get("/child/money", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId }, select: { ageBand: true, pedagogyLevel: true } });
  const state = await moneyState(childId);
  const accountLines = state.ledger.lines.filter((l) => l.place === "account");
  res.json({
    ageBand: pedagogyBand(child),
    balances: state.ledger.balances,
    week: weekSummary(state.ledger.lines),
    recent: accountLines.slice(-5).reverse(),
    goals: state.goals,
    vault: {
      ...state.availability,
      pendingRequest: state.pendingRequest ? { id: state.pendingRequest.id, amount: state.pendingRequest.amount, createdAt: state.pendingRequest.createdAt } : null,
      prime: await vaultPrimeView(childId),
    },
  });
});

const historyQuery = z.object({
  place: z.enum(["account", "vault"]).default("account"),
  filter: z.enum(["all", "in", "out", "transfer"]).default("all"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

savingsRouter.get("/child/money/history", requireChild, async (req, res) => {
  const parsed = historyQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  const { place, filter, cursor, limit } = parsed.data;
  const { childId } = childSession(req);
  await catchUpMoney(childId);
  const ledger = await readLedger(prisma, (await walletOf(childId)).id);
  const lines = ledger.lines
    .filter((l) => l.place === (place as Place))
    .filter((l) => (filter === "transfer" ? l.kind === "transfert" : filter === "in" ? l.kind !== "transfert" && l.amount > 0 : filter === "out" ? l.kind !== "transfert" && l.amount < 0 : true))
    .reverse();
  const start = cursor ? lines.findIndex((l) => l.id === cursor) + 1 : 0;
  const page = lines.slice(start, start + limit);
  res.json({
    items: page,
    nextCursor: start + limit < lines.length ? page[page.length - 1]?.id ?? null : null,
    week: weekSummary(ledger.lines),
    balance: place === "account" ? ledger.balances.available : ledger.balances.vault,
  });
});

savingsRouter.get("/child/money/lines/:transactionId", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const ledger = await readLedger(prisma, (await walletOf(childId)).id);
  const lines = ledger.lines.filter((l) => l.transactionId === req.params.transactionId);
  if (!lines.length) return res.status(404).json({ error: "Mouvement introuvable" });
  res.json({ lines });
});

// ---------------------------------------------------------------------------
// Transferts entre Mon compte et Mon coffre (enfant)
// ---------------------------------------------------------------------------

// Une clé par intention, générée par le client : un double appui ne crée pas deux transferts.
const moveSchema = z.object({ amount: z.number().int().positive().max(1_000_000), idempotencyKey: z.string().uuid() });

savingsRouter.post("/child/savings/lock", requireChild, validateBody(moveSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const wallet = await walletOf(childId);
  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "SAVINGS_LOCK",
        actorId: childId,
        idempotencyKey: `savings-lock:${childId}:${req.body.idempotencyKey}`,
        sourceType: "savings_transfer",
      });
      const ledger = await readLedger(tx, wallet.id);
      await syncGoals(tx, childId, householdId, ledger.balances.vault);
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      const { ledger } = await moneyState(childId);
      return res.status(400).json({
        error: `Il te manque ${req.body.amount - ledger.balances.available} pièces sur ton compte pour en mettre ${req.body.amount} de côté.`,
        code: "INSUFFICIENT_ACCOUNT",
        available: ledger.balances.available,
      });
    }
    if (!isDuplicate(err)) throw err;
  }
  const state = await moneyState(childId);
  res.json({ outcome: "done", balances: state.ledger.balances, goals: state.goals });
});

savingsRouter.post("/child/savings/unlock", requireChild, validateBody(moveSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const amount: number = req.body.amount;

  // Rejeu d'une intention déjà traitée (réseau, double appui) : on renvoie l'état, sans rien refaire.
  const [doneBefore, requestedBefore] = await Promise.all([
    prisma.walletTransaction.findUnique({ where: { idempotencyKey: `savings-unlock:${childId}:${req.body.idempotencyKey}` } }),
    prisma.vaultWithdrawalRequest.findUnique({ where: { idempotencyKey: `vault-request:${childId}:${req.body.idempotencyKey}` } }),
  ]);
  if (requestedBefore) {
    return res.status(202).json({ outcome: "requested", request: { id: requestedBefore.id, amount: requestedBefore.amount, createdAt: requestedBefore.createdAt } });
  }
  if (doneBefore) {
    const current = await moneyState(childId);
    return res.json({ outcome: "done", balances: current.ledger.balances, goals: current.goals });
  }

  const state = await moneyState(childId);
  const { balances } = state.ledger;

  if (amount > balances.vault) {
    return res.status(400).json({ error: `Ton coffre contient ${balances.vault} pièces. Tu peux en reprendre jusqu'à ${balances.vault}.`, code: "INSUFFICIENT_VAULT", vault: balances.vault });
  }

  if (amount > state.availability.withdrawableNow) {
    const { mode, nextUnlockAt } = state.availability;
    const firstGoal = state.goals[0];
    const approval = mode === "PARENT_APPROVAL" || (mode === "GOAL_ONLY" && !firstGoal);
    if (approval) {
      if (state.pendingRequest) {
        return res.status(409).json({ error: "Tu as déjà une demande en attente. Un parent va la regarder.", code: "REQUEST_PENDING" });
      }
      const request = await prisma.vaultWithdrawalRequest
        .create({ data: { childId, amount, idempotencyKey: `vault-request:${childId}:${req.body.idempotencyKey}` } })
        .catch(async (err: unknown) => {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            return prisma.vaultWithdrawalRequest.findUniqueOrThrow({ where: { idempotencyKey: `vault-request:${childId}:${req.body.idempotencyKey}` } });
          }
          throw err;
        });
      await prisma.notification.create({
        data: { householdId, audience: "PARENT", childId, type: "vault_request_created", payload: { requestId: request.id, amount } },
      });
      return res.status(202).json({ outcome: "requested", request: { id: request.id, amount: request.amount, createdAt: request.createdAt } });
    }
    if (mode === "MIN_DAYS" && nextUnlockAt) {
      return res.status(409).json({ error: "Ces pièces doivent rester un peu plus longtemps dans ton coffre, selon la règle choisie par tes parents.", code: "VAULT_LOCKED_UNTIL", until: nextUnlockAt, withdrawableNow: state.availability.withdrawableNow });
    }
    return res.status(409).json({
      error: firstGoal ? `Il te manque ${firstGoal.missing} pièces pour ton objectif. Ensuite, tu pourras les reprendre.` : "Ces pièces restent dans ton coffre pour l'instant.",
      code: "VAULT_LOCKED_GOAL",
      missing: firstGoal?.missing ?? null,
      withdrawableNow: state.availability.withdrawableNow,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: state.wallet.id,
        amount,
        type: "SAVINGS_UNLOCK",
        actorId: childId,
        idempotencyKey: `savings-unlock:${childId}:${req.body.idempotencyKey}`,
        sourceType: "savings_transfer",
      });
      const ledger = await readLedger(tx, state.wallet.id);
      await syncGoals(tx, childId, householdId, ledger.balances.vault);
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return res.status(400).json({ error: `Ton coffre contient ${balances.vault} pièces. Tu peux en reprendre jusqu'à ${balances.vault}.`, code: "INSUFFICIENT_VAULT", vault: balances.vault });
    }
    if (!isDuplicate(err)) throw err;
  }
  const after = await moneyState(childId);
  res.json({ outcome: "done", balances: after.ledger.balances, goals: after.goals });
});

// ---------------------------------------------------------------------------
// Objectifs (enfant)
// ---------------------------------------------------------------------------

const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(60),
  targetCoins: z.number().int().positive().max(100_000),
  rewardId: z.string().uuid().optional(),
});

savingsRouter.post("/child/savings/goals", requireChild, validateBody(createGoalSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const goals = await activeGoals(prisma, childId);
  if (goals.length >= MAX_ACTIVE_GOALS) {
    return res.status(409).json({ error: `Tu as déjà ${MAX_ACTIVE_GOALS} objectifs. Range-en un pour en créer un nouveau.` });
  }
  // Objectif relié à une récompense : seulement une récompense active de ce foyer, visible par cet
  // enfant ; son titre et son prix font foi (le client ne les fixe pas).
  let fromReward: { id: string; title: string; priceCoins: number } | null = null;
  if (req.body.rewardId) {
    const reward = await prisma.reward.findFirst({ where: { id: req.body.rewardId, householdId, active: true } });
    if (!reward || (reward.allowedChildIds.length > 0 && !reward.allowedChildIds.includes(childId))) return res.status(404).json({ error: "Récompense introuvable" });
    fromReward = reward;
  }
  const goal = await prisma.$transaction(async (tx) => {
    const created = await tx.savingsGoal.create({
      data: {
        childId,
        title: fromReward?.title ?? req.body.title,
        targetCoins: fromReward?.priceCoins ?? req.body.targetCoins,
        rewardId: fromReward?.id ?? null,
        position: (goals.at(-1)?.position ?? -1) + 1,
      },
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { childId } });
    const ledger = await readLedger(tx, wallet.id);
    await syncGoals(tx, childId, householdId, ledger.balances.vault);
    return created;
  });
  res.status(201).json({ goal });
});

savingsRouter.get("/child/savings/goals", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const goals = await prisma.savingsGoal.findMany({ where: { childId, archivedAt: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  res.json({ goals });
});

const orderSchema = z.object({ goalIds: z.array(z.string().uuid()).min(1).max(20) });

/** Réordonner ses objectifs : Mon coffre les remplit dans ce nouvel ordre. */
savingsRouter.post("/child/savings/goals/order", requireChild, validateBody(orderSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const goals = await activeGoals(prisma, childId);
  const ids: string[] = req.body.goalIds;
  if (ids.length !== goals.length || new Set(ids).size !== ids.length || !ids.every((id) => goals.some((g) => g.id === id))) {
    return res.status(400).json({ error: "L'ordre doit contenir chacun de tes objectifs, une seule fois." });
  }
  await prisma.$transaction(async (tx) => {
    for (const [position, id] of ids.entries()) await tx.savingsGoal.update({ where: { id }, data: { position } });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { childId } });
    const ledger = await readLedger(tx, wallet.id);
    await syncGoals(tx, childId, householdId, ledger.balances.vault);
  });
  res.json({ ok: true });
});

/** Ranger un objectif (utilisé ou abandonné) : il ne compte plus dans le remplissage. */
savingsRouter.post("/child/savings/goals/:goalId/archive", requireChild, async (req, res) => {
  const { childId, householdId } = childSession(req);
  const goal = await prisma.savingsGoal.findUnique({ where: { id: req.params.goalId } });
  if (!goal || goal.childId !== childId) return res.status(404).json({ error: "Objectif introuvable" });
  await prisma.$transaction(async (tx) => {
    await tx.savingsGoal.update({ where: { id: goal.id }, data: { archivedAt: goal.archivedAt ?? new Date() } });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { childId } });
    const ledger = await readLedger(tx, wallet.id);
    await syncGoals(tx, childId, householdId, ledger.balances.vault);
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Parent : bonus d'épargne, règle du coffre, demandes de retrait, argent de poche, cadeaux
// ---------------------------------------------------------------------------

async function childOfHousehold(childId: string, householdId: string) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  return child && child.householdId === householdId ? child : null;
}

const bonusSchema = z.object({ childId: z.string().uuid(), amount: z.number().int().positive().max(100_000), reason: z.string().max(200).optional(), idempotencyKey: z.string().uuid().optional() });

savingsRouter.post("/household/savings/bonus", requireParent, validateBody(bonusSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.body.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const wallet = await walletOf(child.id);
  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "SAVINGS_BONUS",
        actorId: userId,
        idempotencyKey: `savings-bonus:${child.id}:${req.body.idempotencyKey ?? `${Date.now()}`}`,
        reason: req.body.reason ?? "Bonus d'épargne",
      });
      const ledger = await readLedger(tx, wallet.id);
      await syncGoals(tx, child.id, householdId, ledger.balances.vault);
    });
  } catch (err) {
    if (!isDuplicate(err)) throw err;
  }
  const state = await moneyState(child.id);
  res.json({ balances: state.ledger.balances });
});

savingsRouter.get("/household/children/:childId/vault-rule", requireParent, async (req, res) => {
  const child = await childOfHousehold(req.params.childId, parentSession(req).householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const rule = await prisma.vaultRule.findUnique({ where: { childId: child.id } });
  res.json({ rule: { mode: rule?.mode ?? "FREE", minDays: rule?.minDays ?? null, since: rule?.since ?? null } });
});

const ruleSchema = z
  .object({ mode: z.enum(["FREE", "PARENT_APPROVAL", "MIN_DAYS", "GOAL_ONLY"]), minDays: z.number().int().min(1).max(365).nullish() })
  .refine((r) => r.mode !== "MIN_DAYS" || r.minDays, { message: "Indiquez une durée en jours." });

savingsRouter.put("/household/children/:childId/vault-rule", requireParent, validateBody(ruleSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const minDays = req.body.mode === "MIN_DAYS" ? req.body.minDays : null;
  const current = await prisma.vaultRule.findUnique({ where: { childId: child.id } });
  const changed = !current || current.mode !== req.body.mode || current.minDays !== minDays;
  const rule = await prisma.vaultRule.upsert({
    where: { childId: child.id },
    create: { childId: child.id, mode: req.body.mode, minDays, updatedById: userId },
    // La règle ne s'applique qu'aux dépôts faits après le changement.
    update: changed ? { mode: req.body.mode, minDays, since: new Date(), updatedById: userId } : {},
  });
  await prisma.auditLog.create({
    data: { householdId, actorUserId: userId, action: "vault_rule_updated", targetType: "ChildProfile", targetId: child.id, metadata: { mode: rule.mode, minDays: rule.minDays } },
  });
  res.json({ rule: { mode: rule.mode, minDays: rule.minDays, since: rule.since } });
});

// Prime du coffre : 1 pièce pour chaque tranche de `step` pièces restées toute la semaine, au plus
// `weeklyCap` par semaine, chaque lundi. Active par défaut ; le parent la règle ou l'arrête.
savingsRouter.get("/household/children/:childId/vault-prime", requireParent, async (req, res) => {
  const child = await childOfHousehold(req.params.childId, parentSession(req).householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  await catchUpMoney(child.id);
  res.json({ prime: await vaultPrimeView(child.id) });
});

const primeSchema = z.object({ active: z.boolean(), step: z.number().int().min(1).max(1000), weeklyCap: z.number().int().min(1).max(1000) });

savingsRouter.put("/household/children/:childId/vault-prime", requireParent, validateBody(primeSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  // Ce qui était dû avant le changement est versé avec l'ancienne règle.
  await catchUpMoney(child.id);
  const previous = await vaultPrimeRule(child.id);
  // Réactiver repart de maintenant : pas de primes pour les semaines où elle était arrêtée.
  const restart = !previous.active && req.body.active;
  await prisma.vaultPrime.update({
    where: { childId: child.id },
    data: { active: req.body.active, step: req.body.step, weeklyCap: req.body.weeklyCap, updatedById: userId, ...(restart ? { since: new Date(), checkedUntil: null } : {}) },
  });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: "vault_prime_updated", targetType: "ChildProfile", targetId: child.id, metadata: req.body } });
  res.json({ prime: await vaultPrimeView(child.id) });
});

savingsRouter.get("/household/vault-requests", requireParent, async (req, res) => {
  const requests = await prisma.vaultWithdrawalRequest.findMany({
    where: { status: "PENDING", child: { householdId: parentSession(req).householdId } },
    include: { child: { select: { id: true, displayName: true, avatarId: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ requests });
});

const decisionSchema = z.object({ decision: z.enum(["approve", "refuse"]) });

savingsRouter.post("/household/vault-requests/:requestId/decision", requireParent, validateBody(decisionSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const request = await prisma.vaultWithdrawalRequest.findUnique({ where: { id: req.params.requestId }, include: { child: true } });
  if (!request || request.child.householdId !== householdId) return res.status(404).json({ error: "Demande introuvable" });
  if (request.status !== "PENDING") return res.json({ request });

  const wallet = await walletOf(request.childId);
  let approved = req.body.decision === "approve";
  try {
    await prisma.$transaction(async (tx) => {
      if (approved) {
        await recordWalletTransaction(tx, {
          walletId: wallet.id,
          amount: request.amount,
          type: "SAVINGS_UNLOCK",
          actorId: userId,
          idempotencyKey: `vault-request:${request.id}`,
          sourceType: "vault_request",
          sourceId: request.id,
        });
        const ledger = await readLedger(tx, wallet.id);
        await syncGoals(tx, request.childId, householdId, ledger.balances.vault);
      }
      await tx.vaultWithdrawalRequest.update({ where: { id: request.id }, data: { status: approved ? "APPROVED" : "REFUSED", decidedAt: new Date(), decidedById: userId } });
      await tx.notification.create({
        data: { householdId, audience: "CHILD", childId: request.childId, type: "vault_request_decided", payload: { requestId: request.id, amount: request.amount, approved } },
      });
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      // Le coffre ne contient plus assez : la demande ne peut pas être acceptée telle quelle.
      approved = false;
      await prisma.vaultWithdrawalRequest.update({ where: { id: request.id }, data: { status: "REFUSED", decidedAt: new Date(), decidedById: userId } });
      return res.status(409).json({ error: "Le coffre ne contient plus assez de pièces pour cette demande. Elle a été refusée." });
    }
    if (!isDuplicate(err)) throw err;
  }
  res.json({ request: { id: request.id, status: approved ? "APPROVED" : "REFUSED" } });
});

// -- Argent de poche automatique et cadeaux ----------------------------------

const allowanceSchema = z.object({ amount: z.number().int().min(1).max(1000), weekday: z.number().int().min(1).max(7), active: z.boolean() });

savingsRouter.get("/household/children/:childId/allowance", requireParent, async (req, res) => {
  const child = await childOfHousehold(req.params.childId, parentSession(req).householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const schedule = await prisma.allowanceSchedule.findUnique({ where: { childId: child.id } });
  res.json({ allowance: schedule && { amount: schedule.amount, weekday: schedule.weekday, active: schedule.active } });
});

/**
 * Argent de poche chaque semaine. Rien n'est rattrapé avant le réglage : le premier versement tombe
 * au prochain jour choisi. Réactiver repart de maintenant (pas de versements « oubliés » d'un coup).
 */
savingsRouter.put("/household/children/:childId/allowance", requireParent, validateBody(allowanceSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  // Ce qui était dû avant le changement est versé à l'ancien montant.
  await applyAllowance(child.id);
  const previous = await prisma.allowanceSchedule.findUnique({ where: { childId: child.id } });
  const restart = !previous || (!previous.active && req.body.active) || previous.weekday !== req.body.weekday;
  const data = { amount: req.body.amount, weekday: req.body.weekday, active: req.body.active, updatedById: userId, ...(restart ? { startsAt: new Date() } : {}) };
  await prisma.allowanceSchedule.upsert({ where: { childId: child.id }, create: { childId: child.id, ...data }, update: data });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: "allowance_updated", targetType: "ChildProfile", targetId: child.id, metadata: req.body } });
  res.json({ allowance: req.body });
});

const giftSchema = z.object({ amount: z.number().int().min(1).max(100_000), reason: z.string().trim().min(1).max(120), idempotencyKey: z.string().uuid().optional() });

/** Un cadeau (anniversaire, fête…) : une entrée à part, avec de qui et pourquoi. */
savingsRouter.post("/household/children/:childId/gift", requireParent, validateBody(giftSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const wallet = await walletOf(child.id);
  try {
    await prisma.$transaction(async (tx) => {
      await recordWalletTransaction(tx, {
        walletId: wallet.id,
        amount: req.body.amount,
        type: "GIFT",
        actorId: userId,
        idempotencyKey: `gift:${child.id}:${req.body.idempotencyKey ?? randomUUID()}`,
        sourceType: "gift",
        reason: req.body.reason,
      });
      await tx.notification.create({ data: { householdId, audience: "CHILD", childId: child.id, type: "gift", payload: { amount: req.body.amount, reason: req.body.reason } } });
      await tx.auditLog.create({ data: { householdId, actorUserId: userId, action: "gift", targetType: "ChildProfile", targetId: child.id, metadata: { amount: req.body.amount, reason: req.body.reason } } });
    });
  } catch (err) {
    if (!(err instanceof DuplicateTransactionError)) throw err;
  }
  res.status(201).json({ ok: true });
});

// -- Mon mois en pièces ---------------------------------------------------------

const pieces = (n: number) => (locale() === "en" ? `${n} ${n === 1 ? "coin" : "coins"}` : `${n} ${n > 1 ? "pièces" : "pièce"}`);

/**
 * Le volet « Mon mois en pièces » (INVESTMENT_UX E9) : au premier bilan qui suit un changement de mois
 * réel, un résumé sans jugement du mois écoulé. Montré une seule fois par mois (journal des feuillets).
 */
savingsRouter.get("/child/money/month-summary", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const key = previousMonthKey(monthKeyParis(new Date()));
  const code = `MOIS:${key}`;
  if (await prisma.financeTipLog.findUnique({ where: { childId_tipCode: { childId, tipCode: code } } })) return res.json({ summary: null });
  const state = await moneyState(childId);
  const s = monthSummary(state.ledger.lines, key);
  if (s.entrees + s.sorties + s.misDeCote === 0) return res.json({ summary: null });
  const en = locale() === "en";
  const month = new Intl.DateTimeFormat(en ? "en-GB" : "fr-FR", { month: "long", timeZone: "Europe/Paris" }).format(new Date(`${key}-15T12:00:00Z`));
  const text = en
    ? `In ${month}, you received ${pieces(s.entrees)}, spent ${pieces(s.sorties)} and put ${pieces(s.misDeCote)} in your vault.`
    : `En ${month}, tu as reçu ${pieces(s.entrees)}, dépensé ${pieces(s.sorties)} et mis ${pieces(s.misDeCote)} dans ton coffre.`;
  const goal = state.goals.find((g) => !g.reached) ?? state.goals[0];
  const goalText = goal ? (en ? `${goal.title}: ${goal.present} of ${goal.targetCoins}.` : `${goal.title} : ${goal.present} sur ${goal.targetCoins}.`) : null;
  await prisma.financeTipLog
    .create({ data: { childId, tipCode: code, outcome: "vu", title: en ? "My month in coins" : "Mon mois en pièces", message: text } })
    .catch((err: unknown) => {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    });
  res.json({ summary: { month, text, goal: goalText } });
});
