import { useEffect, useState } from "react";
import { api } from "../../lib/api";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/**
 * « Me prévenir quand mon relevé est prêt » : proposé seulement si le parent l'a autorisé et si
 * l'appareil sait recevoir des notifications. Le message ne contient jamais de chiffre.
 */
export function StatementAlerts() {
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
        setNote("Les notifications sont bloquées sur cet appareil. Un parent peut les autoriser dans les réglages du navigateur.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key!) });
      const json = sub.toJSON();
      await api.post("/child/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
      setSubscription(sub);
    } catch {
      setNote("Ça n'a pas marché sur cet appareil. Tu verras toujours « Ton bilan est prêt » dans l'observatoire.");
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
          <span>Tu seras prévenu sur cet appareil quand ton relevé sera prêt.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void disable()} disabled={busy}>
            Ne plus me prévenir
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void enable()} disabled={busy}>
          Me prévenir quand mon relevé est prêt
        </button>
      )}
      {note && <p className="money-hint">{note}</p>}
    </div>
  );
}
