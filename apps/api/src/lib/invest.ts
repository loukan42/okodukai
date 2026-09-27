// Placements école : branchement du moteur finsim sur la base. Règles clés
// (docs/FINANCIAL_SIMULATION_ENGINE.md §7 et §10) :
// - la trajectoire est figée à la création et ne sort jamais du serveur au-delà de l'étape révélée ;
// - la graine et le scénario restent cachés jusqu'à la fin de la partie ;
// - les relevés (snapshots) sont créés en rattrapage paresseux, jamais recalculés ni réécrits ;
// - les parties récentes utilisent un capital transféré depuis le portefeuille ; les anciennes
//   parties école sans financement restent lisibles.
import { randomBytes } from "node:crypto";
import type { AgeBand, Prisma, SimMode, SimRhythm, SimulationRun } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getBalances, recordWalletTransaction } from "./ledger.js";
import {
  ENGINE_VERSION,
  EXAMPLE_CONTRACT_FEES,
  alternativeOutcomes,
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
import { locale, type Locale } from "./i18n.js";

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

/**
 * XP des placements (docs/FINANCIAL_EDUCATION.md §7.1) : montant fixe, jamais lié à la valeur ni au
 * scénario. Première répartition : une fois par enfant ; bilan final lu : une fois par partie.
 */
export const FINANCE_XP = { firstAllocation: 20, gameFinished: 20 };
export const financeXpKey = {
  onboarding: (childId: string) => `fin:onboarding:${childId}`,
  game: (childId: string, runId: string) => `fin:partie:${childId}:${runId}`,
};

/** Ce que l'enfant apprend à la fin de sa partie (jamais avant). */
const SCENARIO_LABELS: Record<Locale, Record<ScenarioCode, string>> = {
  fr: {
    CROISSANCE_REGULIERE: "une croissance régulière",
    MARCHE_VOLATIL: "un marché agité",
    FORTE_BAISSE: "une forte baisse",
    CRISE_PUIS_REPRISE: "une crise puis une reprise",
    STAGNATION: "une longue stagnation",
    INFLATION_IMPORTANTE: "une période de forte inflation",
    MARCHE_FAVORABLE: "un marché favorable",
    REALISTE: "un marché réaliste, sans scénario imposé",
  },
  en: {
    CROISSANCE_REGULIERE: "steady growth",
    MARCHE_VOLATIL: "a bumpy market",
    FORTE_BAISSE: "a big drop",
    CRISE_PUIS_REPRISE: "a crisis, then a recovery",
    STAGNATION: "a long flat spell",
    INFLATION_IMPORTANTE: "a time of high inflation",
    MARCHE_FAVORABLE: "a good market",
    REALISTE: "a realistic market, with no set scenario",
  },
};

/** Le nom lisible d'une histoire de marché, pour une partie terminée seulement. */
export const scenarioLabel = (code: string) => SCENARIO_LABELS[locale()][code as ScenarioCode] ?? null;

export async function investSettingsFor(client: Client, childId: string, ageBand: AgeBand) {
  const stored = await client.investSettings.findUnique({ where: { childId } });
  return stored ?? { childId, enabled: true, rhythm: "STANDARD" as SimRhythm, horizonMonths: ageBand === "AGE_8_9" ? 60 : 120, contributionsEnabled: false, contributionCap: 300, notifyStatement: false };
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
  return ops.filter((op) => op.type !== "WALLET_PLAN" && op.type !== "WALLET_PLAN_SKIP").map((op) => {
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

/**
 * Chaque mois simulé d'une partie financée débite réellement le compte avant d'ajouter le dépôt
 * au moteur. Un mois sans solde est marqué comme manqué : un crédit ultérieur ne modifie jamais
 * rétroactivement un relevé déjà créé.
 */
async function syncFundedContributions(run: SimulationRun, revealedSteps: number) {
  if (run.fundedAmount === null || run.contributionCap === null || revealedSteps < 1) return;
  const cap = run.contributionCap;
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { childId: run.childId } });
    await tx.$queryRaw`SELECT "id" FROM "Wallet" WHERE "id" = ${wallet.id} FOR UPDATE`;
    const ops = await tx.simulationOperation.findMany({ where: { runId: run.id, step: { lte: revealedSteps } }, orderBy: [{ step: "asc" }, { createdAt: "asc" }] });
    const plans = ops.filter((op) => op.type === "WALLET_PLAN");
    if (plans.length === 0) return;
    const completed = new Set(ops.filter((op) => op.idempotencyKey.startsWith(`sim-wallet-contribution:${run.id}:`)).map((op) => op.step));
    let contributed = ops.filter((op) => op.type === "VERSEMENT").reduce((sum, op) => sum + (op.amount ?? 0), 0);
    for (let step = 1; step <= revealedSteps; step++) {
      if (completed.has(step)) continue;
      const plan = plans.filter((op) => op.step <= step).at(-1);
      if (!plan || !plan.amountPerMonth || plan.amountPerMonth <= 0) continue;
      const amount = Math.min(plan.amountPerMonth, Math.max(0, cap - contributed));
      if (amount <= 0) break;
      const key = `sim-wallet-contribution:${run.id}:${step}`;
      if ((await getBalances(tx, wallet.id)).available < amount) {
        await tx.simulationOperation.create({ data: { runId: run.id, step, type: "WALLET_PLAN_SKIP", amount: 0, actorId: run.childId, idempotencyKey: key } });
        continue;
      }
      await recordWalletTransaction(tx, { walletId: wallet.id, amount, type: "INVEST_LOCK", actorId: run.childId, sourceType: "simulation_run", sourceId: run.id, idempotencyKey: `invest-lock:${run.id}:${step}` });
      await tx.simulationOperation.create({ data: { runId: run.id, step, type: "VERSEMENT", amount, allocation: plan.allocation as Prisma.InputJsonValue, actorId: run.childId, idempotencyKey: key } });
      contributed += amount;
    }
  });
}

