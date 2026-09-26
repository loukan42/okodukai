import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachSession, requireAnySession } from "../middleware/requireAuth.js";
import { catchUpMoney } from "../lib/moneyCatchUp.js";

export const notificationsRouter = Router();
notificationsRouter.use(attachSession);

notificationsRouter.get("/notifications", requireAnySession, async (req, res) => {
  const session = req.session!;
  const householdId = session.householdId;
  // À l'ouverture de l'espace enfant : la prime du lundi est versée ici, pour être fêtée tout de suite.
  if (session.kind === "child") await catchUpMoney(session.childId);

  const notifications =
    session.kind === "parent"
      ? await prisma.notification.findMany({
          where: { householdId, audience: "PARENT" },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : await prisma.notification.findMany({
          where: { householdId, audience: "CHILD", childId: session.childId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

  res.json({ notifications });
});

notificationsRouter.post("/notifications/:id/read", requireAnySession, async (req, res) => {
  const session = req.session!;
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.householdId !== session.householdId) {
    return res.status(404).json({ error: "Notification introuvable" });
  }
  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  res.json({ notification: updated });
});
