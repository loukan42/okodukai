import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { SUPPORTS, SUPPORT_ORDER, TREND_GLYPH, signedPercent, signedUnits, trendOf, units, type InvestRun, type SupportCode } from "../../lib/invest";
import { SupportEmblem } from "./SupportEmblem";
import { XpEarned } from "./XpEarned";
import { defineCopy, useCopy } from "../../i18n";
import { percentText } from "../../i18n/format";

const RISK_ORDER: SupportCode[] = ["SECURISE", "PRETER", "MONDE", "ENTREPRISES"];

const COPY = defineCopy({
  fr: {
    atStart: "Au départ",
    year: (n: number) => `Année ${n}`,
    title: (years: number) => `Ta partie est terminée : ${years} années dans la vallée.`,
    funded: (n: number) => `Tu avais transféré ${n} pièces depuis ton compte.`,
    worthNow: (v: string) => `Ton placement vaut maintenant ${v} pièces.`,
    settled: (n: number) => `${n} pièces sont revenues sur ton compte, avec le gain ou la perte de cette partie.`,
    startEnd: (a: string, b: string) => `Au départ : ${a} · À la fin : ${b}`,
    paid: "Versé",
    final: "Valeur finale",
    diff: "Différence",
    perf: "Performance",
    fees: "Frais payés",
    marketList: "Liste du marché",
    decisions: "Mes décisions",
    first: (mix: string) => `Première répartition : ${mix}`,
    change: (mix: string) => `Changement de répartition : ${mix}`,
    planUnits: (n: number | null) => `Versement programmé : ${n} unités par mois simulé`,
    planCoins: (n: number | null) => `Versement programmé : ${n} pièces par mois simulé`,
    withdrawal: (n: number | null) => `Retrait de ${n} unités`,
    scenario: (s: string) => `Ta partie ressemblait à : ${s}.`,
    otherChoices: "Et avec d'autres choix ?",
    otherHint: "Mêmes versements aux mêmes dates, mais tout sur un seul support et sans changement.",
    allOn: (name: string) => `Tout sur ${name}`,
    mine: "Ta partie",
    nobody: "Personne ne pouvait savoir à l'avance comment l'histoire allait tourner. Une autre partie aurait pu donner l'inverse.",
    learned: "Ce que tu as appris",
    done: "Partie terminée",
    newGame: "Commencer une nouvelle partie",
    games: "Mes parties",
  },
  en: {
    atStart: "At the start",
    year: (n: number) => `Year ${n}`,
    title: (years: number) => `Your game is over: ${years} years in the valley.`,
    funded: (n: number) => `You had moved ${n} coins from your account.`,
    worthNow: (v: string) => `Your investment is now worth ${v} coins.`,
    settled: (n: number) => `${n} coins went back into your account, with this game's gain or loss.`,
    startEnd: (a: string, b: string) => `At the start: ${a} · At the end: ${b}`,
    paid: "Paid in",
    final: "Final value",
    diff: "Difference",
    perf: "Performance",
    fees: "Fees paid",
    marketList: "Market list",
    decisions: "My decisions",
    first: (mix: string) => `First split: ${mix}`,
    change: (mix: string) => `New split: ${mix}`,
    planUnits: (n: number | null) => `Regular deposit: ${n} units per simulated month`,
    planCoins: (n: number | null) => `Regular deposit: ${n} coins per simulated month`,
    withdrawal: (n: number | null) => `Took out ${n} units`,
    scenario: (s: string) => `Your game looked like: ${s}.`,
    otherChoices: "What about other choices?",
    otherHint: "Same deposits on the same dates, but everything in one holding with no changes.",
    allOn: (name: string) => `All on ${name}`,
    mine: "Your game",
    nobody: "Nobody could know in advance how the story would turn out. Another game could have gone the other way.",
    learned: "What you learned",
    done: "Game finished",
    newGame: "Start a new game",
    games: "My games",
  },
});

function allocationText(allocation: Record<SupportCode, number> | null, young: boolean) {
  if (!allocation) return "";
  return SUPPORT_ORDER.filter((c) => (allocation[c] ?? 0) > 0)
    .map((c) => `${SUPPORTS[c].name} ${young ? allocation[c] : percentText(String(allocation[c]))}`)
    .join(" · ");
}

/**
 * Bilan final (docs/INVESTMENT_UX.md E16) : clore l'histoire sans note ni regret. Frise des décisions,
 * type d'histoire, en 10-12 « Et avec d'autres choix ? » sur la même échelle, les mots appris.
 * `archived` : consulté depuis « Mes parties » (pas de bouton de nouvelle partie).
 */