/** Crée une partie : scénario équilibré, trajectoire figée et capital initial choisi. */
export async function createRun(
  tx: Prisma.TransactionClient,
  input: { childId: string; householdId: string; rhythm: SimRhythm; horizonMonths: number; allocation: Allocation; idempotencyKey: string; mode?: SimMode; monthly?: number; fundedAmount?: number }
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
      fundedAmount: input.fundedAmount ?? null,
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
    data: { runId: run.id, step: 0, type: "VERSEMENT", amount: input.fundedAmount ?? STARTING_UNITS, allocation: input.allocation as unknown as Prisma.InputJsonValue, actorId: input.childId, idempotencyKey: `sim-start:${run.id}` },
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
/** Pauses parentales d'un enfant ; une pause en cours court jusqu'à un futur lointain. */
export async function pausesFor(client: Client, childId: string) {
  const rows = await client.investPause.findMany({ where: { childId }, orderBy: { from: "asc" } });
  const FAR = new Date("2999-01-01T00:00:00Z");
  return { pauses: rows.map((r) => ({ from: r.from, to: r.to ?? FAR })), paused: rows.some((r) => r.to === null) };
}

export async function syncRun(client: Client, run: SimulationRun, now = new Date()) {
  const rhythm = RHYTHMS[run.rhythm];
  const { pauses, paused } = await pausesFor(client, run.childId);
  const clock = clockState({ rhythm, startAt: run.startedAt, now, horizonMonths: run.horizonMonths, timeZone: run.timeZone, pauses });
  await syncFundedContributions(run, clock.revealedSteps);
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
    const dates = listRendezVous(rhythm, run.startedAt, clock.rendezVousCount, { timeZone: run.timeZone, pauses });
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
  if (clock.finished && run.fundedAmount !== null && run.settledAt === null) {
    const amount = Math.max(0, Math.round(valuation.points[clock.revealedSteps].value));
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SimulationRun" WHERE "id" = ${run.id} FOR UPDATE`;
      const fresh = await tx.simulationRun.findUniqueOrThrow({ where: { id: run.id } });
      if (fresh.settledAt !== null) return;
      if (amount > 0) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { childId: run.childId } });
        await recordWalletTransaction(tx, { walletId: wallet.id, amount, type: "INVEST_RETURN", actorId: run.childId, sourceType: "simulation_run", sourceId: run.id, idempotencyKey: `invest-return:${run.id}` });
      }
      await tx.simulationRun.update({ where: { id: run.id }, data: { status: "TERMINEE", finishedAt: fresh.finishedAt ?? now, settledAmount: amount, settledAt: now } });
    });
  } else if (clock.finished && run.status === "EN_COURS") {
    await client.simulationRun.update({ where: { id: run.id }, data: { status: "TERMINEE", finishedAt: now } });
  }
  return { clock, valuation, operations: ops, paused };
}

