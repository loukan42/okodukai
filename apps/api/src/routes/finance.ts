import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { activeRun, runView } from "../lib/invest.js";
import { CHAPTERS, NOTIONS, bandOf, encounter, explain, notionsFor, verify, type Band } from "../lib/finance/notions.js";
import { loadTipContext, nextTip, renderTip, tipByCode, type RunFacts, type TipScreen } from "../lib/finance/tips.js";
import { grade, pickQuestion, publicQuestion, questionById, type QuestionContext, type QuestionCtx } from "../lib/finance/questions.js";

// Pédagogie contextuelle et vérifications (docs/FINANCIAL_EDUCATION.md §5 et §9). Tout est décidé ici :
// quel encart, avec quelles valeurs, quelle question, quelle bonne réponse, quelle XP.
export const financeRouter = Router();
financeRouter.use(attachSession);

async function childBand(childId: string): Promise<Band> {
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  return bandOf(pedagogyBand(child));
}

/** Faits d'un bilan (partie en cours ou terminée, observatoire ou verger), sans rien du futur. */
async function runFacts(childId: string, mode: "MIROIR" | "ASSURANCE_VIE"): Promise<RunFacts | undefined> {
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const run = await activeRun(prisma, childId, mode);
  if (!run) return undefined;
  const view = await runView(prisma, run, pedagogyBand(child));
  const latest = await prisma.simulationSnapshot.findFirst({ where: { runId: run.id }, orderBy: { rendezVousIndex: "desc" }, select: { priceIndex: true } });
  return {
    mode,
    finished: view.status === "TERMINEE",
    value: view.value,
    contributed: view.contributed,
    feesPaid: view.feesPaid,
    monthlyPlan: view.monthlyPlan,
    revealedSteps: view.clock.revealedSteps,
    statements: view.statements.map((s) => ({ step: s.step, value: s.value })),
    series: view.series,
    bySupport: view.bySupport,
    actualAllocation: view.actualAllocation,
    targetAllocation: view.targetAllocation,
    lastStatement: view.lastStatement,
    priceIndex: latest?.priceIndex ?? null,
  };
}

const modeOf = (value: unknown) => (value === "ASSURANCE_VIE" ? "ASSURANCE_VIE" : "MIROIR");
const tipQuery = z.object({
  screen: z.enum(["home", "history", "vault", "bilan", "verger", "support", "patrimoine"]),
  mode: z.enum(["MIROIR", "ASSURANCE_VIE"]).optional(),
  support: z.enum(["SECURISE", "PRETER", "MONDE", "ENTREPRISES"]).optional(),
});

async function tipContext(childId: string, screen: TipScreen, mode: "MIROIR" | "ASSURANCE_VIE", support?: string) {
  const band = await childBand(childId);
  const run = screen === "bilan" ? await runFacts(childId, mode) : undefined;
  return loadTipContext(childId, band, screen, { run, support });
}

/** L'encart de cet écran (au plus un), ou rien. Les notions concernées deviennent « rencontrées ». */
financeRouter.get("/child/finance/tip", requireChild, async (req, res) => {
  const parsed = tipQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  const { childId } = childSession(req);
  const { screen, mode, support } = parsed.data;
  const tip = await nextTip(await tipContext(childId, screen, modeOf(mode), support), screen);
  if (tip) await encounter(prisma, childId, tip.notions);
  res.json({ tip: tip && { code: tip.code, title: tip.title, message: tip.message } });
});

const tipActionSchema = z.object({
  outcome: z.enum(["compris", "plus_tard"]),
  screen: tipQuery.shape.screen,
  mode: tipQuery.shape.mode,
  support: tipQuery.shape.support,
});

/** « J'ai compris » ou « Plus tard » : l'encart entre au journal (une seule fois) ; compris → notion expliquée. */
financeRouter.post("/child/finance/tips/:code", requireChild, validateBody(tipActionSchema), async (req, res) => {
  const { childId } = childSession(req);
  const def = tipByCode(req.params.code);
  if (!def || def.screen !== req.body.screen) return res.status(404).json({ error: "Encart introuvable" });
  const ctx = await tipContext(childId, req.body.screen, modeOf(req.body.mode), req.body.support);
  const view = renderTip(def, ctx);
  if (!view) return res.status(409).json({ error: "Cet encart ne s'applique pas ici." });
  await prisma.financeTipLog
    .create({ data: { childId, tipCode: def.code, outcome: req.body.outcome, title: view.title, message: view.message } })
    .catch((err: unknown) => {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    });
  if (req.body.outcome === "compris") await explain(prisma, childId, view.notions);
  res.status(201).json({ ok: true });
});

