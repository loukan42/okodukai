import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, requireParent, childSession, parentSession } from "../middleware/requireAuth.js";
import { RHYTHMS, listRendezVous, portfolioRiskLevel } from "../lib/financeSim/index.js";
import { TIME_ZONE, activeRun, allocationStep, createRun, investSettingsFor, runView, supportsFor, syncRun, validateAllocation } from "../lib/invest.js";

export const investRouter = Router();
investRouter.use(attachSession);

/** L'observatoire s'ouvre quand l'enfant a mis des pièces dans Mon coffre au moins une fois. */
async function hasSaved(childId: string) {
  const count = await prisma.walletTransaction.count({ where: { wallet: { childId }, type: "SAVINGS_LOCK" } });
  return count > 0;
}

async function investState(childId: string) {
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const settings = await investSettingsFor(prisma, childId, child.ageBand);
  const run = await activeRun(prisma, childId);
  const base = {
    ageBand: child.ageBand,
    settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths },
    allocationStep: allocationStep(child.ageBand),
  };
  if (!settings.enabled) return { ...base, gate: "disabled" as const, run: null };
  if (run) return { ...base, gate: "open" as const, run: await runView(prisma, run, child.ageBand) };
  if (!(await hasSaved(childId))) return { ...base, gate: "locked" as const, run: null };
  const [firstRendezVousAt] = listRendezVous(RHYTHMS[settings.rhythm], new Date(), 1, { timeZone: TIME_ZONE });
  return { ...base, gate: "onboarding" as const, run: null, allowedSupports: supportsFor(child.ageBand, false), firstRendezVousAt };
}

investRouter.get("/child/invest", requireChild, async (req, res) => {
  res.json(await investState(childSession(req).childId));
});

const allocationSchema = z.record(z.string(), z.number().int());

/** Niveau de risque d'une répartition en cours de construction (atelier). */
investRouter.post("/child/invest/risk", requireChild, validateBody(z.object({ allocation: allocationSchema })), async (req, res) => {
  const draft = req.body.allocation as Record<string, number>;
  const codes = ["SECURISE", "PRETER", "MONDE", "ENTREPRISES"] as const;
  const total = codes.reduce((sum, c) => sum + Math.max(0, draft[c] ?? 0), 0);
  if (total <= 0) return res.json({ riskLevel: null });
  // Le niveau se calcule sur la part déjà placée, ramenée à 100 %.
  const scaled = Object.fromEntries(codes.map((c) => [c, (Math.max(0, draft[c] ?? 0) / total) * 100])) as Record<(typeof codes)[number], number>;
  res.json({ riskLevel: portfolioRiskLevel(scaled) });
});
const startSchema = z.object({ allocation: allocationSchema, idempotencyKey: z.string().uuid() });

investRouter.post("/child/invest/start", requireChild, validateBody(startSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const key = `sim-run:${childId}:${req.body.idempotencyKey}`;
  const replay = await prisma.simulationRun.findUnique({ where: { idempotencyKey: key } });
  if (replay) return res.json(await investState(childId));

  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const settings = await investSettingsFor(prisma, childId, child.ageBand);
  if (!settings.enabled) return res.status(409).json({ error: "Mes placements école ne sont pas ouverts pour l'instant." });
  if (!(await hasSaved(childId))) return res.status(409).json({ error: "L'observatoire s'ouvre quand tu as mis des pièces dans Mon coffre au moins une fois." });
  if (await activeRun(prisma, childId)) return res.status(409).json({ error: "Tu as déjà une partie." });

  const allocation = validateAllocation(req.body.allocation, child.ageBand, supportsFor(child.ageBand, false));
  if (!allocation) return res.status(400).json({ error: "Ta répartition n'a pas été enregistrée : il faut placer exactement 100 unités." });

  try {
    await prisma.$transaction((tx) => createRun(tx, { childId, householdId, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths, allocation, idempotencyKey: key }));
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  res.status(201).json(await investState(childId));
});

investRouter.post("/child/invest/statements/:index/seen", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const run = await activeRun(prisma, childId);
  const index = Number(req.params.index);
  if (!run || !Number.isInteger(index)) return res.status(404).json({ error: "Bilan introuvable" });
  await prisma.simulationSnapshot.updateMany({ where: { runId: run.id, rendezVousIndex: { lte: index }, seenAt: null }, data: { seenAt: new Date() } });
  res.json(await investState(childId));
});

