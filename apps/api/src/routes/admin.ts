import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireParent, parentSession } from "../middleware/requireAuth.js";

export const adminRouter = Router();
adminRouter.use(attachSession, requireParent);

adminRouter.get("/analytics", async (req, res) => {
  // Le rôle du foyer ne donne aucun accès global. Relire ce droit en base à chaque appel
  // pour qu'une révocation prenne effet même si la session est encore valide.
  const user = await prisma.user.findUnique({
    where: { id: parentSession(req).userId },
    select: { isPlatformAdmin: true },
  });
  if (!user?.isPlatformAdmin) return res.status(403).json({ error: "Accès administration réservé" });

  const requestedDays = req.query.days ?? "30";
  if (requestedDays !== "7" && requestedDays !== "30" && requestedDays !== "90") {
    return res.status(400).json({ error: "Période invalide" });
  }
  const days = Number(requestedDays);
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const inPeriod = { gte: from, lt: to };

  // Les requêtes ne retournent que des comptes. Aucun nom, identifiant de foyer,
  // âge, email, titre de quête ou événement individuel ne quitte l'API.
  const [parents, children, households] = await Promise.all([
    prisma.user.count(),
    prisma.childProfile.count(),
    prisma.household.count(),
  ]);
  const [quests, validated] = await Promise.all([
    prisma.quest.count(),
    prisma.questCompletion.count({ where: { status: "VALIDEE" } }),
  ]);
  const [newParents, newChildren, newHouseholds] = await Promise.all([
    prisma.user.count({ where: { createdAt: inPeriod } }),
    prisma.childProfile.count({ where: { createdAt: inPeriod } }),
    prisma.household.count({ where: { createdAt: inPeriod } }),
  ]);
  const [questsCreated, questsSubmitted, questsValidated] = await Promise.all([
    prisma.quest.count({ where: { createdAt: inPeriod } }),
    prisma.questCompletion.count({ where: { declaredAt: inPeriod } }),
    prisma.questCompletion.count({ where: { status: "VALIDEE", reviewedAt: inPeriod } }),
  ]);
  const rewardsRequested = await prisma.rewardRedemption.count({ where: { requestedAt: inPeriod } });

  res.set("Cache-Control", "private, no-store");
  res.json({
    generatedAt: to.toISOString(),
    period: { days, from: from.toISOString(), to: to.toISOString() },
    totals: { parents, children, households, quests, validated },
    activity: { newParents, newChildren, newHouseholds, questsCreated, questsSubmitted, questsValidated, rewardsRequested },
  });
});
