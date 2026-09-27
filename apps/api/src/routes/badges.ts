import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { localizeBadge } from "../lib/i18n/content.js";

export const badgesRouter = Router();
badgesRouter.use(attachSession);

badgesRouter.get("/child/badges", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const [allBadges, earned] = await Promise.all([
    prisma.badge.findMany(),
    prisma.childBadge.findMany({ where: { childId } }),
  ]);
  const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e]));

  res.json({
    badges: allBadges.map((b) => ({
      ...localizeBadge(b),
      earned: earnedByBadgeId.has(b.id),
      earnedAt: earnedByBadgeId.get(b.id)?.earnedAt ?? null,
    })),
  });
});
