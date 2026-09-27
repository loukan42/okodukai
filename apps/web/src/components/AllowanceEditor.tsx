import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { intentKey } from "../lib/money";
import { defineCopy, useCopy } from "../i18n";

interface Allowance {
  amount: number;
  weekday: number;
  active: boolean;
}

/** Montant proposé par défaut : du même ordre qu'une ou deux quêtes (5 à 15 pièces), pas plus. */
const DEFAULT_AMOUNT = 10;

const COPY = defineCopy({
  fr: {
    days: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    savedOn: (day: string, amount: number, name: string) => `Chaque ${day} à 8 h, ${amount} pièces arriveront sur le compte de ${name}.`,
    savedOff: "L'argent de poche automatique est arrêté.",
    notSaved: "Le réglage n'a pas été enregistré. Réessayez.",
    giftSent: (amount: number, name: string) => `Cadeau envoyé : ${amount} pièces sur le compte de ${name}.`,
    giftFailed: "Le cadeau n'a pas été envoyé. Réessayez.",
    legend: "Argent de poche et cadeaux",
    intro: "Choisissez un versement régulier, par exemple 10 pièces chaque semaine. Repère : une quête du quotidien rapporte 5 à 15 pièces. L'argent de poche s'ajoute aux pièces gagnées avec les quêtes.",
    toggle: "Verser de l'argent de poche chaque semaine",
    amount: "Montant",
    coins: "pièces",
    every: "chaque",
    at8: "à 8 h",
    next: "Le prochain versement arrivera le jour choisi à 8 h. Il apparaîtra comme « Argent de poche » dans l'historique. Les semaines passées ne sont pas rattrapées.",
    save: "Enregistrer l'argent de poche",
    giftTitle: "Un cadeau (anniversaire, fête…)",
    giftHint: "Pour ajouter des pièces une seule fois, en plus de l'argent de poche et des quêtes.",
    giftAmount: "Montant du cadeau en pièces",
    giftPlaceholder: "Anniversaire, de Mamie",
    give: (n: number) => `Offrir ${n} pièces`,
  },
  en: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    savedOn: (day: string, amount: number, name: string) => `Every ${day} at 8 am, ${amount} coins will go into ${name}'s account.`,
    savedOff: "Automatic pocket money is switched off.",
    notSaved: "The setting wasn't saved. Please try again.",
    giftSent: (amount: number, name: string) => `Gift sent: ${amount} coins into ${name}'s account.`,
    giftFailed: "The gift wasn't sent. Please try again.",
    legend: "Pocket money and gifts",
    intro: "Choose a regular amount, for example 10 coins a week. As a guide, an everyday quest pays 5 to 15 coins. Pocket money comes on top of the coins earned through quests.",
    toggle: "Pay pocket money every week",
    amount: "Amount",
    coins: "coins",
    every: "every",
    at8: "at 8 am",
    next: "The next payment arrives on the chosen day at 8 am. It shows up as \"Pocket money\" in the history. Past weeks aren't paid retroactively.",
    save: "Save pocket money",
    giftTitle: "A gift (birthday, celebration…)",
    giftHint: "To add coins once, on top of pocket money and quests.",
    giftAmount: "Gift amount in coins",
    giftPlaceholder: "Birthday, from Grandma",
    give: (n: number) => `Give ${n} coins`,
  },
});

/**
 * Argent de poche et cadeaux : des entrées à part dans l'historique de l'enfant (« Argent de poche »,
 * « Cadeau : … »), plutôt que des corrections. L'argent de poche automatique tombe chaque semaine à 8 h.
 */
export function AllowanceEditor({ childId, childName }: { childId: string; childName: string }) {
  const t = useCopy(COPY);
  const [allowance, setAllowance] = useState<Allowance>({ amount: DEFAULT_AMOUNT, weekday: 3, active: false });
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
      setStatus({ tone: "ok", text: allowance.active ? t.savedOn(t.days[allowance.weekday - 1], allowance.amount, childName) : t.savedOff });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : t.notSaved });
    }
  }

  async function sendGift(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post(`/household/children/${childId}/gift`, { amount: giftAmount, reason: giftReason.trim(), idempotencyKey: giftKey.current });
      giftKey.current = intentKey();
      setGiftReason("");
      setStatus({ tone: "ok", text: t.giftSent(giftAmount, childName) });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : t.giftFailed });
    }
  }

  const dirty = JSON.stringify(allowance) !== JSON.stringify(saved);

  return (
    <fieldset className="vault-rule">
      <legend>{t.legend}</legend>
      <p className="money-hint">{t.intro}</p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={allowance.active} onChange={(e) => setAllowance({ ...allowance, active: e.target.checked })} />
        {t.toggle}
      </label>
      {allowance.active && (
        <div className="allowance-row">
          <label>
            {t.amount}
            <input type="number" inputMode="numeric" min={1} max={1000} value={allowance.amount} onChange={(e) => setAllowance({ ...allowance, amount: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} />
            {t.coins}
          </label>
          <label>
            {t.every}
            <select value={allowance.weekday} onChange={(e) => setAllowance({ ...allowance, weekday: Number(e.target.value) })}>
              {t.days.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
            {t.at8}
          </label>
        </div>
      )}
      <p className="money-hint">{t.next}</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveAllowance()} disabled={!dirty}>
        {t.save}
      </button>

      <form className="allowance-gift" onSubmit={sendGift}>
        <label htmlFor={`gift-reason-${childId}`}>{t.giftTitle}</label>
        <p className="money-hint">{t.giftHint}</p>
        <div className="allowance-row">
          <input type="number" inputMode="numeric" min={1} max={100000} value={giftAmount} onChange={(e) => setGiftAmount(Math.max(1, Number(e.target.value) || 1))} aria-label={t.giftAmount} />
          <input id={`gift-reason-${childId}`} value={giftReason} onChange={(e) => setGiftReason(e.target.value)} maxLength={120} placeholder={t.giftPlaceholder} required />
        </div>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={!giftReason.trim()}>
          {t.give(giftAmount)}
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
