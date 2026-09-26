import { useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { intentKey } from "../../lib/money";
import { SUPPORT_ORDER, rendezVousLabel, units, type InvestRun, type SupportCode } from "../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "./Atelier";

const AMOUNTS = [0, 5, 10, 20] as const;
const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };

/**
 * Versements programmés (docs/INVESTMENT_UX.md E11, Approfondi) : un petit montant d'unités école
 * chaque mois simulé, pris dans le capital école fixé par le parent. Versé et valeur restent séparés.
 */
export function Contributions({ run, cap, onChanged }: { run: InvestRun; cap: number; onChanged: () => Promise<void> }) {
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
      setMessage({
        tone: "ok",
        text: amount > 0 ? `À partir du prochain relevé, ${amount} unités seront ajoutées chaque mois simulé, selon cette répartition.` : "Les versements s'arrêteront au prochain relevé. Tes placements continuent d'évoluer.",
      });
      await onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ton choix n'a pas été enregistré. Rien n'a changé." });
    }
  }

  return (
    <section className="support-sheet-block contributions" aria-labelledby="contributions-title">
      <h2 id="contributions-title">Versements programmés</h2>
      <p>Chaque mois simulé, tu peux ajouter des unités école de ton capital. Tu choisis combien et où elles vont.</p>
      <p className="money-hint">
        Capital école pas encore placé : <b>{units(remaining, false)}</b> unités · Versé jusqu'ici : {units(run.contributed, false)}
        {run.monthlyPlan > 0 && ` · En ce moment : ${run.monthlyPlan} unités par mois`}
      </p>
      {remaining <= 0.005 ? (
        <p className="library-note" role="note">
          Tu as placé tout ton capital école : {cap} unités. Les versements s'arrêtent. Tes placements continuent d'évoluer.
        </p>
      ) : !open ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          {run.monthlyPlan > 0 ? "Changer mes versements" : "Programmer des versements"}
        </button>
      ) : (
        <div className="contributions-form">
          <div className="segmented" role="radiogroup" aria-label="Chaque mois">
            {AMOUNTS.map((a) => (
              <label key={a} className={`segmented-option${amount === a ? " segmented-option--on" : ""}`}>
                <input type="radio" name="contribution-amount" checked={amount === a} onChange={() => setAmount(a)} />
                {a === 0 ? "Arrêter" : `${a} unités`}
              </label>
            ))}
          </div>
          {amount !== null && amount > 0 && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...EMPTY_ALLOCATION, ...run.targetAllocation })}>
                Comme ma répartition actuelle
              </button>
              <Atelier young={false} step={run.allocationStep} allowed={run.allowedSupports} risks={RISKS} value={draft} onChange={setDraft} />
            </>
          )}
          <p className="money-hint">Appliqué au prochain relevé, {next}. Un seul changement à la fois.</p>
          <div className="invest-step-actions invest-step-actions--even">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-quest" onClick={() => void save()} disabled={amount === null || (amount > 0 && placed !== 100)}>
              Enregistrer
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