export function GameEnd({ run, young, onNewGame, archived = false }: { run: InvestRun; young: boolean; onNewGame?: () => void; archived?: boolean }) {
  const t = useCopy(COPY);
  const report = run.finalReport;
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<{ chapters: { notions: { word: string; state: string }[] }[] }>("/child/finance/journal")
      .then((j) => setWords(j.chapters.flatMap((c) => c.notions).filter((n) => n.state === "VERIFIEE" || n.state === "EXPLIQUEE").map((n) => n.word)))
      .catch(() => setWords([]));
  }, []);

  if (!report) return null;
  const when = (step: number) => (step === 0 ? t.atStart : t.year(Math.floor((step - 1) / 12) + 1));
  const funded = run.fundedAmount !== null;
  const start = run.series[0]?.value ?? 100;
  const trend = trendOf(run.value - run.contributed, run.contributed, young);
  const scale = report.alternatives ? Math.max(run.value, ...Object.values(report.alternatives)) : run.value;
  const decisions = report.decisions.filter((d) => (d.type !== "VERSEMENT" || d.step === 0) && d.type !== "WALLET_PLAN_SKIP");

  return (
    <section className="statement game-end" aria-labelledby="game-end-title">
      <h2 id="game-end-title">{t.title(report.years)}</h2>
      {funded && (
        <p className="money-hint">
          {t.funded(run.fundedAmount!)} {run.settledAmount === null ? t.worthNow(units(run.value, false)) : t.settled(run.settledAmount)}
        </p>
      )}

      {young ? (
        <p className="statement-main">
          <span aria-hidden="true">{TREND_GLYPH[trend]}</span> {t.startEnd(units(start, true), units(run.value, true))}
        </p>
      ) : (
        <dl className="game-end-figures">
          <div><dt>{t.paid}</dt><dd>{units(run.contributed, false)}</dd></div>
          <div><dt>{t.final}</dt><dd>{units(run.value, false)}</dd></div>
          <div><dt>{t.diff}</dt><dd>{signedUnits(run.value - run.contributed, false)}</dd></div>
          <div><dt>{t.perf}</dt><dd>{signedPercent(run.performance)}</dd></div>
          <div><dt>{t.fees}</dt><dd>{units(run.feesPaid, false)}</dd></div>
          <div><dt>{t.marketList}</dt><dd>100 → {units(report.marketListEnd, false)}</dd></div>
        </dl>
      )}

      <h3>{t.decisions}</h3>
      <ol className="game-timeline">
        {decisions.map((d, i) => (
          <li key={`${d.step}-${i}`}>
            <span className="game-timeline-when">{when(d.step)}</span>
            <span>
              {d.type === "VERSEMENT" && t.first(allocationText(d.allocation, young))}
              {d.type === "ARBITRAGE" && t.change(allocationText(d.allocation, young))}
              {d.type === "VERSEMENTS_PROGRAMMES" && t.planUnits(d.amountPerMonth)}
              {d.type === "WALLET_PLAN" && t.planCoins(d.amountPerMonth)}
              {d.type === "RETRAIT" && t.withdrawal(d.amount)}
            </span>
          </li>
        ))}
      </ol>

      {run.scenarioRevealed && <p>{t.scenario(run.scenarioRevealed)}</p>}

      {!young && report.alternatives && (
        <>
          <h3>{t.otherChoices}</h3>
          <p className="money-hint">{t.otherHint}</p>
          <ul className="game-alternatives">
            {RISK_ORDER.map((c) => (
              <li key={c}>
                <span className="game-alternatives-name">
                  <SupportEmblem code={c} size={18} /> {t.allOn(SUPPORTS[c].name)}
                </span>
                <span className="game-alternatives-bar" aria-hidden="true">
                  <i style={{ width: `${(report.alternatives![c] / scale) * 100}%` }} />
                </span>
                <strong>{units(report.alternatives![c], false)}</strong>
              </li>
            ))}
            <li className="game-alternatives-mine">
              <span className="game-alternatives-name">{t.mine}</span>
              <span className="game-alternatives-bar" aria-hidden="true">
                <i style={{ width: `${(run.value / scale) * 100}%` }} />
              </span>
              <strong>{units(run.value, false)}</strong>
            </li>
          </ul>
          <p className="library-note" role="note">
            {t.nobody}
          </p>
        </>
      )}

      {words.length > 0 && (
        <>
          <h3>{t.learned}</h3>
          <ul className="carnet-words">
            {words.map((w) => (
              <li key={w} className="is-verified">
                {w}
              </li>
            ))}
          </ul>
        </>
      )}

      <XpEarned amount={run.completionXp} reason={t.done} />

      <div className="game-end-actions">
        {!archived && onNewGame && (
          <button className="btn btn-quest" onClick={onNewGame}>
            {t.newGame}
          </button>
        )}
        <Link to="/enfant/argent/investir/parties" className="btn btn-ghost">
          {t.games}
        </Link>
      </div>
    </section>
  );
}