/** Vue exposable au client (enfant ou parent) : rien au-delà de l'étape révélée. */
export async function runView(client: Client, run: SimulationRun, ageBand: AgeBand, now = new Date()) {
  const { clock, valuation, operations, paused } = await syncRun(client, run, now);
  const settled = run.fundedAmount !== null ? await client.simulationRun.findUniqueOrThrow({ where: { id: run.id }, select: { settledAmount: true, settledAt: true } }) : null;
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
  const completionXp = finished ? await client.xpTransaction.findUnique({ where: { idempotencyKey: financeXpKey.game(run.childId, run.id) } }) : null;
  return {
    id: run.id,
    fundedAmount: run.fundedAmount,
    settledAmount: settled?.settledAmount ?? null,
    settledAt: settled?.settledAt ?? null,
    mode: run.mode,
    status: finished ? "TERMINEE" : "EN_COURS",
    feesPaid: current.fees.total,
    feeRates: { entry: fees.entryRate, managementAnnual: typeof fees.managementRateAnnual === "number" ? fees.managementRateAnnual : null, arbitrage: fees.arbitrageRate },
    monthlyPlan: run.fundedAmount === null ? (valuation.monthlyPlan?.amountPerMonth ?? 0) : (operations.filter((o) => o.type === "WALLET_PLAN" && o.step <= clock.revealedSteps).at(-1)?.amountPerMonth ?? 0),
    paused,
    contributionCap: run.contributionCap,
    ageYears: Math.floor(clock.revealedSteps / 12),
    horizonMonths: run.horizonMonths,
    rhythm: run.rhythm,
    startedAt: run.startedAt,
    clock: {
      revealedSteps: clock.revealedSteps,
      elapsed: simulatedElapsed(clock.revealedSteps),
      // En pause : pas de prochain relevé annoncé (il n'y en a pas tant que la pause dure).
      nextRendezVousAt: paused ? null : clock.nextRendezVousAt,
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
    scenarioRevealed: finished ? scenarioLabel(run.scenario) : null,
    /** XP reçue pour avoir lu le bilan final (0 tant qu'il n'est pas lu). */
    completionXp: completionXp?.amount ?? 0,
    finalReport: finished ? finalReport(run, operations, ageBand) : null,
  };
}

/**
 * Bilan final (INVESTMENT_UX E16), calculé seulement une fois la partie terminée : frise des décisions,
 * prix de la liste du marché, et en 10-12 « Et avec d'autres choix ? » (mêmes versements, 100 % sur un
 * seul support, sans arbitrage). Jamais montré avant la fin, jamais pour classer ou culpabiliser.
 */
function finalReport(run: SimulationRun, ops: { step: number; type: string; amount: number | null; amountPerMonth: number | null; allocation: Prisma.JsonValue }[], ageBand: AgeBand) {
  const market = run.marketPath as unknown as MarketPath;
  const alternatives =
    ageBand === "AGE_10_12"
      ? alternativeOutcomes({
          market,
          operations: operationsOf(ops),
          fees: run.fees as unknown as FeeSchedule,
          ...(run.contributionCap !== null ? { contributionCap: run.contributionCap } : {}),
        })
      : null;
  return {
    years: run.horizonMonths / 12,
    decisions: ops.map((o) => ({ step: o.step, type: o.type, amount: o.amount, amountPerMonth: o.amountPerMonth, allocation: (o.allocation ?? null) as Record<SupportCode, number> | null })),
    alternatives,
    marketListEnd: market.priceIndex[Math.min(run.horizonMonths, market.priceIndex.length - 1)],
  };
}

/** La partie en cours ou la dernière terminée d'un mode (une partie arrêtée n'est plus affichée). */
export async function activeRun(client: Client, childId: string, mode: SimMode = "MIROIR") {
  return client.simulationRun.findFirst({ where: { childId, mode, status: { not: "ARRETEE" } }, orderBy: { createdAt: "desc" } });
}
