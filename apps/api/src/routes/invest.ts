import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, requireParent, childSession, parentSession } from "../middleware/requireAuth.js";
import { RHYTHMS, SUPPORTS, SUPPORT_CODES, listRendezVous, portfolioRiskLevel, type FeeSchedule, type MarketPath, type SupportCode } from "../lib/financeSim/index.js";
import {
  FINANCE_XP,
  ORCHARD,
  TIME_ZONE,
  activeRun,
  allocationStep,
  createRun,
  financeXpKey,
  investSettingsFor,
  runView,
  scenarioLabel,
  pausesFor,
  supportsFor,
  syncRun,
  validateAllocation,
} from "../lib/invest.js";
import { grantXp } from "../lib/xp.js";
import type { AgeBand, SimMode, SimulationRun } from "@prisma/client";

export const investRouter = Router();
investRouter.use(attachSession);

/** L'observatoire s'ouvre quand l'enfant a mis des pièces dans Mon coffre au moins une fois. */
async function hasSaved(childId: string) {
  const count = await prisma.walletTransaction.count({ where: { wallet: { childId }, type: "SAVINGS_LOCK" } });
  return count > 0;
}

/**
 * Le verger du temps long (assurance-vie simulée) : 10-12 ans seulement, ouvert après un premier
 * bilan lu dans l'observatoire (les bases avant l'enveloppe).
 */
async function orchardState(childId: string, ageBand: AgeBand, mirror: SimulationRun | null, rhythm: keyof typeof RHYTHMS) {
  if (ageBand !== "AGE_10_12") return { gate: "hidden" as const, run: null };
  const run = await activeRun(prisma, childId, "ASSURANCE_VIE");
  if (run) return { gate: "open" as const, run: await runView(prisma, run, ageBand) };
  const seen = mirror ? await prisma.simulationSnapshot.count({ where: { runId: mirror.id, seenAt: { not: null } } }) : 0;
  if (seen === 0) return { gate: "locked" as const, run: null };
  const [firstRendezVousAt] = listRendezVous(RHYTHMS[rhythm], new Date(), 1, { timeZone: TIME_ZONE });
  return {
    gate: "onboarding" as const,
    run: null,
    firstRendezVousAt,
    fees: { entry: ORCHARD.fees.entryRate, managementAnnual: ORCHARD.fees.managementRateAnnual, arbitrage: ORCHARD.fees.arbitrageRate },
    monthlyChoices: ORCHARD.monthlyChoices,
    contributionCap: ORCHARD.contributionCap,
    horizonMonths: ORCHARD.horizonMonths,
  };
}

async function investState(childId: string) {
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const settings = await investSettingsFor(prisma, childId, pedagogyBand(child));
  const run = await activeRun(prisma, childId);
  const base = {
    ageBand: pedagogyBand(child),
    settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths, contributionsEnabled: settings.contributionsEnabled, contributionCap: settings.contributionCap },
    allocationStep: allocationStep(pedagogyBand(child)),
  };
  if (!settings.enabled) return { ...base, gate: "disabled" as const, run: null, orchard: { gate: "hidden" as const, run: null } };
  const orchard = await orchardState(childId, pedagogyBand(child), run, settings.rhythm);
  if (run) return { ...base, gate: "open" as const, run: await runView(prisma, run, pedagogyBand(child)), orchard };
  if (!(await hasSaved(childId))) return { ...base, gate: "locked" as const, run: null, orchard };
  const [firstRendezVousAt] = listRendezVous(RHYTHMS[settings.rhythm], new Date(), 1, { timeZone: TIME_ZONE });
  return { ...base, gate: "onboarding" as const, run: null, allowedSupports: supportsFor(pedagogyBand(child), false), firstRendezVousAt, orchard };
}

/** XP de la première répartition, si c'est cette partie qui l'a ouverte (aussi au rejeu de la requête). */
async function firstAllocationXp(childId: string, runId: string) {
  const xp = await prisma.xpTransaction.findUnique({ where: { idempotencyKey: financeXpKey.onboarding(childId) } });
  return xp?.sourceId === runId ? xp.amount : 0;
}

