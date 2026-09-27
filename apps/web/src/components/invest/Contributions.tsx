import { useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { intentKey } from "../../lib/money";
import { SUPPORT_ORDER, rendezVousLabel, units, type InvestRun, type SupportCode } from "../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "./Atelier";
import { defineCopy, useCopy } from "../../i18n";

const AMOUNTS = [0, 5, 10, 20] as const;
const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };

const COPY = defineCopy({
  fr: {
    unit: (funded: boolean) => (funded ? "pièces" : "unités"),
    savedOn: (amount: number, funded: boolean) =>
      `À partir du prochain relevé, ${amount} ${funded ? "pièces seront transférées de ton compte" : "unités seront ajoutées"} chaque mois simulé, selon cette répartition.`,
    savedOff: "Les versements s'arrêteront au prochain relevé. Tes placements continuent d'évoluer.",
    notSaved: "Ton choix n'a pas été enregistré. Rien n'a changé.",
    title: "Versements programmés",
    introFunded: "Chaque mois simulé, le montant choisi sera transféré de ton compte vers tes placements. Si ton solde est insuffisant ce mois-là, le versement sera sauté.",
    introUnits: "Chaque mois simulé, tu peux ajouter des unités école de ton capital. Tu choisis combien et où elles vont.",
    remainingFunded: "Encore possible selon le plafond :",
    remainingUnits: "Capital école pas encore placé :",
    paidSoFar: "Versé jusqu'ici :",
    now: (n: number, funded: boolean) => ` · En ce moment : ${n} ${funded ? "pièces" : "unités"} par mois`,
    capReached: (cap: number, funded: boolean) => `Tu as atteint le plafond de ${cap} ${funded ? "pièces" : "unités"}. Les versements s'arrêtent. Tes placements continuent d'évoluer.`,
    change: "Changer mes versements",
    plan: "Programmer des versements",
    monthly: "Chaque mois",
    stop: "Arrêter",
    sameAsNow: "Comme ma répartition actuelle",
    applied: (next: string) => `Appliqué au prochain relevé, ${next}. Un seul changement à la fois.`,
    cancel: "Annuler",
    save: "Enregistrer",
  },
  en: {
    unit: (funded: boolean) => (funded ? "coins" : "units"),
    savedOn: (amount: number, funded: boolean) =>
      `From the next statement, ${amount} ${funded ? "coins will move from your account" : "units will be added"} every simulated month, using this split.`,
    savedOff: "Deposits will stop at the next statement. Your investments keep moving.",
    notSaved: "Your choice wasn't saved. Nothing has changed.",
    title: "Regular deposits",
    introFunded: "Every simulated month, the amount you choose moves from your account into your investments. If you don't have enough that month, the deposit is skipped.",
    introUnits: "Every simulated month, you can add practice units from your pot. You choose how many and where they go.",
    remainingFunded: "Still allowed under the cap:",
    remainingUnits: "Practice units not invested yet:",
    paidSoFar: "Deposited so far:",
    now: (n: number, funded: boolean) => ` · Right now: ${n} ${funded ? "coins" : "units"} a month`,
    capReached: (cap: number, funded: boolean) => `You've reached the cap of ${cap} ${funded ? "coins" : "units"}. Deposits stop here. Your investments keep moving.`,
    change: "Change my deposits",
    plan: "Set up deposits",
    monthly: "Every month",
    stop: "Stop",
    sameAsNow: "Same as my current split",
    applied: (next: string) => `Applied at the next statement, ${next}. One change at a time.`,
    cancel: "Cancel",
    save: "Save",
  },
});

/**
 * Versements programmés (docs/INVESTMENT_UX.md E11, Approfondi) : un petit montant d'unités école
 * chaque mois simulé, pris dans le capital école fixé par le parent. Versé et valeur restent séparés.
 */
export function Contributions({ run, cap, onChanged }: { run: InvestRun; cap: number; onChanged: () => Promise<void> }) {
  const t = useCopy(COPY);
  const funded = run.fundedAmount !== null;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [draft, setDraft] = useState<Allocation>(EMPTY_ALLOCATION);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const key = useRef(intentKey());
  const remaining = Math.max(0, cap - run.contributed);
  const next = rendezVousLabel(run.clock.nextRendezVousAt);
  const placed = SUPPORT_ORDER.reduce((s, c) => s + draft[c], 0);

  async function save() {
    if (amount === null) return;
    setMessage(null);
    try {
      await api.post("/child/invest/contributions", { amountPerMonth: amount, idempotencyKey: key.current, ...(amount > 0 ? { allocation: draft } : {}) });
      key.current = intentKey();
      setOpen(false);
      setMessage({ tone: "ok", text: amount > 0 ? t.savedOn(amount, funded) : t.savedOff });
      await onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.notSaved });
    }
  }

  return (
    <section className="support-sheet-block contributions" aria-labelledby="contributions-title">
      <h2 id="contributions-title">{t.title}</h2>
      <p>{funded ? t.introFunded : t.introUnits}</p>
      <p className="money-hint">
        {funded ? t.remainingFunded : t.remainingUnits} <b>{units(remaining, false)}</b> {t.unit(funded)} · {t.paidSoFar} {units(run.contributed, false)}
        {run.monthlyPlan > 0 && t.now(run.monthlyPlan, funded)}
      </p>
      {remaining <= 0.005 ? (
        <p className="library-note" role="note">
          {t.capReached(cap, funded)}
        </p>
      ) : !open ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          {run.monthlyPlan > 0 ? t.change : t.plan}
        </button>
      ) : (
        <div className="contributions-form">
          <div className="segmented" role="radiogroup" aria-label={t.monthly}>
            {AMOUNTS.map((a) => (
              <label key={a} className={`segmented-option${amount === a ? " segmented-option--on" : ""}`}>
                <input type="radio" name="contribution-amount" checked={amount === a} onChange={() => setAmount(a)} />
                {a === 0 ? t.stop : `${a} ${t.unit(funded)}`}
              </label>
            ))}
          </div>
          {amount !== null && amount > 0 && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...EMPTY_ALLOCATION, ...run.targetAllocation })}>
                {t.sameAsNow}
              </button>
              <Atelier young={false} step={run.allocationStep} allowed={run.allowedSupports} risks={RISKS} value={draft} onChange={setDraft} />
            </>
          )}
          <p className="money-hint">{t.applied(next)}</p>
          <div className="invest-step-actions invest-step-actions--even">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </button>
            <button type="button" className="btn btn-quest" onClick={() => void save()} disabled={amount === null || (amount > 0 && placed !== 100)}>
              {t.save}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
