import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { intentKey } from "../lib/money";

interface Allowance {
  amount: number;
  weekday: number;
  active: boolean;
}

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/**
 * Argent de poche et cadeaux : des entrées à part dans l'historique de l'enfant (« Argent de poche »,
 * « Cadeau : … »), plutôt que des corrections. L'argent de poche automatique tombe chaque semaine à 8 h.
 */
export function AllowanceEditor({ childId, childName }: { childId: string; childName: string }) {
  const [allowance, setAllowance] = useState<Allowance>({ amount: 500, weekday: 3, active: false });
  const [saved, setSaved] = useState<Allowance | null>(null);
  const [giftAmount, setGiftAmount] = useState(20);
  const [giftReason, setGiftReason] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const giftKey = useRef(intentKey());

  useEffect(() => {
    api
      .get<{ allowance: Allowance | null }>(`/household/children/${childId}/allowance`)
      .then((r) => {
        if (r.allowance) setAllowance(r.allowance);
        setSaved(r.allowance);
      })
      .catch(() => undefined);
  }, [childId]);

  async function saveAllowance() {
    setStatus(null);
    try {
      await api.put(`/household/children/${childId}/allowance`, allowance);
      setSaved(allowance);
      setStatus({
        tone: "ok",
        text: allowance.active ? `Chaque ${DAYS[allowance.weekday - 1]} à 8 h, ${allowance.amount} pièces arriveront sur le compte de ${childName}.` : "L'argent de poche automatique est arrêté.",
      });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : "Le réglage n'a pas été enregistré. Réessayez." });
    }
  }

  async function sendGift(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post(`/household/children/${childId}/gift`, { amount: giftAmount, reason: giftReason.trim(), idempotencyKey: giftKey.current });
      giftKey.current = intentKey();
      setGiftReason("");
      setStatus({ tone: "ok", text: `Cadeau envoyé : ${giftAmount} pièces sur le compte de ${childName}.` });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : "Le cadeau n'a pas été envoyé. Réessayez." });
    }
  }

  const dirty = JSON.stringify(allowance) !== JSON.stringify(saved);

  return (
    <fieldset className="vault-rule">
      <legend>Argent de poche et cadeaux</legend>
      <p className="money-hint">Choisissez un versement régulier, par exemple 500 pièces chaque semaine. Il s'ajoute aux pièces gagnées en réussissant des missions.</p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={allowance.active} onChange={(e) => setAllowance({ ...allowance, active: e.target.checked })} />
        Verser de l'argent de poche chaque semaine
      </label>
      {allowance.active && (
        <div className="allowance-row">
          <label>
            Montant
            <input type="number" min={1} max={1000} value={allowance.amount} onChange={(e) => setAllowance({ ...allowance, amount: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} />
            pièces
          </label>
          <label>
            chaque
            <select value={allowance.weekday} onChange={(e) => setAllowance({ ...allowance, weekday: Number(e.target.value) })}>
              {DAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
            à 8 h
          </label>
        </div>
      )}
      <p className="money-hint">Le prochain versement arrivera le jour choisi à 8 h. Il apparaîtra comme « Argent de poche » dans l'historique. Les semaines passées ne sont pas rattrapées.</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveAllowance()} disabled={!dirty}>
        Enregistrer l'argent de poche
      </button>

      <form className="allowance-gift" onSubmit={sendGift}>
        <label htmlFor={`gift-reason-${childId}`}>Un cadeau (anniversaire, fête…)</label>
        <p className="money-hint">Pour ajouter des pièces une seule fois, indépendamment du versement hebdomadaire et des missions.</p>
        <div className="allowance-row">
          <input type="number" min={1} max={100000} value={giftAmount} onChange={(e) => setGiftAmount(Math.max(1, Number(e.target.value) || 1))} aria-label="Montant du cadeau en pièces" />
          <input id={`gift-reason-${childId}`} value={giftReason} onChange={(e) => setGiftReason(e.target.value)} maxLength={120} placeholder="Anniversaire, de Mamie" required />
        </div>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={!giftReason.trim()}>
          Offrir {giftAmount} pièces
        </button>
      </form>
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
    </fieldset>
  );
}
