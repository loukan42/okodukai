// Placements école : branchement du moteur finsim sur la base. Règles clés
// (docs/FINANCIAL_SIMULATION_ENGINE.md §7 et §10) :
// - la trajectoire est figée à la création et ne sort jamais du serveur au-delà de l'étape révélée ;
// - la graine et le scénario restent cachés jusqu'à la fin de la partie ;
// - les relevés (snapshots) sont créés en rattrapage paresseux, jamais recalculés ni réécrits ;
// - les unités école n'ont aucun lien avec les pièces (aucune écriture au ledger ici).
import { randomBytes } from "node:crypto";
import type { AgeBand, Prisma, SimMode, SimRhythm, SimulationRun } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  ENGINE_VERSION,
  EXAMPLE_CONTRACT_FEES,
  NO_FEES,
  PARAMETERS_FINGERPRINT,
  RHYTHMS,
  SUPPORT_CODES,
  SUPPORTS,
  clockState,
  generateMarketPath,
  listRendezVous,
  pickScenario,
  portfolioRiskLevel,
  simulatedElapsed,
  stepAtRendezVous,
  summarizePeriod,
  valuePortfolio,
  type Allocation,
  type FeeSchedule,
  type MarketPath,
  type ScenarioCode,
  type SimOperation,
  type SupportCode,
} from "./financeSim/index.js";

type Client = Prisma.TransactionClient | typeof prisma;

export const TIME_ZONE = "Europe/Paris";
export const STARTING_UNITS = 100;

/** Verger du temps long : contrat d'exemple (2 % sur versement, 0,8 %/an, 0,5 % par arbitrage), 10 ans. */
export const ORCHARD = {
  fees: EXAMPLE_CONTRACT_FEES,
  horizonMonths: 120,
  contributionCap: 400,
  monthlyChoices: [0, 2, 5] as const,
};

/** Ce que l'enfant apprend à la fin de sa partie (jamais avant). */
const SCENARIO_LABEL: Record<ScenarioCode, string> = {
  CROISSANCE_REGULIERE: "une croissance régulière",
  MARCHE_VOLATIL: "un marché agité",
  FORTE_BAISSE: "une forte baisse",
  CRISE_PUIS_REPRISE: "une crise puis une reprise",
  STAGNATION: "une longue stagnation",
  INFLATION_IMPORTANTE: "une période de forte inflation",
  MARCHE_FAVORABLE: "un marché favorable",
  REALISTE: "un marché réaliste, sans scénario imposé",
};

export async function investSettingsFor(client: Client, childId: string, ageBand: AgeBand) {
  const stored = await client.investSettings.findUnique({ where: { childId } });
  return stored ?? { childId, enabled: true, rhythm: "STANDARD" as SimRhythm, horizonMonths: ageBand === "AGE_8_9" ? 60 : 120 };
}

/**
 * Supports proposés : découverte progressive en 8-9 ans (Sécurisé et Entreprises d'abord,
 * le contraste « calme / bouge beaucoup »), les quatre après le premier bilan lu.
 */
export function supportsFor(ageBand: AgeBand, firstStatementSeen: boolean): SupportCode[] {
  if (ageBand === "AGE_8_9" && !firstStatementSeen) return ["SECURISE", "ENTREPRISES"];
  return [...SUPPORT_CODES];
}

export function allocationStep(ageBand: AgeBand) {
  return ageBand === "AGE_8_9" ? 10 : 5;
}

/** Répartition valide pour cet âge : entiers, pas de 10 (8-9) ou 5 (10-12), supports ouverts, total 100. */
export function validateAllocation(allocation: Record<string, number>, ageBand: AgeBand, allowed: SupportCode[]): Allocation | null {
  const step = allocationStep(ageBand);
  const out: Record<SupportCode, number> = { SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };
  let sum = 0;
  for (const [code, value] of Object.entries(allocation)) {
    if (!(SUPPORT_CODES as readonly string[]).includes(code)) return null;
    if (!Number.isInteger(value) || value < 0 || value > 100 || value % step !== 0) return null;
    if (value > 0 && !allowed.includes(code as SupportCode)) return null;
    out[code as SupportCode] = value;
    sum += value;
  }
  return sum === 100 ? out : null;
}

