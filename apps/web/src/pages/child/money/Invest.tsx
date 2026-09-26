import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../../lib/api";
import { intentKey } from "../../../lib/money";
import {
  RISK_NOTE,
  RISK_SENTENCE,
  RISK_WORD,
  SUPPORTS,
  SUPPORT_ORDER,
  TREND_GLYPH,
  rendezVousLabel,
  signedPercent,
  signedUnits,
  trendOf,
  trendWords,
  units,
  yearOf,
  type InvestRun,
  type InvestState,
  type SupportCode,
} from "../../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "../../../components/invest/Atelier";
import { RiskMeter, SupportEmblem } from "../../../components/invest/SupportEmblem";
import { ValueChart } from "../../../components/invest/ValueChart";
import { XpEarned } from "../../../components/invest/XpEarned";
import { FinanceQuestion } from "../../../components/finance/FinanceQuestion";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { GameIcon } from "../../../components/GameIcon";
import { GameEnd } from "../../../components/invest/GameEnd";
import { MonthSummary } from "../../../components/money/MonthSummary";
import { StatementAlerts } from "../../../components/invest/StatementAlerts";
import { Contributions } from "../../../components/invest/Contributions";
import { ObjectArt } from "../../../art/ObjectArt";

const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };

/** En-tête de l'observatoire. `lit` : un bilan attend, les lanternes de la vallée s'allument une à une. */
function ObservatoryHeader({ title, subtitle, lit = false }: { title: string; subtitle: string; lit?: boolean }) {
  return (
    <header className="observatory-head">
      <span className={`observatory-lanterns${lit ? " is-lit" : ""}`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <ObjectArt name="coin-sprout" size={96} />
      <div>
        <p className="scene-kicker">L'observatoire</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

/** Onboarding du capital école : 6 étapes, rien de pré-rempli (docs/INVESTMENT_UX.md §5). */
function Onboarding({ state, onDone }: { state: InvestState; onDone: () => Promise<void> }) {
  const young = state.ageBand === "AGE_8_9";
  const allowed = state.allowedSupports ?? SUPPORT_ORDER;
  const [step, setStep] = useState(1);
  const [allocation, setAllocation] = useState<Allocation>(EMPTY_ALLOCATION);
  const [open, setOpen] = useState<SupportCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [checkDone, setCheckDone] = useState(false);
  const key = useRef(intentKey());
  const first = rendezVousLabel(state.firstRendezVousAt);
  const placed = SUPPORT_ORDER.reduce((s, c) => s + allocation[c], 0);

  async function validate() {
    setSending(true);
    setError(null);
    try {
      const res = await api.post<{ xpAwarded?: number }>("/child/invest/start", { allocation, idempotencyKey: key.current });
      setXpAwarded(res.xpAwarded ?? 0);
      setStep(6);
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ta répartition n'a pas été enregistrée. Rien n'a changé. Réessaie.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="money-page">
      <p className="onboarding-count">Étape {step} sur 6</p>
      {step === 1 && (
        <section className="invest-step">
          <h1>Tu as 100 unités école à répartir.</h1>
          <p>{young ? "Ce ne sont pas tes pièces. Elles servent à apprendre. Si elles baissent, tes pièces ne bougent pas." : "Les unités école servent à apprendre à placer. Elles ne s'achètent pas, ne se dépensent pas et ne deviennent jamais des pièces."}</p>
          <div className="study-tokens" aria-label="10 jetons de 10 unités">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="study-token" />
            ))}
          </div>
          <p className="money-hint">{young ? "10 jetons de 10 unités." : "100 unités = 100 %."}</p>
          <button className="btn btn-quest" onClick={() => setStep(2)}>
            D'accord
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="invest-step">
          <h1>Il existe plusieurs types de supports.</h1>
          <p>
            {young
              ? "Un support, c'est un endroit où tu places tes unités. Chacun bouge à sa façon : certains très peu, d'autres beaucoup. Tu en découvres deux pour commencer."
              : "Un support, c'est un type de placement. Chacun a sa façon d'évoluer et son niveau de risque."}
          </p>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Retour
            </button>
            <button className="btn btn-quest" onClick={() => setStep(3)}>
              Voir les supports
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="invest-step">
          <h1>Les supports</h1>
          <p className="money-hint">{RISK_NOTE}</p>
          <ul className="support-cards">
            {SUPPORT_ORDER.filter((c) => allowed.includes(c)).map((code) => (
              <li key={code} className="support-card">
                <button type="button" className="support-card-head" onClick={() => setOpen(open === code ? null : code)} aria-expanded={open === code}>
                  <span className="support-card-emblem">
                    <SupportEmblem code={code} size={30} />
                  </span>
                  <span>
                    <strong>{young ? SUPPORTS[code].name : `${SUPPORTS[code].name} · ${SUPPORTS[code].realWord}`}</strong>
                    <small>{SUPPORTS[code].place}</small>
                  </span>
                  <RiskMeter level={RISKS[code]} label={`Niveau de risque ${RISKS[code]} sur 5`} />
                </button>
                <p>{young ? SUPPORTS[code].young : SUPPORTS[code].older}</p>
                <p className="support-card-risk">{young ? RISK_WORD[RISKS[code]] : RISK_SENTENCE[RISKS[code]]}</p>
                {open === code && <p className="support-card-real">{young ? "Dans la vraie vie, on peut aussi prêter de l'argent, ou acheter un petit morceau d'une entreprise." : SUPPORTS[code].realLife}</p>}
              </li>
            ))}
          </ul>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              Retour
            </button>
            <button className="btn btn-quest" onClick={() => setStep(4)}>
              Répartir mes unités
            </button>
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="invest-step">
          <h1>{young ? "Répartis tes 100 unités." : "Répartis ton capital."}</h1>
          <Atelier young={young} step={state.allocationStep} allowed={allowed} risks={RISKS} value={allocation} onChange={setAllocation} />
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(3)}>
              Retour
            </button>
            <button className="btn btn-quest" onClick={() => setStep(5)} disabled={placed !== 100}>
              {placed === 100 ? "Continuer" : young ? `Place encore ${100 - placed} unités` : `Il reste ${100 - placed} % à placer`}
            </button>
          </div>
        </section>
      )}
      {step === 5 && (
        <section className="invest-step">
          <h1>Ta répartition</h1>
          <ul className="allocation-summary">
            {SUPPORT_ORDER.filter((c) => allocation[c] > 0).map((c) => (
              <li key={c}>
                <SupportEmblem code={c} size={22} />
                <span>{SUPPORTS[c].name}</span>
                <strong>{young ? `${allocation[c]} unités` : `${allocation[c]} % · ${allocation[c]} unités`}</strong>
              </li>
            ))}
          </ul>
          {!young && <p className="library-note" role="note">La façon dont tu répartis ton capital entre les supports s'appelle l'allocation.</p>}
          <p>{young ? `Rien ne bouge avant le premier relevé, ${first}. Tu pourras changer ta répartition lors d'un bilan.` : `Rien ne bouge avant le premier relevé, ${first}. Tu pourras la changer plus tard : cela s'appellera un arbitrage.`}</p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setStep(4)}>
              Modifier
            </button>
            <button className="btn btn-quest" onClick={() => void validate()} disabled={sending}>
              {sending ? "Un instant…" : "Valider ma répartition"}
            </button>
          </div>
        </section>
      )}
      {step === 6 && (
        <section className="invest-step">
          <h1>Ta répartition est enregistrée.</h1>
          <p>Premier relevé : {first}. D'ici là, rien ne bouge.</p>
          <XpEarned amount={xpAwarded} reason="Première répartition" />
          {/* Q04 (INVESTMENT_UX O6) ; si la notion est déjà vérifiée, la phrase seule suffit. */}
          <FinanceQuestion context="onboarding" onEmpty={() => setCheckDone(true)} />
          {checkDone && (
            <p className="library-note" role="note">
              Si ton placement école baisse un jour, tes pièces ne bougent pas : ce sont deux choses séparées.
            </p>
          )}
          <button className="btn btn-quest" onClick={() => void onDone()}>
            Voir l'observatoire
          </button>
        </section>
      )}
    </div>
  );
}

