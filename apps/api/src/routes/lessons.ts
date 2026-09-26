import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { compoundInterestTable, feeDragTable, inflationTable, simpleInterestTable, clockState, RHYTHMS, type MarketPath } from "../lib/financeSim/index.js";

// Leçons chiffrées de la bibliothèque (docs/INVESTMENT_UX.md E12-E14) : tableaux calculés par le
// moteur, jamais par le client. Taux fixes et hypothétiques (« si ça montait de 4 % »), jamais
// présentés comme une promesse.
export const lessonsRouter = Router();
lessonsRouter.use(attachSession);

const round = (values: number[]) => values.map((v) => Math.round(v * 100) / 100);

const rateQuery = z.object({ rate: z.enum(["2", "4", "6"]).default("4") });

/** L'effet boule de neige : intérêts composés contre intérêts simples, sur 10 ans. */
lessonsRouter.get("/child/lessons/snowball", requireChild, (req, res) => {
  const parsed = rateQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  const rate = Number(parsed.data.rate) / 100;
  res.json({ rate, years: 10, compound: round(compoundInterestTable(100, rate, 10)), simple: round(simpleInterestTable(100, rate, 10)) });
});

const feeQuery = z.object({ fee: z.enum(["0.5", "1", "2"]).default("1") });

/** Ce que coûtent les frais : même croissance de 4 %/an, avec et sans frais annuels. */
lessonsRouter.get("/child/lessons/fees", requireChild, (req, res) => {
  const parsed = feeQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  const fee = Number(parsed.data.fee) / 100;
  const table = feeDragTable(100, 0.04, fee, 10);
  res.json({ rate: 0.04, fee, years: 10, withoutFees: round(table.withoutFees), withFees: round(table.withFees) });
});

/**
 * La liste du marché : si l'enfant a une partie en cours, le prix de sa liste suit l'indice des
 * prix déjà révélé de SA partie (jamais au-delà) ; sinon, une illustration à 2 % par an.
 */
lessonsRouter.get("/child/lessons/market-list", requireChild, async (req, res) => {
  const { childId } = childSession(req);
  const run = await prisma.simulationRun.findFirst({ where: { childId, mode: "MIROIR", status: { not: "ARRETEE" } }, orderBy: { createdAt: "desc" } });
  if (run) {
    const clock = clockState({ rhythm: RHYTHMS[run.rhythm], startAt: run.startedAt, now: new Date(), horizonMonths: run.horizonMonths, timeZone: run.timeZone });
    if (clock.revealedSteps >= 12) {
      const index = (run.marketPath as unknown as MarketPath).priceIndex;
      const years = Math.floor(clock.revealedSteps / 12);
      const prices = Array.from({ length: years + 1 }, (_, y) => (100 * index[y * 12]) / index[0]);
      return res.json({ source: "partie", years, prices: round(prices) });
    }
  }
  res.json({ source: "illustration", years: 10, rate: 0.02, prices: round(inflationTable(0.02, 10)) });
});