function operationsOf(ops: { step: number; type: string; amount: number | null; amountPerMonth: number | null; allocation: Prisma.JsonValue }[]): SimOperation[] {
  return ops.map((op) => {
    const allocation = (op.allocation ?? undefined) as Allocation | undefined;
    switch (op.type) {
      case "ARBITRAGE":
        return { type: "ARBITRAGE", step: op.step, allocation: allocation! };
      case "RETRAIT":
        return { type: "RETRAIT", step: op.step, amount: op.amount ?? 0 };
      case "VERSEMENTS_PROGRAMMES":
        return { type: "VERSEMENTS_PROGRAMMES", step: op.step, amountPerMonth: op.amountPerMonth ?? 0, allocation };
      default:
        return { type: "VERSEMENT", step: op.step, amount: op.amount ?? 0, allocation };
    }
  });
}

/** Crée une partie : scénario équilibré, trajectoire figée, versement initial de 100 unités. */
export async function createRun(
  tx: Prisma.TransactionClient,
  input: { childId: string; householdId: string; rhythm: SimRhythm; horizonMonths: number; allocation: Allocation; idempotencyKey: string; mode?: SimMode; monthly?: number }
) {
  const mode = input.mode ?? "MIROIR";
  const previous = await tx.simulationRun.findMany({ where: { childId: input.childId }, orderBy: { createdAt: "asc" }, select: { scenario: true } });
  const seed = randomBytes(16).toString("hex");
  const scenario = pickScenario({ seed: `${input.childId}:${previous.length}`, history: previous.map((r) => r.scenario as ScenarioCode) });
  const marketPath = generateMarketPath({ seed, scenario, horizonMonths: input.horizonMonths });
  const fees: FeeSchedule = mode === "ASSURANCE_VIE" ? ORCHARD.fees : NO_FEES;
  const run = await tx.simulationRun.create({
    data: {
      childId: input.childId,
      householdId: input.householdId,
      mode,
      contributionCap: mode === "ASSURANCE_VIE" ? ORCHARD.contributionCap : null,
      engineVersion: ENGINE_VERSION,
      parametersFingerprint: PARAMETERS_FINGERPRINT,
      seed,
      scenario,
      horizonMonths: input.horizonMonths,
      rhythm: input.rhythm,
      timeZone: TIME_ZONE,
      fees: fees as unknown as Prisma.InputJsonValue,
      marketPath: marketPath as unknown as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
    },
  });
  await tx.simulationOperation.create({
    data: { runId: run.id, step: 0, type: "VERSEMENT", amount: STARTING_UNITS, allocation: input.allocation as unknown as Prisma.InputJsonValue, actorId: input.childId, idempotencyKey: `sim-start:${run.id}` },
  });
  if (input.monthly && input.monthly > 0) {
    await tx.simulationOperation.create({
      data: { runId: run.id, step: 0, type: "VERSEMENTS_PROGRAMMES", amountPerMonth: input.monthly, actorId: input.childId, idempotencyKey: `sim-plan:${run.id}` },
    });
  }
  return run;
}

/**
 * Rattrape les rendez-vous passés : un relevé par rendez-vous, avec la valeur découverte à ce
 * moment-là. Idempotent grâce à l'unicité (runId, rendezVousIndex).
 */
export async function syncRun(client: Client, run: SimulationRun, now = new Date()) {
  const rhythm = RHYTHMS[run.rhythm];
  const clock = clockState({ rhythm, startAt: run.startedAt, now, horizonMonths: run.horizonMonths, timeZone: run.timeZone });
  const market = run.marketPath as unknown as MarketPath;
  const ops = await client.simulationOperation.findMany({ where: { runId: run.id }, orderBy: [{ step: "asc" }, { createdAt: "asc" }] });
  // Les décisions prévues pour un relevé futur ne comptent qu'une fois ce relevé révélé.
  const applied = ops.filter((o) => o.step <= clock.revealedSteps);
  const valuation = valuePortfolio({
    market,
    operations: operationsOf(applied),
    fees: run.fees as unknown as FeeSchedule,
    untilStep: clock.revealedSteps,
    ...(run.contributionCap !== null ? { contributionCap: run.contributionCap } : {}),
  });

  const done = await client.simulationSnapshot.count({ where: { runId: run.id } });
  if (clock.rendezVousCount > done) {
    const dates = listRendezVous(rhythm, run.startedAt, clock.rendezVousCount, { timeZone: run.timeZone });
    const rows = [];
    for (let k = done + 1; k <= clock.rendezVousCount; k++) {
      const step = stepAtRendezVous(rhythm, k, run.horizonMonths);
      const point = valuation.points[step];
      rows.push({
        runId: run.id,
        rendezVousIndex: k,
        step,
        scheduledAt: dates[k - 1],
        valueAtReveal: point.valueAtReveal,
        bySupport: point.bySupport as unknown as Prisma.InputJsonValue,
        contributed: point.contributed,
        performanceIndex: point.performanceIndex,
        priceIndex: point.priceIndex,
      });
    }
    await client.simulationSnapshot.createMany({ data: rows, skipDuplicates: true });
  }
  if (clock.finished && run.status === "EN_COURS") {
    await client.simulationRun.update({ where: { id: run.id }, data: { status: "TERMINEE", finishedAt: now } });
  }
  return { clock, valuation, operations: ops };
}

