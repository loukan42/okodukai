import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireAnySession, requireChild, childSession } from "../middleware/requireAuth.js";
import { vapidPublicKey } from "../lib/push.js";
import { notifyReadyStatements } from "../lib/statementNotifier.js";
import { locale } from "../lib/i18n.js";

export const pushRouter = Router();
pushRouter.use(attachSession);

/** Clé publique VAPID pour s'abonner ; `null` tant que les notifications ne sont pas mises en service. */
pushRouter.get("/push/public-key", requireAnySession, (_req, res) => {
  res.json({ key: vapidPublicKey });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  /** Langue de l'appareil, pour écrire la notification ; à défaut celle de la requête. */
  locale: z.enum(["fr", "en"]).optional(),
});

pushRouter.post("/child/push/subscribe", requireChild, validateBody(subscriptionSchema), async (req, res) => {
  const { childId } = childSession(req);
  const data = { childId, p256dh: req.body.keys.p256dh, auth: req.body.keys.auth };
  const deviceLocale = req.body.locale ?? locale();
  await prisma.pushSubscription.upsert({ where: { endpoint: req.body.endpoint }, create: { endpoint: req.body.endpoint, ...data, locale: deviceLocale }, update: { ...data, locale: deviceLocale } });
  res.status(201).json({ ok: true });
});

pushRouter.post("/child/push/unsubscribe", requireChild, validateBody(z.object({ endpoint: z.string().url().max(1000) })), async (req, res) => {
  const { childId } = childSession(req);
  await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, childId } });
  res.json({ ok: true });
});

/**
 * Tâche planifiée (Vercel Cron appelle en GET avec « Authorization: Bearer $CRON_SECRET ») : prévient
 * les enfants dont un relevé est prêt. Sans CRON_SECRET, la route est fermée.
 */
pushRouter.get("/internal/cron/statements", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "CRON_SECRET manquant" });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Non autorisé" });
  res.json(await notifyReadyStatements());
});
