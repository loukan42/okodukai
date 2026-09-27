import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { getBalances } from "../lib/ledger.js";
import { catchUpMoney } from "../lib/moneyCatchUp.js";
import { levelView } from "../lib/levels.js";
import { validateBody } from "../lib/validation.js";

export const childRouter = Router();
childRouter.use(attachSession);

childRouter.get("/child/wallet", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  await catchUpMoney(childId);
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { childId } });
  const balances = await getBalances(prisma, wallet.id);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json({ balances, transactions });
});

childRouter.get("/child/me", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const level = levelView(child.currentXp);
  res.json({
    child: {
      id: child.id,
      displayName: child.displayName,
      avatarId: child.avatarId,
      ageBand: pedagogyBand(child),
      activeGoalId: child.activeGoalId,
    },
    level,
  });
});

/** Le portrait est purement cosmétique et modifiable par l'enfant pour son propre profil. */
childRouter.patch("/child/me/avatar", requireChild, validateBody(z.object({ avatarId: z.string().regex(/^aventurier-(0[1-9]|1[0-6])$/) })), async (req, res) => {
  const child = await prisma.childProfile.update({ where: { id: childSession(req).childId }, data: { avatarId: req.body.avatarId }, select: { avatarId: true } });
  res.json(child);
});