/** Vue exposable au client (enfant ou parent) : rien au-delà de l'étape révélée. */
export async function runView(client: Client, run: SimulationRun, ageBand: AgeBand, now = new Date()) {
  const { clock, valuation, operations } = await syncRun(client, run, now);
  const snapshots = await client.simulationSnapshot.findMany({ where: { runId: run.id }, orderBy: { rendezVousIndex: "asc" } });
  const points = valuation.points;
  const current = points[clock.revealedSteps];
  const target = valuation.targetAllocation ?? { SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };
  const firstSeen = snapshots.some((s) => s.seenAt);
  const lastTwo = snapshots.slice(-2);
  const lastSummary =
    lastTwo.length > 0
      ? summarizePeriod(points, lastTwo.length === 2 ? lastTwo[0].step : 0, lastTwo[lastTwo.length - 1].step)
      : null;
  const previousBySupport = (lastTwo.length === 2 ? lastTwo[0].bySupport : points[0].bySupport) as Record<SupportCode, number>;
  const finished = clock.finished || run.status !== "EN_COURS";
  const fees = run.fees as unknown as FeeSchedule;
  return {
    id: run.id,
    mode: run.mode,
    status: finished ? "TERMINEE" : "EN_COURS",
    feesPaid: current.fees.total,
    feeRates: { entry: fees.entryRate, managementAnnual: typeof fees.managementRateAnnual === "number" ? fees.managementRateAnnual : null, arbitrage: fees.arbitrageRate },
    monthlyPlan: valuation.monthlyPlan?.amountPerMonth ?? 0,
    ageYears: Math.floor(clock.revealedSteps / 12),
    horizonMonths: run.horizonMonths,
    rhythm: run.rhythm,
    startedAt: run.startedAt,
    clock: {
      revealedSteps: clock.revealedSteps,
      elapsed: simulatedElapsed(clock.revealedSteps),
      nextRendezVousAt: clock.nextRendezVousAt,
      rendezVousCount: clock.rendezVousCount,
    },
    value: current.value,
    contributed: current.contributed,
    gain: current.gain,
    performance: current.performanceIndex / 100 - 1,
    bySupport: current.bySupport,
    actualAllocation: current.actualAllocation,
    targetAllocation: target,
    riskLevel: portfolioRiskLevel(target),
    supportsRisk: Object.fromEntries(SUPPORT_CODES.map((c) => [c, SUPPORTS[c].riskLevel])),
    allowedSupports: supportsFor(ageBand, firstSeen),
    allocationStep: allocationStep(ageBand),
    series: points.slice(0, clock.revealedSteps + 1).map((p) => ({ step: p.step, value: p.value, contributed: p.contributed })),
    statements: snapshots.map((s) => ({ index: s.rendezVousIndex, step: s.step, scheduledAt: s.scheduledAt, value: s.valueAtReveal, seen: Boolean(s.seenAt) })),
    unseen: snapshots.filter((s) => !s.seenAt).length,
    lastStatement: lastSummary && {
      fromStep: lastSummary.fromStep,
      toStep: lastSummary.toStep,
      startValue: lastSummary.startValue,
      endValue: lastTwo[lastTwo.length - 1].valueAtReveal,
      performance: lastSummary.performance,
      /** Versements − retraits de la période : ce n'est pas un gain. */
      netFlows: lastSummary.netFlows,
      /** Ce qui vient du marché (et des frais), hors versements. */
      marketEffect: lastSummary.marketEffect,
      bySupportChange: Object.fromEntries(
        SUPPORT_CODES.map((c) => [c, ((lastTwo[lastTwo.length - 1].bySupport as Record<SupportCode, number>)[c] ?? 0) - (previousBySupport[c] ?? 0)])
      ),
    },
    pendingOperations: operations.filter((o) => o.step > clock.revealedSteps).length,
    scenarioRevealed: finished ? SCENARIO_LABEL[run.scenario as ScenarioCode] ?? null : null,
  };
}

/** La partie en cours ou la dernière terminée d'un mode (une partie arrêtée n'est plus affichée). */
export async function activeRun(client: Client, childId: string, mode: SimMode = "MIROIR") {
  return client.simulationRun.findFirst({ where: { childId, mode, status: { not: "ARRETEE" } }, orderBy: { createdAt: "desc" } });
}
