import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { SUPPORTS, SUPPORT_ORDER, TREND_GLYPH, signedPercent, signedUnits, trendOf, units, type InvestRun } from "../../lib/invest";
import { ValueChart } from "../../components/invest/ValueChart";
import { SupportEmblem } from "../../components/invest/SupportEmblem";
import { GameIcon } from "../../components/GameIcon";
import { deName, queName } from "../../lib/french";

interface Overview {
  name: string;
  ageBand: "AGE_8_9" | "AGE_10_12";
  enabled: boolean;
  understanding: { code: string; text: string; state: "PAS_ENCORE" | "DECOUVERT" | "SAIT_EXPLIQUER" }[];
  run: InvestRun | null;
  orchard: InvestRun | null;
  nextTalk: string;
}

const STATE = { PAS_ENCORE: "Pas encore rencontré", DECOUVERT: "Découvert", SAIT_EXPLIQUER: "Sait l'expliquer" };
const DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "numeric" });

/**
 * Placements école d'un enfant, vus par le parent (docs/INVESTMENT_UX.md §20) : ce que l'enfant sait
 * expliquer, son dernier bilan en lecture seule, une idée d'échange. Jamais de comparaison entre enfants.
 */
export function ChildInvestView() {
  const { childId } = useParams<{ childId: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Overview>(`/household/children/${childId}/invest/overview`)
      .then(setData)
      .catch(() => setError(true));
  }, [childId]);

  if (error) return <p className="form-error" role="alert">Cette vue ne s'ouvre pas pour l'instant.</p>;
  if (!data) return <p className="loading-message" role="status">Chargement…</p>;
  const young = data.ageBand === "AGE_8_9";
  const run = data.run;
  const last = run?.lastStatement;

  return (
    <div className="stack parent-manage-page parent-invest">
      <Link to="/parent/enfants" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> Enfants
      </Link>
      <h1 className="parent-form-title">Placements école {deName(data.name)}</h1>
      {!data.enabled && (
        <p className="card">
          Les placements école ne sont pas activés pour {data.name}. <Link to="/parent/enfants">Activer dans les réglages</Link>
        </p>
      )}

      <section className="card" aria-labelledby="understanding-title">
        <h2 id="understanding-title">Ce {queName(data.name)} sait expliquer</h2>
        <ul className="understanding-list">
          {data.understanding.map((u) => (
            <li key={u.code}>
              <span>« {u.text} »</span>
              <span className={`understanding-state understanding-state--${u.state.toLowerCase()}`}>{STATE[u.state]}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-faint">Aucune note ni pourcentage : « Sait l'expliquer » veut dire que {data.name} a répondu juste à la petite vérification de cette idée.</p>
      </section>

      {run && (
        <section className="card" aria-labelledby="last-title">
          <h2 id="last-title">Dernier bilan</h2>
          {run.paused && <p className="money-banner">L'observatoire est en pause.</p>}
          <p>
            {units(run.value, young)} unités école
            {young ? ` (au départ : ${units(run.contributed, true)})` : ` · versé ${units(run.contributed, false)} · performance ${signedPercent(run.performance)}`}
            {run.clock.nextRendezVousAt && ` · prochain relevé : ${DATE.format(new Date(run.clock.nextRendezVousAt))}`}
          </p>
          {last ? (
            <ul className="statement-supports">
              {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005).map((c) => {
                const d = last.bySupportChange[c] ?? 0;
                const t = trendOf(d, run.bySupport[c] - d, young);
                return (
                  <li key={c}>
                    <SupportEmblem code={c} size={20} />
                    <span>{SUPPORTS[c].name}</span>
                    <strong>
                      <span aria-hidden="true">{TREND_GLYPH[t]}</span> {signedUnits(d, young)}
                    </strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-faint">Pas encore de relevé.</p>
          )}
          {!young && run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}
          {run.status === "TERMINEE" && run.scenarioRevealed && <p>Partie terminée : {run.scenarioRevealed}.</p>}
        </section>
      )}

      <section className="card parent-next-talk" aria-labelledby="talk-title">
        <h2 id="talk-title">Pour votre prochain échange</h2>
        <p>{data.nextTalk}</p>
      </section>

      {!young && (
        <section className="card" aria-labelledby="av-title">
          <h2 id="av-title">À propos de l'assurance-vie simulée</h2>
          {data.orchard && <p>Contrat du verger : {units(data.orchard.value, false)} unités école, versé {units(data.orchard.contributed, false)}.</p>}
          <p className="text-sm">
            Dans la réalité, l'assurance-vie sert aussi à transmettre un capital à des bénéficiaires en cas de décès. Nous ne l'abordons pas avec l'enfant ; vous pouvez en parler si vous le souhaitez.
          </p>
        </section>
      )}
    </div>
  );
}
