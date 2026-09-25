import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";

export const simulationRouter = Router();
simulationRouter.use(attachSession);

simulationRouter.get("/child/simulation/scenarios", requireChild, async (_req, res) => {
  const scenarios = await prisma.simulationScenario.findMany();
  res.json({ scenarios });
});

const createPortfolioSchema = z.object({
  profile: z.enum(["PRUDENT", "EQUILIBRE", "DYNAMIQUE"]),
  scenarioId: z.string().uuid(),
  startingUnits: z.number().int().positive().max(1000),
});

/**
 * "Mode miroir" (spec §58) : crée un portefeuille pédagogique en unités école,
 * sans jamais toucher au wallet réel de l'enfant.
 */
simulationRouter.post(
  "/child/simulation/portfolios",
  requireChild,
  validateBody(createPortfolioSchema),
  async (req, res) => {
    const childId = childSession(req).childId;
    const portfolio = await prisma.simulationPortfolio.create({
      data: {
        childId,
        profile: req.body.profile,
        scenarioId: req.body.scenarioId,
        startingUnits: req.body.startingUnits,
        currentUnits: req.body.startingUnits,
      },
    });
    res.status(201).json({ portfolio });
  }
);

simulationRouter.get("/child/simulation/portfolios", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const portfolios = await prisma.simulationPortfolio.findMany({
    where: { childId },
    include: { transactions: { orderBy: { periodIndex: "asc" } }, scenario: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ portfolios });
});

/** Avance le portefeuille d'une période supplémentaire du scénario rejoué. */
simulationRouter.post("/child/simulation/portfolios/:id/advance", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const portfolio = await prisma.simulationPortfolio.findUnique({
    where: { id: req.params.id },
    include: { scenario: true, transactions: true },
  });
  if (!portfolio || portfolio.childId !== childId) return res.status(404).json({ error: "Portefeuille introuvable" });
  if (!portfolio.scenario) return res.status(400).json({ error: "Aucun scénario associé" });

  const returnSeries = portfolio.scenario.returnSeries as unknown as Record<string, number[]>;
  const series = returnSeries[portfolio.profile] ?? [];
  const periodIndex = portfolio.transactions.length;

  if (periodIndex >= series.length) {
    return res.status(409).json({ error: "Scénario terminé" });
  }

  const returnPct = series[periodIndex];
  const unitsBefore = portfolio.currentUnits;
  const unitsAfter = Math.max(0, unitsBefore * (1 + returnPct / 100));

  const [, updated] = await prisma.$transaction([
    prisma.simulationTransaction.create({
      data: { portfolioId: portfolio.id, periodIndex, unitsBefore, unitsAfter, returnPct },
    }),
    prisma.simulationPortfolio.update({ where: { id: portfolio.id }, data: { currentUnits: unitsAfter } }),
  ]);

  res.json({ portfolio: updated, periodIndex, returnPct, unitsBefore, unitsAfter });
});
