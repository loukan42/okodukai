import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { SUPPORTS, SUPPORT_ORDER, TREND_GLYPH, signedPercent, signedUnits, trendOf, units, type InvestRun, type SupportCode } from "../../lib/invest";
import { SupportEmblem } from "./SupportEmblem";
import { XpEarned } from "./XpEarned";

const RISK_ORDER: SupportCode[] = ["SECURISE", "PRETER", "MONDE", "ENTREPRISES"];

function when(step: number) {
  if (step === 0) return "Au départ";
  const year = Math.floor((step - 1) / 12) + 1;
  return `Année ${year}`;
}

function allocationText(allocation: Record<SupportCode, number> | null, young: boolean) {
  if (!allocation) return "";
  return SUPPORT_ORDER.filter((c) => (allocation[c] ?? 0) > 0)
    .map((c) => `${SUPPORTS[c].name} ${allocation[c]}${young ? "" : " %"}`)
    .join(" · ");
}

/**
 * Bilan final (docs/INVESTMENT_UX.md E16) : clore l'histoire sans note ni regret. Frise des décisions,
 * type d'histoire, en 10-12 « Et avec d'autres choix ? » sur la même échelle, les mots appris.
 * `archived` : consulté depuis « Mes parties » (pas de bouton de nouvelle partie).
 */
export function GameEnd({ run, young, onNewGame, archived = false }: { run: InvestRun; young: boolean; onNewGame?: () => void; archived?: boolean }) {
  const report = run.finalReport;
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<{ chapters: { notions: { word: string; state: string }[] }[] }>("/child/finance/journal")
      .then((j) => setWords(j.chapters.flatMap((c) => c.notions).filter((n) => n.state === "VERIFIEE" || n.state === "EXPLIQUEE").map((n) => n.word)))
      .catch(() => setWords([]));
  }, []);

  if (!report) return null;
  const funded = run.fundedAmount !== null;
  const start = run.series[0]?.value ?? 100;
  const trend = trendOf(run.value - run.contributed, run.contributed, young);
  const scale = report.alternatives ? Math.max(run.value, ...Object.values(report.alternatives)) : run.value;
  const decisions = report.decisions.filter((d) => (d.type !== "VERSEMENT" || d.step === 0) && d.type !== "WALLET_PLAN_SKIP");

  return (
    <section className="statement game-end" aria-labelledby="game-end-title">
      <h2 id="game-end-title">
        Ta partie est terminée : {report.years} années dans la vallée.
      </h2>
      {funded && <p className="money-hint">Tu avais transféré {run.fundedAmount} pièces depuis ton compte. {run.settledAmount === null ? `Ton placement vaut maintenant ${units(run.value, false)} pièces.` : `${run.settledAmount} pièces sont revenues sur ton compte, avec le gain ou la perte de cette partie.`}</p>}
      {young ? (
        <p className="statement-main">
          <span aria-hidden="true">{TREND_GLYPH[trend]}</span> Au départ : {units(start, true)} · À la fin : {units(run.value, true)}
        </p>
      ) : (
        <dl className="game-end-figures">
          <div><dt>Versé</dt><dd>{units(run.contributed, false)}</dd></div>
          <div><dt>Valeur finale</dt><dd>{units(run.value, false)}</dd></div>
          <div><dt>Différence</dt><dd>{signedUnits(run.value - run.contributed, false)}</dd></div>
          <div><dt>Performance</dt><dd>{signedPercent(run.performance)}</dd></div>
          <div><dt>Frais payés</dt><dd>{units(run.feesPaid, false)}</dd></div>
          <div><dt>Liste du marché</dt><dd>100 → {units(report.marketListEnd, false)}</dd></div>
        </dl>
      )}

      <h3>Mes décisions</h3>
      <ol className="game-timeline">
        {decisions.map((d, i) => (
          <li key={`${d.step}-${i}`}>
            <span className="game-timeline-when">{when(d.step)}</span>
            <span>
              {d.type === "VERSEMENT" && `Première répartition : ${allocationText(d.allocation, young)}`}
              {d.type === "ARBITRAGE" && `Changement de répartition : ${allocationText(d.allocation, young)}`}
              {d.type === "VERSEMENTS_PROGRAMMES" && `Versement programmé : ${d.amountPerMonth} unités par mois simulé`}
              {d.type === "WALLET_PLAN" && `Versement programmé : ${d.amountPerMonth} pièces par mois simulé`}
              {d.type === "RETRAIT" && `Retrait de ${d.amount} unités`}
            </span>
          </li>
        ))}
      </ol>

      {run.scenarioRevealed && <p>Ta partie ressemblait à : {run.scenarioRevealed}.</p>}

      {!young && report.alternatives && (
        <>
          <h3>Et avec d'autres choix ?</h3>
          <p className="money-hint">Mêmes versements aux mêmes dates, mais tout sur un seul support et sans changement.</p>
          <ul className="game-alternatives">
            {RISK_ORDER.map((c) => (
              <li key={c}>
                <span className="game-alternatives-name">
                  <SupportEmblem code={c} size={18} /> Tout sur {SUPPORTS[c].name}
                </span>
                <span className="game-alternatives-bar" aria-hidden="true">
                  <i style={{ width: `${(report.alternatives![c] / scale) * 100}%` }} />
                </span>
                <strong>{units(report.alternatives![c], false)}</strong>
              </li>
            ))}
            <li className="game-alternatives-mine">
              <span className="game-alternatives-name">Ta partie</span>
              <span className="game-alternatives-bar" aria-hidden="true">
                <i style={{ width: `${(run.value / scale) * 100}%` }} />
              </span>
              <strong>{units(run.value, false)}</strong>
            </li>
          </ul>
          <p className="library-note" role="note">
            Personne ne pouvait savoir à l'avance comment l'histoire allait tourner. Une autre partie aurait pu donner l'inverse.
          </p>
        </>
      )}

      {words.length > 0 && (
        <>
          <h3>Ce que tu as appris</h3>
          <ul className="carnet-words">
            {words.map((w) => (
              <li key={w} className="is-verified">
                {w}
              </li>
            ))}
          </ul>
        </>
      )}

      <XpEarned amount={run.completionXp} reason="Partie terminée" />
      <div className="game-end-actions">
        {!archived && onNewGame && (
          <button className="btn btn-quest" onClick={onNewGame}>
            Commencer une nouvelle partie
          </button>
        )}
        <Link to="/enfant/argent/investir/parties" className="btn btn-ghost">
          Mes parties
        </Link>
      </div>
    </section>
  );
}