/** Carnet : les feuillets déjà lus et l'état des notions de la tranche, par chapitre. */
financeRouter.get("/child/finance/journal", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const band = await childBand(childId);
  const [tips, progress] = await Promise.all([
    prisma.financeTipLog.findMany({ where: { childId }, orderBy: { shownAt: "asc" } }),
    prisma.financeNotionProgress.findMany({ where: { childId } }),
  ]);
  const state = new Map(progress.map((p) => [p.notionCode, p.state]));
  const notions = notionsFor(band).map(([code, n]) => ({ code, word: n.word, chapter: n.chapter, state: state.get(code) ?? "INCONNUE" }));
  const chapters = [...new Set(notions.map((n) => n.chapter))].map((c) => ({ chapter: c, title: CHAPTERS[c], notions: notions.filter((n) => n.chapter === c) }));
  // Les volets « Mon mois en pièces » partagent le journal (vus une fois) mais ne sont pas des feuillets.
  const leaves = tips.filter((t) => !t.tipCode.startsWith("MOIS:"));
  res.json({ tips: leaves.map((t) => ({ code: t.tipCode, title: t.title, message: t.message, shownAt: t.shownAt })), chapters });
});

const questionQuery = z.object({ context: z.enum(["onboarding", "vault", "bilan", "library"]), mode: z.enum(["MIROIR", "ASSURANCE_VIE"]).optional() });

async function questionCtx(childId: string, context: QuestionContext, mode: "MIROIR" | "ASSURANCE_VIE"): Promise<QuestionCtx> {
  const band = await childBand(childId);
  const ctx: QuestionCtx = { band };
  if (context === "bilan") ctx.run = await runFacts(childId, mode);
  if (context === "vault") ctx.hasTransfer = (await prisma.walletTransaction.count({ where: { wallet: { childId }, type: "SAVINGS_LOCK" } })) > 0;
  return ctx;
}

/** Une question pour une notion pas encore vérifiée (au plus une par écran), ou rien. */
financeRouter.get("/child/finance/question", requireChild, async (req, res) => {
  const parsed = questionQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  const { childId } = childSession(req);
  const ctx = await questionCtx(childId, parsed.data.context, modeOf(parsed.data.mode));
  const verified = new Set((await prisma.financeNotionProgress.findMany({ where: { childId, state: "VERIFIEE" }, select: { notionCode: true } })).map((n) => n.notionCode));
  const picked = pickQuestion(parsed.data.context, ctx, verified);
  res.json({ question: picked && publicQuestion(picked.def, picked.built) });
});

const answerSchema = z.object({ optionId: z.string().min(1).max(40), context: questionQuery.shape.context, mode: questionQuery.shape.mode });

/** Le serveur corrige ; bonne réponse → notion vérifiée et +10 XP, une seule fois par notion. */
financeRouter.post("/child/finance/questions/:id/answer", requireChild, validateBody(answerSchema), async (req, res) => {
  const { childId } = childSession(req);
  const def = questionById(req.params.id);
  if (!def || !def.contexts.includes(req.body.context)) return res.status(404).json({ error: "Question introuvable" });
  const ctx = await questionCtx(childId, req.body.context, modeOf(req.body.mode));
  if (def.band !== "all" && def.band !== ctx.band) return res.status(404).json({ error: "Question introuvable" });
  const result = grade(def, ctx, req.body.optionId);
  if (!result) return res.status(400).json({ error: "Réponse invalide" });
  await encounter(prisma, childId, [def.notion]);
  const xpAwarded = result.correct ? await prisma.$transaction((tx) => verify(tx, childId, def.notion)) : 0;
  res.json({ correct: result.correct, feedback: result.feedback, xpAwarded, word: NOTIONS[def.notion]?.word ?? null });
});