function modeOf(value: unknown): SimMode {
  return value === "ASSURANCE_VIE" ? "ASSURANCE_VIE" : "MIROIR";
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
  if (replay) return res.json({ ...(await investState(childId)), xpAwarded: await firstAllocationXp(childId, replay.id) });

  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const settings = await investSettingsFor(prisma, childId, pedagogyBand(child));
  if (!settings.enabled) return res.status(409).json({ error: "Mes placements école ne sont pas ouverts pour l'instant." });
  if (!(await hasSaved(childId))) return res.status(409).json({ error: "L'observatoire s'ouvre quand tu as mis des pièces dans Mon coffre au moins une fois." });
  if (await activeRun(prisma, childId)) return res.status(409).json({ error: "Tu as déjà une partie." });

  const allocation = validateAllocation(req.body.allocation, pedagogyBand(child), supportsFor(pedagogyBand(child), false));
  if (!allocation) return res.status(400).json({ error: "Ta répartition n'a pas été enregistrée : il faut placer exactement 100 unités." });

  try {
    await prisma.$transaction(async (tx) => {
      const run = await createRun(tx, { childId, householdId, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths, allocation, idempotencyKey: key });
      await grantXp(tx, { childId, amount: FINANCE_XP.firstAllocation, sourceType: "FINANCE_LEARNING", sourceId: run.id, idempotencyKey: financeXpKey.onboarding(childId) });
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  // Après un conflit, la partie est soit celle d'un envoi identique, soit absente (autre envoi gagnant).
  const run = await prisma.simulationRun.findUnique({ where: { idempotencyKey: key } });
  if (!run) return res.status(409).json({ error: "Tu as déjà une partie." });
  res.status(201).json({ ...(await investState(childId)), xpAwarded: await firstAllocationXp(childId, run.id) });
});

const orchardSchema = z.object({ allocation: allocationSchema, monthly: z.union([z.literal(0), z.literal(2), z.literal(5)]), idempotencyKey: z.string().uuid() });

investRouter.post("/child/invest/orchard/start", requireChild, validateBody(orchardSchema), async (req, res) => {
  const { childId, householdId } = childSession(req);
  const key = `sim-orchard:${childId}:${req.body.idempotencyKey}`;
  if (await prisma.simulationRun.findUnique({ where: { idempotencyKey: key } })) return res.json(await investState(childId));
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const settings = await investSettingsFor(prisma, childId, pedagogyBand(child));
  const orchard = await orchardState(childId, pedagogyBand(child), await activeRun(prisma, childId), settings.rhythm);
  if (!settings.enabled || orchard.gate !== "onboarding") return res.status(409).json({ error: "Le verger n'est pas encore ouvert." });
  const allocation = validateAllocation(req.body.allocation, pedagogyBand(child), supportsFor(pedagogyBand(child), true));
  if (!allocation) return res.status(400).json({ error: "Ta répartition doit placer exactement 100 %." });
  try {
    await prisma.$transaction((tx) =>
      createRun(tx, { childId, householdId, mode: "ASSURANCE_VIE", rhythm: settings.rhythm, horizonMonths: ORCHARD.horizonMonths, allocation, monthly: req.body.monthly, idempotencyKey: key })
    );
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  res.status(201).json(await investState(childId));
});

investRouter.post("/child/invest/statements/:index/seen", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const run = await activeRun(prisma, childId, modeOf(req.query.mode));
  const index = Number(req.params.index);
  if (!run || !Number.isInteger(index)) return res.status(404).json({ error: "Bilan introuvable" });
  const { clock } = await syncRun(prisma, run);
  await prisma.simulationSnapshot.updateMany({ where: { runId: run.id, rendezVousIndex: { lte: index }, seenAt: null }, data: { seenAt: new Date() } });
  // Bilan final lu : la partie est finie et plus aucun relevé n'attend. Même XP quel que soit le résultat.
  if (clock.finished && (await prisma.simulationSnapshot.count({ where: { runId: run.id, seenAt: null } })) === 0) {
    await prisma
      .$transaction((tx) => grantXp(tx, { childId, amount: FINANCE_XP.gameFinished, sourceType: "FINANCE_LEARNING", sourceId: run.id, idempotencyKey: financeXpKey.game(childId, run.id) }))
      .catch((err: unknown) => {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      });
  }
  res.json(await investState(childId));
});

const rebalanceSchema = z.object({ allocation: allocationSchema, idempotencyKey: z.string().uuid(), mode: z.enum(["MIROIR", "ASSURANCE_VIE"]).optional() });

/**
 * Changer sa répartition (arbitrage) : appliqué au prochain relevé, à la valeur de ce relevé
 * (décision D7-A) — on ne connaît pas le prix d'exécution et on ne peut pas réagir à la minute.
 */
investRouter.post("/child/invest/rebalance", requireChild, validateBody(rebalanceSchema), async (req, res) => {
  const { childId } = childSession(req);
  const key = `sim-arbitrage:${childId}:${req.body.idempotencyKey}`;
  if (await prisma.simulationOperation.findUnique({ where: { idempotencyKey: key } })) return res.json(await investState(childId));

  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const run = await activeRun(prisma, childId, modeOf(req.body.mode));
  if (!run || run.status !== "EN_COURS") return res.status(409).json({ error: "Aucune partie en cours." });
  const { clock, operations } = await syncRun(prisma, run);
  if (clock.finished) return res.status(409).json({ error: "Ta partie est terminée." });
  if (clock.rendezVousCount === 0) return res.status(409).json({ error: "Tu pourras changer ta répartition après ton premier relevé." });
  if (operations.some((o) => o.step > clock.revealedSteps)) return res.status(409).json({ error: "Un changement est déjà prévu pour le prochain relevé." });

  const firstSeen = (await prisma.simulationSnapshot.count({ where: { runId: run.id, seenAt: { not: null } } })) > 0;
  const allocation = validateAllocation(req.body.allocation, pedagogyBand(child), supportsFor(pedagogyBand(child), firstSeen));
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
  const run = await activeRun(prisma, childId, modeOf(req.body?.mode));
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
  const settings = await investSettingsFor(prisma, child.id, pedagogyBand(child));
  const run = await activeRun(prisma, child.id);
  const { paused } = await pausesFor(prisma, child.id);
  res.json({
    settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths, contributionsEnabled: settings.contributionsEnabled, contributionCap: settings.contributionCap },
    paused,
    ageBand: pedagogyBand(child),
    run: run ? await runView(prisma, run, pedagogyBand(child)) : null,
  });
});

const settingsSchema = z.object({
  enabled: z.boolean(),
  rhythm: z.enum(["RAPIDE", "STANDARD", "LONG"]),
  horizonMonths: z.union([z.literal(60), z.literal(120)]),
  contributionsEnabled: z.boolean().optional(),
  contributionCap: z.number().int().min(100).max(2000).optional(),
});

investRouter.put("/household/children/:childId/invest-settings", requireParent, validateBody(settingsSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const data = {
    enabled: req.body.enabled,
    rhythm: req.body.rhythm,
    horizonMonths: req.body.horizonMonths,
    ...(req.body.contributionsEnabled !== undefined ? { contributionsEnabled: req.body.contributionsEnabled } : {}),
    ...(req.body.contributionCap !== undefined ? { contributionCap: req.body.contributionCap } : {}),
    updatedById: userId,
  };
  const settings = await prisma.investSettings.upsert({ where: { childId: child.id }, create: { childId: child.id, ...data }, update: data });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: "invest_settings_updated", targetType: "ChildProfile", targetId: child.id, metadata: data } });
  res.json({ settings: { enabled: settings.enabled, rhythm: settings.rhythm, horizonMonths: settings.horizonMonths, contributionsEnabled: settings.contributionsEnabled, contributionCap: settings.contributionCap } });
});

