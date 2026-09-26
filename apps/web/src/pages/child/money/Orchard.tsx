import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../../lib/api";
import { intentKey } from "../../../lib/money";
import { SUPPORT_ORDER, TREND_GLYPH, rendezVousLabel, signedPercent, signedUnits, trendOf, units, type InvestRun, type InvestState, type SupportCode } from "../../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "../../../components/invest/Atelier";
import { RiskMeter, SupportEmblem } from "../../../components/invest/SupportEmblem";
import { ValueChart } from "../../../components/invest/ValueChart";
import { XpEarned } from "../../../components/invest/XpEarned";
import { ObjectArt } from "../../../art/ObjectArt";

const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };
const LABEL: Record<SupportCode, string> = {
  SECURISE: "Sécurisé (fonds en euros)",
  PRETER: "Prêter (unité de compte)",
  MONDE: "Panier Monde (unité de compte)",
  ENTREPRISES: "Entreprises (unité de compte)",
};
const PCT = (rate: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(rate * 100)} %`;

interface OrchardOnboarding {
  gate: "onboarding";
  firstRendezVousAt: string;
  fees: { entry: number; managementAnnual: number; arbitrage: number };
  monthlyChoices: number[];
  contributionCap: number;
  horizonMonths: number;
}
type OrchardState = { gate: "hidden" | "locked"; run: null } | ({ run: null } & OrchardOnboarding) | { gate: "open"; run: InvestRun };

function OrchardHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="observatory-head orchard-head">
      <ObjectArt name="coin-sprout" size={96} />
      <div>
        <p className="scene-kicker">Le verger du temps long</p>
        <h1>Mon contrat école</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function OrchardOnboardingFlow({ o, onDone }: { o: OrchardOnboarding; onDone: () => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [monthly, setMonthly] = useState(0);
  const [allocation, setAllocation] = useState<Allocation>(EMPTY_ALLOCATION);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(intentKey());
  const fee = Math.round(100 * o.fees.entry * 100) / 100;
  const placed = SUPPORT_ORDER.reduce((s, c) => s + allocation[c], 0);

  async function validate() {
    setError(null);
    try {
      await api.post("/child/invest/orchard/start", { allocation, monthly, idempotencyKey: key.current });
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ton contrat n'a pas été ouvert. Rien n'a changé. Réessaie.");
    }
  }

  return (
    <div className="money-page">
      <OrchardHeader subtitle="Un nouveau lieu est ouvert : le verger du temps long." />
      <p className="onboarding-count">Étape {step} sur 3</p>
      {step === 1 && (
        <section className="invest-step">
          <h2>C'est quoi, une assurance-vie ?</h2>
          <p>Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, tu choisis des supports, comme dans l'observatoire.</p>
          <p className="library-note" role="note">
            Dans la vraie vie, c'est un contrat, souvent gardé de nombreuses années. Il peut contenir un « fonds en euros » (qui ressemble à Sécurisé) et des supports qui bougent, appelés « unités de compte ». Rien à voir avec tes unités école !
          </p>
          <button className="btn btn-quest" onClick={() => setStep(2)}>
            Continuer
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="invest-step">
          <h2>Ton versement</h2>
          <p>
            Tu places 100 unités école dans l'enveloppe. Frais sur versement : {PCT(o.fees.entry)}. Sur 100 unités, {units(fee, false)} vont aux frais et {units(100 - fee, false)} sont placées.
          </p>
          <p>
            Ensuite, le contrat prend {PCT(o.fees.managementAnnual)} par an de frais de gestion, un peu chaque mois, même quand ça baisse. Changer de répartition coûte {PCT(o.fees.arbitrage)} de ce qui est déplacé.
          </p>
          <fieldset className="choice-field">
            <legend>Versements programmés (chaque mois simulé)</legend>
            <div className="segmented" style={{ gridTemplateColumns: `repeat(${o.monthlyChoices.length}, 1fr)` }}>
              {o.monthlyChoices.map((m) => (
                <label key={m} className={`segmented-option${monthly === m ? " segmented-option--on" : ""}`}>
                  <input type="radio" name="orchard-monthly" checked={monthly === m} onChange={() => setMonthly(m)} />
                  {m === 0 ? "Aucun" : `${m} unités`}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="money-hint">Les unités ajoutées ne sont pas un gain : ce sont des versements. Au total, tu ne pourras pas verser plus de {o.contributionCap} unités.</p>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Retour
            </button>
            <button className="btn btn-quest" onClick={() => setStep(3)}>
              Répartir
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="invest-step">
          <h2>Ta répartition dans le contrat</h2>
          <Atelier young={false} step={5} allowed={SUPPORT_ORDER} risks={RISKS} value={allocation} onChange={setAllocation} />
          <p className="money-hint">Ce genre de contrat est souvent pensé pour plusieurs années. Sur une courte durée, tout peut arriver. Premier relevé : {rendezVousLabel(o.firstRendezVousAt)}.</p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              Retour
            </button>
            <button className="btn btn-quest" onClick={() => void validate()} disabled={placed !== 100}>
              {placed === 100 ? "Ouvrir mon contrat" : `Il reste ${100 - placed} % à placer`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function OrchardDashboard({ run, reload }: { run: InvestRun; reload: () => Promise<void> }) {
  const [rebalancing, setRebalancing] = useState(false);
  const [draft, setDraft] = useState<Allocation>({ ...EMPTY_ALLOCATION, ...run.targetAllocation });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const key = useRef(intentKey());
  const next = rendezVousLabel(run.clock.nextRendezVousAt);
  const finished = run.status === "TERMINEE";
  const last = run.lastStatement;
  // Hors versements : ce qui vient du marché et des frais, pas ce que l'enfant a ajouté.
  const delta = last ? last.marketEffect : 0;
  const trend = last ? trendOf(delta, last.startValue, false) : "flat";
  const season = trend === "up" ? "Belle récolte" : trend === "down" ? "Un hiver" : "Une saison calme";

  async function seen() {
    const s = run.statements[run.statements.length - 1];
    await api.post(`/child/invest/statements/${s.index}/seen?mode=ASSURANCE_VIE`);
    await reload();
  }

  async function rebalance() {
    setMessage(null);
    try {
      await api.post("/child/invest/rebalance", { allocation: draft, idempotencyKey: key.current, mode: "ASSURANCE_VIE" });
      key.current = intentKey();
      setRebalancing(false);
      setMessage({ tone: "ok", text: `C'est noté. L'arbitrage sera appliqué au prochain relevé, ${next}. Des frais de ${PCT(run.feeRates.arbitrage)} seront retirés sur ce qui est déplacé.` });
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ton arbitrage n'a pas été enregistré." });
    }
  }

  return (
    <div className="money-page">
      <OrchardHeader subtitle={finished ? "Ton contrat est arrivé au bout de ses 10 ans simulés." : run.clock.rendezVousCount === 0 ? `Premier relevé : ${next}. D'ici là, rien ne bouge.` : `Ton contrat a ${run.ageYears} ${run.ageYears > 1 ? "ans" : "an"} · Prochain relevé : ${next}.`} />

      {last && run.unseen > 0 && (
        <section className="statement">
          <h2>{season}</h2>
          <p className="statement-main">
            <span aria-hidden="true">{TREND_GLYPH[trend]}</span>{" "}
            {trend === "flat"
              ? "La valeur de l'enveloppe a très peu bougé."
              : trend === "up"
                ? `Les placements ont monté : ${signedUnits(delta, false)} (${signedPercent(last.performance)}). Ce qui s'est passé avant ne dit pas ce qui va se passer ensuite.`
                : `Les placements ont baissé : ${signedUnits(delta, false)} (${signedPercent(last.performance)}). Ça arrive. Personne ne sait quand ils remonteront.`}
          </p>
          {last.netFlows > 0 && <p>Tu as aussi versé {units(last.netFlows, false)} unités pendant cette période : ce n'est pas un gain, c'est ce que tu as ajouté.</p>}
          <button className="btn btn-primary" onClick={() => void seen()}>
            Fermer le relevé
          </button>
        </section>
      )}

      <section className="observatory-value">
        <p className="observatory-value-number">
          <strong>{units(run.value, false)}</strong> <span>unités école dans l'enveloppe</span>
        </p>
        <p>
          Versé : <b>{units(run.contributed, false)}</b> · Différence : <b>{signedUnits(run.value - run.contributed, false)}</b>
        </p>
        <p>
          Frais payés depuis l'ouverture : <b>−{units(run.feesPaid, false)}</b>
          {run.monthlyPlan > 0 && ` · Versement programmé : ${run.monthlyPlan} unités par mois simulé`}
        </p>
        <p className="money-hint">C'est une valeur sur le papier : elle peut encore changer.</p>
      </section>

      {run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}

      <ul className="observatory-supports">
        {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005 || run.targetAllocation[c] > 0).map((c) => (
          <li key={c}>
            <span className="support-card-emblem">
              <SupportEmblem code={c} size={26} />
            </span>
            <span className="observatory-support-name">
              <strong>{LABEL[c]}</strong>
              <small>
                {units(run.bySupport[c], false)} unités · {Math.round(run.actualAllocation[c])} % (choisi {run.targetAllocation[c]} %)
              </small>
            </span>
            <RiskMeter level={run.supportsRisk[c]} label={`Niveau de risque ${run.supportsRisk[c]} sur 5`} />
          </li>
        ))}
      </ul>

      {message && (
        <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {run.pendingOperations > 0 && <p className="money-banner">Arbitrage prévu au prochain relevé, {next}.</p>}
      {finished ? (
        <section className="statement">
          <h2>Fin du contrat</h2>
          {run.scenarioRevealed && <p className="statement-main">Tu viens de vivre : {run.scenarioRevealed}.</p>}
          <p>
            Versé : {units(run.contributed, false)} · Valeur finale : {units(run.value, false)} · Frais payés : {units(run.feesPaid, false)}. Personne ne pouvait savoir à l'avance comment l'histoire allait tourner.
          </p>
          <XpEarned amount={run.completionXp} reason="Partie terminée" />
          <button
            className="btn btn-quest"
            onClick={() => {
              void api.post("/child/invest/new-game", { mode: "ASSURANCE_VIE" }).then(reload);
            }}
          >
            Ouvrir un nouveau contrat
          </button>
        </section>
      ) : rebalancing ? (
        <section className="invest-step">
          <h2>Arbitrage</h2>
          <p className="money-hint">Tu déplaces tes unités d'un support à l'autre, sans les sortir du contrat. Frais : {PCT(run.feeRates.arbitrage)} de ce qui est déplacé.</p>
          <Atelier young={false} step={5} allowed={SUPPORT_ORDER} risks={RISKS} value={draft} onChange={setDraft} />
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setRebalancing(false)}>
              Garder ma répartition
            </button>
            <button className="btn btn-quest" onClick={() => void rebalance()} disabled={SUPPORT_ORDER.reduce((s, c) => s + draft[c], 0) !== 100}>
              Enregistrer l'arbitrage
            </button>
          </div>
        </section>
      ) : (
        run.clock.rendezVousCount > 0 &&
        run.pendingOperations === 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => setRebalancing(true)}>
            Faire un arbitrage
          </button>
        )
      )}
      <Link to="/enfant/argent/investir" className="btn btn-ghost btn-block">
        Retour à l'observatoire
      </Link>
    </div>
  );
}

/** Le verger du temps long : assurance-vie simulée, 10-12 ans (docs/INSURANCE_LIFE_SIMULATION.md). */
export function Orchard() {
  const [state, setState] = useState<OrchardState | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await api.get<InvestState & { orchard: OrchardState }>("/child/invest");
      setState(res.orchard);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed)
    return (
      <div className="empty-state" role="alert">
        <strong>Impossible d'afficher ton contrat pour l'instant.</strong>
        <button className="btn btn-primary" onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  if (!state) return <p className="loading-message" role="status">Le verger s'ouvre…</p>;
  if (state.gate === "hidden" || state.gate === "locked")
    return (
      <div className="money-page">
        <OrchardHeader subtitle={state.gate === "locked" ? "Le verger s'ouvre après ton premier bilan lu dans l'observatoire." : "Le verger s'ouvre plus tard dans ton aventure."} />
        <Link to="/enfant/argent/investir" className="btn btn-ghost">
          Retour à l'observatoire
        </Link>
      </div>
    );
  if (state.gate === "onboarding") return <OrchardOnboardingFlow o={state} onDone={load} />;
  if (!state.run) return null;
  return <OrchardDashboard run={state.run} reload={load} />;
}