/** Le bilan d'un relevé : ce qui a changé, sans mise en scène (docs/INVESTMENT_UX.md §10). */
function Statement({ run, young, onClose }: { run: InvestRun; young: boolean; onClose: () => Promise<void> }) {
  const last = run.lastStatement!;
  const s = run.statements[run.statements.length - 1];
  const delta = last.endValue - last.startValue;
  const trend = trendOf(delta, last.startValue, young);
  const main =
    trend === "flat"
      ? "Ton placement n'a presque pas bougé cette fois."
      : trend === "up"
        ? `Ton placement a monté cette fois : ${units(Math.abs(delta), young)} de plus. Ça ne veut pas dire qu'il montera toujours.`
        : `Ton placement a baissé cette fois : ${units(Math.abs(delta), young)} de moins. Ce n'est pas une erreur de ta part. Tes pièces n'ont pas bougé.`;
  return (
    <section className="statement" aria-labelledby="statement-title">
      <h2 id="statement-title">
        Ton bilan · Année {yearOf(s.step - 1)}
      </h2>
      {run.unseen > 1 && <p className="money-hint">Depuis ta dernière visite : {run.unseen} relevés. Voici le plus récent ; les autres sont dans ta courbe.</p>}
      <p className="statement-main">
        <span aria-hidden="true">{TREND_GLYPH[trend]}</span> {main}
        {!young && ` (${signedPercent(last.performance)})`}
      </p>
      <ul className="statement-supports">
        {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005).map((c) => {
          const d = last.bySupportChange[c] ?? 0;
          const t = trendOf(d, run.bySupport[c] - d, young);
          return (
            <li key={c}>
              <SupportEmblem code={c} size={22} />
              <span>{SUPPORTS[c].name}</span>
              <strong>
                <span aria-hidden="true">{TREND_GLYPH[t]}</span> {t === "flat" ? "presque pas bougé" : young ? trendWords(t, d, young) : signedUnits(d, young)}
              </strong>
            </li>
          );
        })}
      </ul>
      <MonthSummary />
      <FinanceTip screen="bilan" mode="MIROIR" refreshKey={s.index} />
      <FinanceQuestion key={s.index} context="bilan" mode="MIROIR" />
      <p>Prochain relevé : {run.clock.nextRendezVousAt ? rendezVousLabel(run.clock.nextRendezVousAt) : "la partie est terminée"}. Rien ne bouge d'ici là.</p>
      <button className="btn btn-primary" onClick={() => void onClose()}>
        Fermer le bilan
      </button>
    </section>
  );
}