// ---------------------------------------------------------------------------
// Fiche support (INVESTMENT_UX E8) : sa propre part, son évolution révélée, son risque
// ---------------------------------------------------------------------------

/** Durée recommandée « dans ce jeu » (E8) : 8-9 en mots, 10-12 en années. */
const DURATIONS: Record<SupportCode, { young: string; old: string }> = {
  SECURISE: { young: "un peu", old: "à tout moment" },
  PRETER: { young: "un peu", old: "2 ans ou plus" },
  MONDE: { young: "longtemps", old: "5 ans ou plus" },
  ENTREPRISES: { young: "longtemps", old: "5 ans ou plus" },
};
const SUPPORT_XP = 5;

investRouter.get("/child/invest/supports/:code", requireChild, async (req, res) => {
  const parsed = z.enum(SUPPORT_CODES as unknown as [SupportCode, ...SupportCode[]]).safeParse(req.params.code);
  if (!parsed.success) return res.status(404).json({ error: "Support introuvable" });
  const code = parsed.data;
  const { childId } = childSession(req);
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const band = pedagogyBand(child);
  const young = band === "AGE_8_9";
  // Première ouverture d'une fiche : +5 XP d'exploration, une fois par support (FINANCIAL_EDUCATION §7.1).
  const xp = await prisma.$transaction((tx) => grantXp(tx, { childId, amount: SUPPORT_XP, sourceType: "FINANCE_LEARNING", sourceId: code, idempotencyKey: `fin:explore:${childId}:support:${code}` }));
  const base = { code, riskLevel: SUPPORTS[code].riskLevel, duration: DURATIONS[code][young ? "young" : "old"], xpAwarded: xp ? SUPPORT_XP : 0 };

  const run = await activeRun(prisma, childId, modeOf(req.query.mode));
  if (!run) return res.json({ ...base, held: false });
  const view = await runView(prisma, run, band);
  const prices = (run.marketPath as unknown as MarketPath).prices[code];
  const revealed = view.clock.revealedSteps;
  const snapshots = await prisma.simulationSnapshot.findMany({ where: { runId: run.id }, orderBy: { rendezVousIndex: "asc" }, select: { rendezVousIndex: true, step: true, bySupport: true } });
  const previousStep = snapshots.length >= 2 ? snapshots[snapshots.length - 2].step : 0;
  const fees = run.fees as unknown as FeeSchedule;
  const managementRate = typeof fees.managementRateAnnual === "number" ? fees.managementRateAnnual : fees.managementRateAnnual[code];
  res.json({
    ...base,
    held: (view.bySupport[code] ?? 0) > 0.005,
    units: view.bySupport[code] ?? 0,
    actualPercent: view.actualAllocation[code] ?? 0,
    targetPercent: view.targetAllocation[code] ?? 0,
    // Rien au-delà de l'étape révélée : la trajectoire du support s'arrête au dernier relevé.
    sinceStart: revealed > 0 ? prices[revealed] / prices[0] - 1 : 0,
    lastPeriod: snapshots.length > 0 ? prices[revealed] / prices[previousStep] - 1 : 0,
    lastChange: view.lastStatement?.bySupportChange[code] ?? 0,
    trail: snapshots.slice(-5).map((s) => ({ index: s.rendezVousIndex, value: (s.bySupport as Record<string, number>)[code] ?? 0 })),
    curve: young ? [] : prices.slice(0, revealed + 1).map((value, step) => ({ step, value })),
    managementRate: young ? null : managementRate,
  });
});

