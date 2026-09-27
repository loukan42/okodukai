// Notifications du navigateur (Web Push, clés VAPID). Sans clés configurées, rien n'est envoyé :
// la notification reste visible dans l'app. Voir docs/RESTE_A_FAIRE.md (mise en service).
import webpush from "web-push";
import { prisma } from "./prisma.js";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
export const pushConfigured = Boolean(publicKey && privateKey);
export const vapidPublicKey = pushConfigured ? publicKey! : null;
if (pushConfigured) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://okodukai-gold.vercel.app", publicKey!, privateKey!);

/**
 * Envoie à tous les appareils abonnés de l'enfant, chacun dans sa langue ; un abonnement expiré
 * (404, 410) est retiré.
 */
export async function pushToChild(childId: string, payload: { title: string; body: { fr: string; en: string }; url: string }) {
  if (!pushConfigured) return 0;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { childId } });
  let sent = 0;
  for (const s of subscriptions) {
    const body = s.locale === "en" ? payload.body.en : payload.body.fr;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...payload, body }), { TTL: 6 * 3600 });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
    }
  }
  return sent;
}
