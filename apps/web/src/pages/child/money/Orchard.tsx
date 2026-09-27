import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../../lib/api";
import { intentKey } from "../../../lib/money";
import { SUPPORT_ORDER, TREND_GLYPH, rendezVousLabel, signedPercent, signedUnits, trendOf, units, type InvestRun, type InvestState, type SupportCode } from "../../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "../../../components/invest/Atelier";
import { RiskMeter, SupportEmblem } from "../../../components/invest/SupportEmblem";
import { ValueChart } from "../../../components/invest/ValueChart";
import { XpEarned } from "../../../components/invest/XpEarned";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { ObjectArt } from "../../../art/ObjectArt";
import { defineCopy, useCopy } from "../../../i18n";
import { numberFormatter, percentText } from "../../../i18n/format";

const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };
const RATE = numberFormatter({ maximumFractionDigits: 1 });
const PCT = (rate: number) => percentText(RATE.format(rate * 100));

const COPY = defineCopy({
  fr: {
    labels: {
      SECURISE: "Sécurisé (fonds en euros)",
      PRETER: "Prêter (unité de compte)",
      MONDE: "Panier Monde (unité de compte)",
      ENTREPRISES: "Entreprises (unité de compte)",
    } as Record<SupportCode, string>,
    kicker: "Le verger du temps long",
    title: "Mon contrat école",
    notOpened: "Ton contrat n'a pas été ouvert. Rien n'a changé. Réessaie.",
    newPlace: "Un nouveau lieu est ouvert : le verger du temps long.",
    step: (n: number) => `Étape ${n} sur 3`,
    whatTitle: "C'est quoi, une assurance-vie ?",
    whatText: "Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, tu choisis des supports, comme dans l'observatoire.",
    whatNote: "Dans la vraie vie, c'est un contrat, souvent gardé de nombreuses années. Il peut contenir un « fonds en euros » (qui ressemble à Sécurisé) et des supports qui bougent, appelés « unités de compte ». Rien à voir avec tes unités école !",
    next: "Continuer",
    depositTitle: "Ton versement",
    depositText: (fee: string, toFees: string, placed: string) => `Tu places 100 unités école dans l'enveloppe. Frais sur versement : ${fee}. Sur 100 unités, ${toFees} vont aux frais et ${placed} sont placées.`,
    feesText: (mgmt: string, arb: string) => `Ensuite, le contrat prend ${mgmt} par an de frais de gestion, un peu chaque mois, même quand ça baisse. Changer de répartition coûte ${arb} de ce qui est déplacé.`,
    monthly: "Versements programmés (chaque mois simulé)",
    none: "Aucun",
    unitsN: (n: number) => `${n} unités`,
    notGain: (cap: number) => `Les unités ajoutées ne sont pas un gain : ce sont des versements. Au total, tu ne pourras pas verser plus de ${cap} unités.`,
    back: "Retour",
    split: "Répartir",
    splitTitle: "Ta répartition dans le contrat",
    longTerm: (first: string) => `Ce genre de contrat est souvent pensé pour plusieurs années. Sur une courte durée, tout peut arriver. Premier relevé : ${first}.`,
    open: "Ouvrir mon contrat",
    left: (n: number) => `Il reste ${n} % à placer`,
    seasonUp: "Belle récolte",
    seasonDown: "Un hiver",
    seasonFlat: "Une saison calme",
    noted: (next: string, fee: string) => `C'est noté. L'arbitrage sera appliqué au prochain relevé, ${next}. Des frais de ${fee} seront retirés sur ce qui est déplacé.`,
    notSaved: "Ton arbitrage n'a pas été enregistré.",
    ended: "Ton contrat est arrivé au bout de ses 10 ans simulés.",
    first: (next: string) => `Premier relevé : ${next}. D'ici là, rien ne bouge.`,
    age: (years: number, next: string) => `Ton contrat a ${years} ${years > 1 ? "ans" : "an"} · Prochain relevé : ${next}.`,
    flat: "La valeur de l'enveloppe a très peu bougé.",
    up: (delta: string, pct: string) => `Les placements ont monté : ${delta} (${pct}). Ce qui s'est passé avant ne dit pas ce qui va se passer ensuite.`,
    down: (delta: string, pct: string) => `Les placements ont baissé : ${delta} (${pct}). Ça arrive. Personne ne sait quand ils remonteront.`,
    added: (n: string) => `Tu as aussi versé ${n} unités pendant cette période : ce n'est pas un gain, c'est ce que tu as ajouté.`,
    close: "Fermer le relevé",
    inEnvelope: "unités école dans l'enveloppe",
    paid: "Versé :",
    diff: "Différence :",
    fees: "Frais payés depuis l'ouverture :",
    plan: (n: number) => ` · Versement programmé : ${n} unités par mois simulé`,
    paper: "C'est une valeur sur le papier : elle peut encore changer.",
    share: (v: string, actual: number, target: number) => `${v} unités · ${actual} % (choisi ${target} %)`,
    riskOf: (n: number) => `Niveau de risque ${n} sur 5`,
    pending: (next: string) => `Arbitrage prévu au prochain relevé, ${next}.`,
    endTitle: "Fin du contrat",
    lived: (s: string) => `Tu viens de vivre : ${s}.`,
    endText: (paid: string, value: string, fees: string) => `Versé : ${paid} · Valeur finale : ${value} · Frais payés : ${fees}. Personne ne pouvait savoir à l'avance comment l'histoire allait tourner.`,
    done: "Partie terminée",
    newContract: "Ouvrir un nouveau contrat",
    arbTitle: "Arbitrage",
    arbHint: (fee: string) => `Tu déplaces tes unités d'un support à l'autre, sans les sortir du contrat. Frais : ${fee} de ce qui est déplacé.`,
    keep: "Garder ma répartition",
    saveArb: "Enregistrer l'arbitrage",
    doArb: "Faire un arbitrage",
    backObs: "Retour à l'observatoire",
    failed: "Impossible d'afficher ton contrat pour l'instant.",
    retry: "Réessayer",
    loading: "Le verger s'ouvre…",
    locked: "Le verger s'ouvre après ton premier bilan lu dans l'observatoire.",
    later: "Le verger s'ouvre plus tard dans ton aventure.",
  },
  en: {
    labels: {
      SECURISE: "Safe (guaranteed fund)",
      PRETER: "Lending (unit-linked fund)",
      MONDE: "World basket (unit-linked fund)",
      ENTREPRISES: "Companies (unit-linked fund)",
    },
    kicker: "The long-term orchard",
    title: "My practice contract",
    notOpened: "Your contract wasn't opened. Nothing changed. Try again.",
    newPlace: "A new place is open: the long-term orchard.",
    step: (n: number) => `Step ${n} of 3`,
    whatTitle: "What is life insurance?",
    whatText: "Life insurance is a wrapper for investing over many years. Inside it, you choose holdings, just like in the observatory.",
    whatNote: "In real life, it's a contract that people often keep for many years. It can hold a \"guaranteed fund\" (a lot like Safe) and holdings that move, called \"unit-linked funds\". Nothing to do with your practice units!",
    next: "Continue",
    depositTitle: "Your deposit",
    depositText: (fee: string, toFees: string, placed: string) => `You put 100 practice units into the wrapper. Deposit fee: ${fee}. Out of 100 units, ${toFees} go to fees and ${placed} are invested.`,
    feesText: (mgmt: string, arb: string) => `After that, the contract takes ${mgmt} a year in management fees, a little each month, even when things go down. Changing your split costs ${arb} of whatever you move.`,
    monthly: "Regular deposits (every simulated month)",
    none: "None",
    unitsN: (n: number) => `${n} units`,
    notGain: (cap: number) => `Units you add aren't a gain: they're deposits. In total, you can't pay in more than ${cap} units.`,
    back: "Back",
    split: "Split",
    splitTitle: "Your split inside the contract",
    longTerm: (first: string) => `This kind of contract is usually meant for several years. Over a short time, anything can happen. First statement: ${first}.`,
    open: "Open my contract",
    left: (n: number) => `${n}% left to invest`,
    seasonUp: "A good harvest",
    seasonDown: "A winter",
    seasonFlat: "A quiet season",
    noted: (next: string, fee: string) => `Got it. The switch will apply at the next statement, ${next}. A fee of ${fee} will be taken from whatever you move.`,
    notSaved: "Your switch wasn't saved.",
    ended: "Your contract has reached the end of its 10 simulated years.",
    first: (next: string) => `First statement: ${next}. Until then, nothing moves.`,
    age: (years: number, next: string) => `Your contract is ${years} ${years === 1 ? "year" : "years"} old · Next statement: ${next}.`,
    flat: "The wrapper's value barely moved.",
    up: (delta: string, pct: string) => `The investments went up: ${delta} (${pct}). What happened before doesn't tell you what happens next.`,
    down: (delta: string, pct: string) => `The investments went down: ${delta} (${pct}). It happens. Nobody knows when they'll go back up.`,
    added: (n: string) => `You also paid in ${n} units during this period: that's not a gain, it's what you added.`,
    close: "Close the statement",
    inEnvelope: "practice units in the wrapper",
    paid: "Paid in:",
    diff: "Difference:",
    fees: "Fees paid since opening:",
    plan: (n: number) => ` · Regular deposit: ${n} units per simulated month`,
    paper: "This is a value on paper: it can still change.",
    share: (v: string, actual: number, target: number) => `${v} units · ${actual}% (chosen ${target}%)`,
    riskOf: (n: number) => `Risk level ${n} of 5`,
    pending: (next: string) => `Switch planned for the next statement, ${next}.`,
    endTitle: "End of the contract",
    lived: (s: string) => `What you just went through: ${s}.`,
    endText: (paid: string, value: string, fees: string) => `Paid in: ${paid} · Final value: ${value} · Fees paid: ${fees}. Nobody could know in advance how the story would turn out.`,
    done: "Game finished",
    newContract: "Open a new contract",
    arbTitle: "Switching",
    arbHint: (fee: string) => `You move your units from one holding to another without taking them out of the contract. Fee: ${fee} of whatever you move.`,
    keep: "Keep my split",
    saveArb: "Save the switch",
    doArb: "Switch holdings",
    backObs: "Back to the observatory",
    failed: "We can't show your contract right now.",
    retry: "Try again",
    loading: "Opening the orchard…",
    locked: "The orchard opens after you've read your first report in the observatory.",
    later: "The orchard opens later in your adventure.",
  },
});

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
  const t = useCopy(COPY);
  return (
    <header className="observatory-head orchard-head">
      <ObjectArt name="orchard-tree" size={96} />
      <div>
        <p className="scene-kicker">{t.kicker}</p>
        <h1>{t.title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function OrchardOnboardingFlow({ o, onDone }: { o: OrchardOnboarding; onDone: () => Promise<void> }) {
  const t = useCopy(COPY);
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
      setError(err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.notOpened);
    }
  }

  return (
    <div className="money-page">
      <OrchardHeader subtitle={t.newPlace} />
      <p className="onboarding-count">{t.step(step)}</p>
      {step === 1 && (
        <section className="invest-step">
          <h2>{t.whatTitle}</h2>
          <p>{t.whatText}</p>
          <p className="library-note" role="note">
            {t.whatNote}
          </p>
          <button className="btn btn-quest" onClick={() => setStep(2)}>
            {t.next}
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="invest-step">
          <h2>{t.depositTitle}</h2>
          <p>{t.depositText(PCT(o.fees.entry), units(fee, false), units(100 - fee, false))}</p>
          <p>{t.feesText(PCT(o.fees.managementAnnual), PCT(o.fees.arbitrage))}</p>
          <fieldset className="choice-field">
            <legend>{t.monthly}</legend>
            <div className="segmented" style={{ gridTemplateColumns: `repeat(${o.monthlyChoices.length}, 1fr)` }}>
              {o.monthlyChoices.map((m) => (
                <label key={m} className={`segmented-option${monthly === m ? " segmented-option--on" : ""}`}>
                  <input type="radio" name="orchard-monthly" checked={monthly === m} onChange={() => setMonthly(m)} />
                  {m === 0 ? t.none : t.unitsN(m)}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="money-hint">{t.notGain(o.contributionCap)}</p>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              {t.back}
            </button>
            <button className="btn btn-quest" onClick={() => setStep(3)}>
              {t.split}
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="invest-step">
          <h2>{t.splitTitle}</h2>
          <Atelier young={false} step={5} allowed={SUPPORT_ORDER} risks={RISKS} value={allocation} onChange={setAllocation} />
          <p className="money-hint">{t.longTerm(rendezVousLabel(o.firstRendezVousAt))}</p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              {t.back}
            </button>
            <button className="btn btn-quest" onClick={() => void validate()} disabled={placed !== 100}>
              {placed === 100 ? t.open : t.left(100 - placed)}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function OrchardDashboard({ run, reload }: { run: InvestRun; reload: () => Promise<void> }) {
  const t = useCopy(COPY);
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
  const season = trend === "up" ? t.seasonUp : trend === "down" ? t.seasonDown : t.seasonFlat;

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
      setMessage({ tone: "ok", text: t.noted(next, PCT(run.feeRates.arbitrage)) });
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.notSaved });
    }
  }

  return (
    <div className="money-page">
      <OrchardHeader subtitle={finished ? t.ended : run.clock.rendezVousCount === 0 ? t.first(next) : t.age(run.ageYears, next)} />
      {!(last && run.unseen > 0) && <FinanceTip screen="verger" />}

      {last && run.unseen > 0 && (
        <section className="statement">
          <h2>{season}</h2>
          <p className="statement-main">
            <span aria-hidden="true">{TREND_GLYPH[trend]}</span>{" "}
            {trend === "flat" ? t.flat : trend === "up" ? t.up(signedUnits(delta, false), signedPercent(last.performance)) : t.down(signedUnits(delta, false), signedPercent(last.performance))}
          </p>
          {last.netFlows > 0 && <p>{t.added(units(last.netFlows, false))}</p>}
          <FinanceTip screen="bilan" mode="ASSURANCE_VIE" refreshKey={run.statements.length} />
          <button className="btn btn-primary" onClick={() => void seen()}>
            {t.close}
          </button>
        </section>
      )}

      <section className="observatory-value">
        <p className="observatory-value-number">
          <strong>{units(run.value, false)}</strong> <span>{t.inEnvelope}</span>
        </p>
        <p>
          {t.paid} <b>{units(run.contributed, false)}</b> · {t.diff} <b>{signedUnits(run.value - run.contributed, false)}</b>
        </p>
        <p>
          {t.fees} <b>−{units(run.feesPaid, false)}</b>
          {run.monthlyPlan > 0 && t.plan(run.monthlyPlan)}
        </p>
        <p className="money-hint">{t.paper}</p>
      </section>

      {run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}

      <ul className="observatory-supports">
        {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005 || run.targetAllocation[c] > 0).map((c) => (
          <li key={c}>
            <span className="support-card-emblem">
              <SupportEmblem code={c} size={26} />
            </span>
            <span className="observatory-support-name">
              <strong>{t.labels[c]}</strong>
              <small>{t.share(units(run.bySupport[c], false), Math.round(run.actualAllocation[c]), run.targetAllocation[c])}</small>
            </span>
            <RiskMeter level={run.supportsRisk[c]} label={t.riskOf(run.supportsRisk[c])} />
          </li>
        ))}
      </ul>

      {message && (
        <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {run.pendingOperations > 0 && <p className="money-banner">{t.pending(next)}</p>}
      {finished ? (
        <section className="statement">
          <h2>{t.endTitle}</h2>
          {run.scenarioRevealed && <p className="statement-main">{t.lived(run.scenarioRevealed)}</p>}
          <p>{t.endText(units(run.contributed, false), units(run.value, false), units(run.feesPaid, false))}</p>
          <XpEarned amount={run.completionXp} reason={t.done} />
          <button
            className="btn btn-quest"
            onClick={() => {
              void api.post("/child/invest/new-game", { mode: "ASSURANCE_VIE" }).then(reload);
            }}
          >
            {t.newContract}
          </button>
        </section>
      ) : rebalancing ? (
        <section className="invest-step">
          <h2>{t.arbTitle}</h2>
          <p className="money-hint">{t.arbHint(PCT(run.feeRates.arbitrage))}</p>
          <Atelier young={false} step={5} allowed={SUPPORT_ORDER} risks={RISKS} value={draft} onChange={setDraft} />
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setRebalancing(false)}>
              {t.keep}
            </button>
            <button className="btn btn-quest" onClick={() => void rebalance()} disabled={SUPPORT_ORDER.reduce((s, c) => s + draft[c], 0) !== 100}>
              {t.saveArb}
            </button>
          </div>
        </section>
      ) : (
        run.clock.rendezVousCount > 0 &&
        run.pendingOperations === 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => setRebalancing(true)}>
            {t.doArb}
          </button>
        )
      )}
      <Link to="/enfant/argent/investir" className="btn btn-ghost btn-block">
        {t.backObs}
      </Link>
    </div>
  );
}

/** Le verger du temps long : assurance-vie simulée, 10-12 ans (docs/INSURANCE_LIFE_SIMULATION.md). */
export function Orchard() {
  const t = useCopy(COPY);
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
        <strong>{t.failed}</strong>
        <button className="btn btn-primary" onClick={() => void load()}>
          {t.retry}
        </button>
      </div>
    );
  if (!state) return <p className="loading-message" role="status">{t.loading}</p>;
  if (state.gate === "hidden" || state.gate === "locked")
    return (
      <div className="money-page">
        <OrchardHeader subtitle={state.gate === "locked" ? t.locked : t.later} />
        <Link to="/enfant/argent/investir" className="btn btn-ghost">
          {t.backObs}
        </Link>
      </div>
    );
  if (state.gate === "onboarding") return <OrchardOnboardingFlow o={state} onDone={load} />;
  if (!state.run) return null;
  return <OrchardDashboard run={state.run} reload={load} />;
}