// ---------------------------------------------------------------------------
// Mes parties (INVESTMENT_UX E16) : l'archive des parties terminées, consultables une à une.
// Aucune comparaison de valeur entre parties : la liste ne montre que l'histoire et les dates.
// ---------------------------------------------------------------------------

investRouter.get("/child/invest/games", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const runs = await prisma.simulationRun.findMany({ where: { childId, OR: [{ status: { in: ["TERMINEE", "ARRETEE"] } }, { finishedAt: { not: null } }] }, orderBy: { startedAt: "desc" } });
  res.json({
    games: runs.map((r) => ({ id: r.id, mode: r.mode, story: scenarioLabel(r.scenario), years: r.horizonMonths / 12, startedAt: r.startedAt, finishedAt: r.finishedAt })),
  });
});

investRouter.get("/child/invest/games/:id", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const run = await prisma.simulationRun.findUnique({ where: { id: req.params.id } });
  if (!run || run.childId !== childId) return res.status(404).json({ error: "Partie introuvable" });
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const view = await runView(prisma, run, pedagogyBand(child));
  // Une partie en cours n'a pas de bilan final : rien du futur ne sort d'ici.
  if (view.status !== "TERMINEE") return res.status(409).json({ error: "Cette partie n'est pas terminée." });
  res.json({ run: view });
});

// ---------------------------------------------------------------------------
// Versements programmés dans l'observatoire (INVESTMENT_UX E11, Approfondi) et pause parentale (P1)
// ---------------------------------------------------------------------------