const rebalanceSchema = z.object({ allocation: allocationSchema, idempotencyKey: z.string().uuid() });

/**
 * Changer sa répartition (arbitrage) : appliqué au prochain relevé, à la valeur de ce relevé
 * (décision D7-A) — on ne connaît pas le prix d'exécution et on ne peut pas réagir à la minute.
 */
investRouter.post("/child/invest/rebalance", requireChild, validateBody(rebalanceSchema), async (req, res) => {
  const { childId } = childSession(req);
  const key = `sim-arbitrage:${childId}:${req.body.idempotencyKey}`;
  if (await prisma.simulationOperation.findUnique({ where: { idempotencyKey: key } })) return res.json(await investState(childId));

  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const run = await activeRun(prisma, childId);
  if (!run || run.status !== "EN_COURS") return res.status(409).json({ error: "Aucune partie en cours." });
  const { clock, operations } = await syncRun(prisma, run);
  if (clock.finished) return res.status(409).json({ error: "Ta partie est terminée." });
  if (clock.rendezVousCount === 0) return res.status(409).json({ error: "Tu pourras changer ta répartition après ton premier relevé." });
  if (operations.some((o) => o.step > clock.revealedSteps)) return res.status(409).json({ error: "Un changement est déjà prévu pour le prochain relevé." });

  const firstSeen = (await prisma.simulationSnapshot.count({ where: { runId: run.id, seenAt: { not: null } } })) > 0;
  const allocation = validateAllocation(req.body.allocation, child.ageBand, supportsFor(child.ageBand, firstSeen));
  if (!allocation) return res.status(400).json({ error: "Ta nouvelle répartition doit placer exactement 100 %." });

  const nextStep = Math.min(run.horizonMonths, clock.revealedSteps + RHYTHMS[run.rhythm].monthsPerRendezVous);
  await prisma.simulationOperation
    .create({ data: { runId: run.id, step: nextStep, type: "ARBITRAGE", allocation: allocation as unknown as Prisma.InputJsonValue, actorId: childId, idempotencyKey: key } })
    .catch((err: unknown) => {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    });
  res.status(201).json(await investState(childId));
});

/** Nouvelle partie une fois la précédente terminée (le scénario suivant est tiré sans remise). */
investRouter.post("/child/invest/new-game", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const run = await activeRun(prisma, childId);
  if (run) {
    const { clock } = await syncRun(prisma, run);
    if (!clock.finished && run.status === "EN_COURS") return res.status(409).json({ error: "Ta partie n'est pas terminée." });
    await prisma.simulationRun.update({ where: { id: run.id }, data: { status: "ARRETEE" } });
  }
  res.json(await investState(childId));
});

// ---------------------------------------------------------------------------
// Parent : réglages et vue (sans le futur, comme l'enfant)
// ---------------------------------------------------------------------------

async function childOfHousehold(childId: string, householdId: string) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  return child && child.householdId === householdId ? child : null;
}

investRouter.get("/household/children/:childId/invest", requireParent, async (req, res) => {
  const child = await childOfHousehold(req.params.childId, parentSession(req).householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const settings = await investSettingsFor(prisma, child.id, child.ageBand);
  const run = await activeRun(prisma, child.id);
  res.json({ settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths }, run: run ? await runView(prisma, run, child.ageBand) : null });
});

const settingsSchema = z.object({ enabled: z.boolean(), rhythm: z.enum(["RAPIDE", "STANDARD", "LONG"]), horizonMonths: z.union([z.literal(60), z.literal(120)]) });

investRouter.put("/household/children/:childId/invest-settings", requireParent, validateBody(settingsSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const data = { enabled: req.body.enabled, rhythm: req.body.rhythm, horizonMonths: req.body.horizonMonths, updatedById: userId };
  const settings = await prisma.investSettings.upsert({ where: { childId: child.id }, create: { childId: child.id, ...data }, update: data });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: "invest_settings_updated", targetType: "ChildProfile", targetId: child.id, metadata: data } });
  res.json({ settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths } });
});
