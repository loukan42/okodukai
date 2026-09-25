import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { getBalances } from "../lib/ledger.js";
import { levelFromTotalXp } from "../lib/levels.js";

export const childRouter = Router();
childRouter.use(attachSession);

childRouter.get("/child/wallet", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
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
  const level = levelFromTotalXp(child.currentXp);
  res.json({
    child: {
      id: child.id,
      displayName: child.displayName,
      avatarId: child.avatarId,
      ageBand: child.ageBand,
      activeGoalId: child.activeGoalId,
    },
    level,
  });
});