const contributionSchema = z.object({
  amountPerMonth: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(20)]),
  allocation: allocationSchema.optional(),
  idempotencyKey: z.string().uuid(),
});

/**
 * Programmer (ou arrêter, montant 0) des versements mensuels d'unités école : appliqué à partir du
 * prochain relevé, dans la limite du plafond de capital école fixé par le parent, départ compris.
 */
investRouter.post("/child/invest/contributions", requireChild, validateBody(contributionSchema), async (req, res) => {
  const { childId } = childSession(req);
  const key = `sim-plan:${childId}:${req.body.idempotencyKey}`;
  if (await prisma.simulationOperation.findUnique({ where: { idempotencyKey: key } })) return res.json(await investState(childId));

  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const band = pedagogyBand(child);
  const settings = await investSettingsFor(prisma, childId, band);
  if (band !== "AGE_10_12" || !settings.enabled || !settings.contributionsEnabled) return res.status(409).json({ error: "Les versements programmés ne sont pas ouverts." });
  const run = await activeRun(prisma, childId, "MIROIR");
  if (!run || run.status !== "EN_COURS") return res.status(409).json({ error: "Aucune partie en cours." });
  const { clock, operations, valuation, paused } = await syncRun(prisma, run);
  if (clock.finished) return res.status(409).json({ error: "Ta partie est terminée." });
  if (paused) return res.status(409).json({ error: "L'observatoire est en pause." });
  if (operations.some((o) => o.step > clock.revealedSteps && o.type === "VERSEMENTS_PROGRAMMES")) return res.status(409).json({ error: "Un changement de versements est déjà prévu pour le prochain relevé." });

  const contributed = valuation.points[clock.revealedSteps].contributed;
  if (req.body.amountPerMonth > 0 && contributed >= settings.contributionCap - 0.005) {
    return res.status(409).json({ error: `Tu as placé tout ton capital école : ${settings.contributionCap} unités. Les versements s'arrêtent. Tes placements continuent d'évoluer.` });
  }
  let allocation: Record<string, number> | null = null;
  if (req.body.amountPerMonth > 0) {
    allocation = req.body.allocation ? validateAllocation(req.body.allocation, band, supportsFor(band, true)) : null;
    if (!allocation) return res.status(400).json({ error: "Choisis où vont tes versements : il faut répartir exactement 100 %." });
  }

  const nextStep = Math.min(run.horizonMonths, clock.revealedSteps + RHYTHMS[run.rhythm].monthsPerRendezVous);
  await prisma.$transaction(async (tx) => {
    // Le plafond vaut pour la partie : le moteur réduit tout versement qui le dépasserait.
    if (run.contributionCap === null) await tx.simulationRun.update({ where: { id: run.id }, data: { contributionCap: settings.contributionCap } });
    await tx.simulationOperation.create({
      data: {
        runId: run.id,
        step: nextStep,
        type: "VERSEMENTS_PROGRAMMES",
        amountPerMonth: req.body.amountPerMonth,
        allocation: (allocation ?? undefined) as Prisma.InputJsonValue | undefined,
        actorId: childId,
        idempotencyKey: key,
      },
    });
  });
  res.status(201).json(await investState(childId));
});

const pauseSchema = z.object({ paused: z.boolean() });

/** Pause parentale (vacances) : les relevés s'arrêtent ; ceux prévus pendant la pause ne sont pas rattrapés. */
investRouter.post("/household/children/:childId/invest-pause", requireParent, validateBody(pauseSchema), async (req, res) => {
  const { householdId, userId } = parentSession(req);
  const child = await childOfHousehold(req.params.childId, householdId);
  if (!child) return res.status(404).json({ error: "Enfant introuvable" });
  const open = await prisma.investPause.findFirst({ where: { childId: child.id, to: null } });
  if (req.body.paused && !open) await prisma.investPause.create({ data: { childId: child.id, createdById: userId } });
  if (!req.body.paused && open) await prisma.investPause.update({ where: { id: open.id }, data: { to: new Date() } });
  await prisma.auditLog.create({ data: { householdId, actorUserId: userId, action: req.body.paused ? "invest_paused" : "invest_resumed", targetType: "ChildProfile", targetId: child.id } });
  res.json({ paused: req.body.paused });
});
