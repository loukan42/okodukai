import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { defineCopy, getLocale, useCopy } from "../../i18n";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const COPY = defineCopy({
  fr: {
    blocked: "Les notifications sont bloquées sur cet appareil. Un parent peut les autoriser dans les réglages du navigateur.",
    failed: "Ça n'a pas marché sur cet appareil. Tu verras toujours « Ton bilan est prêt » dans l'observatoire.",
    on: "Tu seras prévenu sur cet appareil quand ton relevé sera prêt.",
    off: "Ne plus me prévenir",
    enable: "Me prévenir quand mon relevé est prêt",
  },
  en: {
    blocked: "Notifications are blocked on this device. A parent can allow them in the browser settings.",
    failed: "That didn't work on this device. You'll still see \"Your report is ready\" in the observatory.",
    on: "This device will let you know when your statement is ready.",
    off: "Stop telling me",
    enable: "Tell me when my statement is ready",
  },
});

/**
 * « Me prévenir quand mon relevé est prêt » : proposé seulement si le parent l'a autorisé et si
 * l'appareil sait recevoir des notifications. Le message ne contient jamais de chiffre. La langue
 * de l'appareil est enregistrée avec l'abonnement pour écrire la notification dans la bonne langue.
 */
export function StatementAlerts() {
  const t = useCopy(COPY);
  const [key, setKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!supported()) return;
    api
      .get<{ key: string | null }>("/push/public-key")
      .then((r) => setKey(r.key))
      .catch(() => setKey(null));
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSubscription).catch(() => undefined);
  }, []);

  if (!supported() || !key) return null;

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setNote(t.blocked);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key!) });
      const json = sub.toJSON();
      await api.post("/child/push/subscribe", { endpoint: json.endpoint, keys: json.keys, locale: getLocale() });
      setSubscription(sub);
    } catch {
      setNote(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    await api.post("/child/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
    setSubscription(null);
    setBusy(false);
  }

  return (
    <div className="statement-alerts">
      {subscription ? (
        <>
          <span>{t.on}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void disable()} disabled={busy}>
            {t.off}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void enable()} disabled={busy}>
          {t.enable}
        </button>
      )}
      {note && <p className="money-hint">{note}</p>}
    </div>
  );
}
