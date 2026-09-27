import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { SUPPORTS, SUPPORT_ORDER, TREND_GLYPH, signedPercent, signedUnits, trendOf, units, type InvestRun } from "../../lib/invest";
import { ValueChart } from "../../components/invest/ValueChart";
import { SupportEmblem } from "../../components/invest/SupportEmblem";
import { GameIcon } from "../../components/GameIcon";
import { deName, queName } from "../../lib/french";
import { defineCopy, useCopy } from "../../i18n";
import { dateFormatter } from "../../i18n/format";

interface Overview {
  name: string;
  ageBand: "AGE_8_9" | "AGE_10_12";
  enabled: boolean;
  understanding: { code: string; text: string; state: "PAS_ENCORE" | "DECOUVERT" | "SAIT_EXPLIQUER" }[];
  run: InvestRun | null;
  orchard: InvestRun | null;
  nextTalk: string;
}

const DATE = dateFormatter({ weekday: "long", day: "numeric", month: "long", hour: "numeric" });

const COPY = defineCopy({
  fr: {
    states: { PAS_ENCORE: "Pas encore rencontré", DECOUVERT: "Découvert", SAIT_EXPLIQUER: "Sait l'expliquer" },
    error: "Cette vue ne s'ouvre pas pour l'instant.",
    loading: "Chargement…",
    back: "Enfants",
    title: (name: string) => `Placements ${deName(name)}`,
    off: (name: string) => `Les placements ne sont pas activés pour ${name}.`,
    turnOn: "Activer dans les réglages",
    knows: (name: string) => `Ce ${queName(name)} sait expliquer`,
    quote: (text: string) => `« ${text} »`,
    noScore: (name: string) => `Aucune note ni pourcentage : « Sait l'expliquer » veut dire que ${name} a répondu juste à la petite vérification de cette idée.`,
    last: "Dernier bilan",
    paused: "L'observatoire est en pause.",
    amount: (v: string, units: boolean) => `${v} ${units ? "unités école" : "pièces placées"}`,
    start: (v: string) => ` (au départ : ${v})`,
    paidPerf: (paid: string, perf: string) => ` · versé ${paid} · performance ${perf}`,
    next: (date: string) => ` · prochain relevé : ${date}`,
    none: "Pas encore de relevé.",
    finished: (s: string) => `Partie terminée : ${s}.`,
    talk: "Pour votre prochain échange",
    lifeTitle: "À propos de l'assurance-vie simulée",
    orchard: (v: string, paid: string) => `Contrat du verger : ${v} unités école, versé ${paid}.`,
    lifeNote:
      "Dans la réalité, l'assurance-vie sert aussi à transmettre un capital à des bénéficiaires en cas de décès. Nous ne l'abordons pas avec l'enfant ; vous pouvez en parler si vous le souhaitez.",
  },
  en: {
    states: { PAS_ENCORE: "Not seen yet", DECOUVERT: "Discovered", SAIT_EXPLIQUER: "Can explain it" },
    error: "This view can't open right now.",
    loading: "Loading…",
    back: "Children",
    title: (name: string) => `${name}'s investments`,
    off: (name: string) => `Investing isn't turned on for ${name}.`,
    turnOn: "Turn it on in the settings",
    knows: (name: string) => `What ${name} can explain`,
    quote: (text: string) => `"${text}"`,
    noScore: (name: string) => `No marks and no percentages: "Can explain it" means ${name} answered the quick check on this idea correctly.`,
    last: "Latest report",
    paused: "The observatory is paused.",
    amount: (v: string, units: boolean) => `${v} ${units ? "practice units" : "coins invested"}`,
    start: (v: string) => ` (at the start: ${v})`,
    paidPerf: (paid: string, perf: string) => ` · paid in ${paid} · performance ${perf}`,
    next: (date: string) => ` · next statement: ${date}`,
    none: "No statement yet.",
    finished: (s: string) => `Game finished: ${s}.`,
    talk: "For your next conversation",
    lifeTitle: "About the simulated life insurance",
    orchard: (v: string, paid: string) => `Orchard contract: ${v} practice units, paid in ${paid}.`,
    lifeNote:
      "In real life, life insurance is also used to pass money on to beneficiaries when someone dies. We don't bring this up with your child; you can talk about it if you want to.",
  },
});

/**
 * Placements école d'un enfant, vus par le parent (docs/INVESTMENT_UX.md §20) : ce que l'enfant sait
 * expliquer, son dernier bilan en lecture seule, une idée d'échange. Jamais de comparaison entre enfants.
 */
export function ChildInvestView() {
  const t = useCopy(COPY);
  const { childId } = useParams<{ childId: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Overview>(`/household/children/${childId}/invest/overview`)
      .then(setData)
      .catch(() => setError(true));
  }, [childId]);

  if (error) return <p className="form-error" role="alert">{t.error}</p>;
  if (!data) return <p className="loading-message" role="status">{t.loading}</p>;
  const young = data.ageBand === "AGE_8_9";
  const run = data.run;
  const last = run?.lastStatement;

  return (
    <div className="stack parent-manage-page parent-invest">
      <Link to="/parent/enfants" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> {t.back}
      </Link>
      <h1 className="parent-form-title">{t.title(data.name)}</h1>
      {!data.enabled && (
        <p className="card">
          {t.off(data.name)} <Link to="/parent/enfants">{t.turnOn}</Link>
        </p>
      )}

      <section className="card" aria-labelledby="understanding-title">
        <h2 id="understanding-title">{t.knows(data.name)}</h2>
        <ul className="understanding-list">
          {data.understanding.map((u) => (
            <li key={u.code}>
              <span>{t.quote(u.text)}</span>
              <span className={`understanding-state understanding-state--${u.state.toLowerCase()}`}>{t.states[u.state]}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-faint">{t.noScore(data.name)}</p>
      </section>

      {run && (
        <section className="card" aria-labelledby="last-title">
          <h2 id="last-title">{t.last}</h2>
          {run.paused && <p className="money-banner">{t.paused}</p>}
          <p>
            {t.amount(units(run.value, young), run.fundedAmount === null)}
            {young ? t.start(units(run.contributed, true)) : t.paidPerf(units(run.contributed, false), signedPercent(run.performance))}
            {run.clock.nextRendezVousAt && t.next(DATE.format(new Date(run.clock.nextRendezVousAt)))}
          </p>
          {last ? (
            <ul className="statement-supports">
              {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005).map((c) => {
                const d = last.bySupportChange[c] ?? 0;
                const trend = trendOf(d, run.bySupport[c] - d, young);
                return (
                  <li key={c}>
                    <SupportEmblem code={c} size={20} />
                    <span>{SUPPORTS[c].name}</span>
                    <strong>
                      <span aria-hidden="true">{TREND_GLYPH[trend]}</span> {signedUnits(d, young)}
                    </strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-faint">{t.none}</p>
          )}
          {!young && run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}
          {run.status === "TERMINEE" && run.scenarioRevealed && <p>{t.finished(run.scenarioRevealed)}</p>}
        </section>
      )}

      <section className="card parent-next-talk" aria-labelledby="talk-title">
        <h2 id="talk-title">{t.talk}</h2>
        <p>{data.nextTalk}</p>
      </section>

      {!young && (
        <section className="card" aria-labelledby="av-title">
          <h2 id="av-title">{t.lifeTitle}</h2>
          {data.orchard && <p>{t.orchard(units(data.orchard.value, false), units(data.orchard.contributed, false))}</p>}
          <p className="text-sm">{t.lifeNote}</p>
        </section>
      )}
    </div>
  );
}