function Observatory({ state, reload }: { state: InvestState; reload: () => Promise<void> }) {
  const run = state.run!;
  const young = state.ageBand === "AGE_8_9";
  const [showStatement, setShowStatement] = useState(run.unseen > 0);
  const [rebalancing, setRebalancing] = useState(false);
  const [draft, setDraft] = useState<Allocation>({ ...EMPTY_ALLOCATION, ...run.targetAllocation });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const key = useRef(intentKey());
  const next = rendezVousLabel(run.clock.nextRendezVousAt);
  const finished = run.status === "TERMINEE";
  const sinceStart = run.value - run.contributed;
  const startTrend = trendOf(sinceStart, run.contributed, young);
  const lastDelta = run.lastStatement ? run.lastStatement.endValue - run.lastStatement.startValue : 0;
  const lastTrend = trendOf(lastDelta, run.lastStatement?.startValue ?? 100, young);
  const recent = run.statements.slice(-5);

  async function closeStatement() {
    const last = run.statements[run.statements.length - 1];
    await api.post(`/child/invest/statements/${last.index}/seen`);
    setShowStatement(false);
    await reload();
  }

  async function rebalance() {
    setMessage(null);
    try {
      await api.post("/child/invest/rebalance", { allocation: draft, idempotencyKey: key.current });
      key.current = intentKey();
      setRebalancing(false);
      setMessage({ tone: "ok", text: `C'est noté. Ton changement sera appliqué au prochain relevé, ${next}.` });
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ton changement n'a pas été enregistré. Rien n'a changé." });
    }
  }

  async function newGame() {
    await api.post("/child/invest/new-game");
    await reload();
  }

  return (
    <div className="money-page">
      <ObservatoryHeader
        title="Mes placements école"
        lit={run.unseen > 0}
        subtitle={
          finished
            ? "Ta partie est terminée."
            : run.paused
              ? "L'observatoire est en pause. Rien ne bouge jusqu'à la reprise."
              : run.clock.rendezVousCount === 0
              ? `Ta répartition est prête. Le premier relevé aura lieu ${next}. D'ici là, rien ne bouge.`
              : `Année ${yearOf(run.clock.revealedSteps - 1)} ${young ? "de ta partie" : `sur ${Math.ceil(run.horizonMonths / 12)}`} · Prochain relevé : ${next}. Rien ne bouge d'ici là.`
        }
      />

      {showStatement && run.lastStatement && run.unseen > 0 && <Statement run={run} young={young} onClose={closeStatement} />}
      {!showStatement && run.unseen > 0 && (
        <button className="money-banner money-banner--button" onClick={() => setShowStatement(true)}>
          Ton bilan est prêt.
        </button>
      )}

      <section className="observatory-value" aria-label="Valeur de mes placements école">
        <p className="observatory-value-number">
          <strong>{units(run.value, young)}</strong> <span>unités école</span>
        </p>
        {young ? (
          <p>
            Au départ : {units(run.contributed, young)} · Maintenant : {units(run.value, young)} ·{" "}
            <b>
              <span aria-hidden="true">{TREND_GLYPH[startTrend]}</span> {startTrend === "flat" ? "Pareil" : trendWords(startTrend, sinceStart, young)}
            </b>
          </p>
        ) : (
          <p>
            Depuis le départ : <b>{signedUnits(sinceStart, young)}</b> ({signedPercent(run.performance)})
          </p>
        )}
        {run.lastStatement && (
          <p>
            Depuis le dernier relevé :{" "}
            <b>
              <span aria-hidden="true">{TREND_GLYPH[lastTrend]}</span> {lastTrend === "flat" ? "presque pas bougé" : young ? trendWords(lastTrend, lastDelta, young) : signedUnits(lastDelta, young)}
            </b>
          </p>
        )}
        <p className="observatory-risk">
          <RiskMeter level={run.riskLevel} label={`Niveau de risque de ta répartition : ${run.riskLevel} sur 5`} />
          {young ? `Ta répartition : ${RISK_WORD[run.riskLevel].toLowerCase()}` : `Niveau de risque de ta répartition : ${run.riskLevel} sur 5`}
        </p>
      </section>

      {!young && run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}
      {young && recent.length > 0 && (
        <p className="observatory-trail" aria-label="Les derniers relevés">
          {[{ value: run.contributed }, ...recent].map((s, i, all) => {
            const prev = i > 0 ? all[i - 1].value : null;
            const t = prev === null ? null : trendOf(s.value - prev, prev, true);
            return (
              <span key={i}>
                {i > 0 && " → "}
                {units(s.value, true)}
                {t && <span aria-hidden="true"> {TREND_GLYPH[t]}</span>}
              </span>
            );
          })}
        </p>
      )}

      <section aria-labelledby="supports-title">
        <div className="section-heading">
          <h2 id="supports-title">Mes supports</h2>
        </div>
        <ul className="observatory-supports">
          {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005 || run.targetAllocation[c] > 0).map((c) => (
            <li key={c}>
              <Link to={`/enfant/argent/investir/support/${c}`} className="observatory-support-link">
                <span className="support-card-emblem">
                  <SupportEmblem code={c} size={26} />
                </span>
                <span className="observatory-support-name">
                  <strong>{SUPPORTS[c].name}</strong>
                  <small>{young ? `${units(run.bySupport[c], true)} unités` : `${units(run.bySupport[c], false)} unités · ${Math.round(run.actualAllocation[c])} % (choisi ${run.targetAllocation[c]} %)`}</small>
                </span>
                <RiskMeter level={run.supportsRisk[c]} label={`Niveau de risque ${run.supportsRisk[c]} sur 5`} />
                <GameIcon name="arrow" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {message && (
        <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {run.pendingOperations > 0 && <p className="money-banner">Changement de répartition prévu au prochain relevé, {next}.</p>}

      {finished ? (
        <GameEnd run={run} young={young} onNewGame={() => void newGame()} />
      ) : rebalancing ? (
        <section className="invest-step">
          <h2>Changer ma répartition</h2>
          <p className="money-hint">Le changement sera appliqué au prochain relevé, à la valeur de ce relevé. Tu n'es pas obligé de changer.</p>
          <Atelier young={young} step={run.allocationStep} allowed={run.allowedSupports} risks={RISKS} value={draft} onChange={setDraft} />
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setRebalancing(false)}>
              Garder ma répartition
            </button>
            <button className="btn btn-quest" onClick={() => void rebalance()} disabled={SUPPORT_ORDER.reduce((s, c) => s + draft[c], 0) !== 100}>
              Enregistrer le changement
            </button>
          </div>
        </section>
      ) : (
        run.clock.rendezVousCount > 0 &&
        run.pendingOperations === 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => setRebalancing(true)}>
            Changer ma répartition
          </button>
        )
      )}

      {!finished && state.settings.notifyStatement && <StatementAlerts />}

      {!finished && !young && !run.paused && state.settings.contributionsEnabled && run.clock.rendezVousCount > 0 && (
        <Contributions run={run} cap={run.contributionCap ?? state.settings.contributionCap} onChanged={reload} />
      )}

      {state.orchard && state.orchard.gate !== "hidden" && (
        <Link to="/enfant/argent/investir/verger" className={`home-callout${state.orchard.gate === "locked" ? " home-callout--locked" : ""}`}>
          <ObjectArt name="hourglass" size={64} />
          <span>
            <strong>Le verger du temps long</strong>
            <small>
              {state.orchard.gate === "locked"
                ? "S'ouvre après ton premier bilan lu."
                : state.orchard.gate === "onboarding"
                  ? "Un nouveau lieu est ouvert : un contrat pour placer sur de longues années."
                  : `Mon contrat école : ${units(state.orchard.run!.value, false)} unités.`}
            </small>
          </span>
        </Link>
      )}

      <Link to="/enfant/argent/investir/bibliotheque" className="home-callout">
        <ObjectArt name="quest-scroll" size={64} />
        <span>
          <strong>La bibliothèque</strong>
          <small>Des histoires courtes pour comprendre l'argent.</small>
        </span>
      </Link>
    </div>
  );
}

/** Onglet Investir : porte, onboarding, puis l'observatoire. */
export function Invest() {
  const [state, setState] = useState<InvestState | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      setState(await api.get<InvestState>("/child/invest"));
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
        <strong>Impossible d'afficher tes placements pour l'instant.</strong>
        <p>Tes unités école n'ont pas bougé.</p>
        <button className="btn btn-primary" onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  if (!state) return <p className="loading-message" role="status">L'observatoire s'ouvre…</p>;

  if (state.gate === "disabled")
    return (
      <div className="money-page">
        <ObservatoryHeader title="Mes placements école" subtitle="Mes placements école ne sont pas ouverts pour l'instant. Tes parents peuvent les activer." />
      </div>
    );
  if (state.gate === "locked")
    return (
      <div className="money-page">
        <ObservatoryHeader title="L'observatoire est fermé" subtitle="L'observatoire s'ouvre quand tu as mis des pièces dans Mon coffre au moins une fois." />
        <p className="money-hint">Dépôts dans Mon coffre : 0 sur 1</p>
        <Link to="/enfant/argent/coffre" className="btn btn-quest">
          Mettre de côté
        </Link>
      </div>
    );
  if (state.gate === "onboarding") return <Onboarding state={state} onDone={load} />;
  return <Observatory state={state} reload={load} />;
}
