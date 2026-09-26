import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { riskNote, RISK_SENTENCE, RISK_WORD, SUPPORTS, TREND_GLYPH, signedPercent, signedUnits, trendOf, units, type SupportCode } from "../../../lib/invest";
import { RiskMeter, SupportEmblem } from "../../../components/invest/SupportEmblem";
import { XpEarned } from "../../../components/invest/XpEarned";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { ObjectArt } from "../../../art/ObjectArt";
import { GameIcon } from "../../../components/GameIcon";

interface Sheet {
  code: SupportCode;
  funded?: boolean;
  riskLevel: number;
  duration: string;
  xpAwarded: number;
  held: boolean;
  units?: number;
  actualPercent?: number;
  targetPercent?: number;
  sinceStart?: number;
  lastPeriod?: number;
  lastChange?: number;
  trail?: { index: number; value: number }[];
  curve?: { step: number; value: number }[];
  managementRate?: number | null;
}

const PCT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Tracé du support (10-12) : sa valeur de part, base 100, jusqu'au dernier relevé seulement. */
function SupportCurve({ curve }: { curve: { step: number; value: number }[] }) {
  if (curve.length < 2) return null;
  const W = 320, H = 110, P = 8;
  const values = curve.map((p) => p.value);
  const min = Math.min(...values, 100), max = Math.max(...values, 100);
  const x = (i: number) => P + (i / (curve.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = curve.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg className="support-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Évolution de la valeur de ce support depuis le début de ta partie">
      <line x1={P} x2={W - P} y1={y(100)} y2={y(100)} className="support-curve-base" />
      <path d={d} className="support-curve-line" />
    </svg>
  );
}

/** Fiche support (docs/INVESTMENT_UX.md E8) : la part de l'enfant, son évolution, son risque. */
export function SupportSheet() {
  const { code } = useParams<{ code: SupportCode }>();
  const [params] = useSearchParams();
  const mode = params.get("mode") === "ASSURANCE_VIE" ? "ASSURANCE_VIE" : "MIROIR";
  const { session } = useAuth();
  const young = session?.kind === "child" && session.child.ageBand === "AGE_8_9";
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Sheet>(`/child/invest/supports/${code}?mode=${mode}`)
      .then(setSheet)
      .catch(() => setError(true));
  }, [code, mode]);

  if (error || !code || !SUPPORTS[code]) return <p className="form-error" role="alert">Cette fiche ne s'ouvre pas pour l'instant.</p>;
  if (!sheet) return <p className="loading-message" role="status">Ouverture de la fiche…</p>;
  const copy = SUPPORTS[code];
  const back = mode === "ASSURANCE_VIE" ? "/enfant/argent/investir/verger" : "/enfant/argent/investir";
  const lastTrend = trendOf(sheet.lastChange ?? 0, Math.max(0.01, (sheet.units ?? 0) - (sheet.lastChange ?? 0)), young);

  return (
    <div className="money-page support-sheet">
      <Link to={back} className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> Retour
      </Link>
      <header className="support-sheet-head">
        <span className="support-card-emblem support-sheet-emblem">
          <SupportEmblem code={code} size={40} />
        </span>
        <div>
          <p className="scene-kicker">{young ? copy.place : copy.realWord}</p>
          <h1>{young ? copy.name : `${copy.name} · ${copy.realWord}`}</h1>
        </div>
      </header>
      <XpEarned amount={sheet.xpAwarded} reason="Découverte d'un support" />

      <section className="support-sheet-block" aria-labelledby="part-title">
        <h2 id="part-title">Ta part</h2>
        {!sheet.held ? (
          <p>Tu n'as pas d'unités ici pour l'instant.</p>
        ) : young ? (
          <p>Tu as {units(sheet.units ?? 0, true)} {sheet.funded ? "pièces placées" : "unités école"} ici.</p>
        ) : (
          <p>
            Ta part : {units(sheet.units ?? 0, false)} {sheet.funded ? "pièces placées" : "unités école"} · {PCT.format(sheet.actualPercent ?? 0)} % de ton portefeuille (choisi : {sheet.targetPercent} %)
          </p>
        )}
        {sheet.held && sheet.trail && sheet.trail.length > 0 && (
          <>
            <p className="statement-main">
              <span aria-hidden="true">{TREND_GLYPH[lastTrend]}</span>{" "}
              {young
                ? lastTrend === "flat"
                  ? "Depuis le dernier relevé : presque pas bougé."
                  : `Depuis le dernier relevé : ${units(Math.abs(sheet.lastChange ?? 0), true)} de ${lastTrend === "up" ? "plus" : "moins"}.`
                : `Depuis le départ : ${signedPercent(sheet.sinceStart ?? 0)} · Dernier relevé : ${signedUnits(sheet.lastChange ?? 0, false)} (${signedPercent(sheet.lastPeriod ?? 0)})`}
            </p>
            {young ? (
              <ol className="support-trail" aria-label="Tes 5 derniers relevés sur ce support">
                {sheet.trail.map((t) => (
                  <li key={t.index}>{units(t.value, true)}</li>
                ))}
              </ol>
            ) : (
              <SupportCurve curve={sheet.curve ?? []} />
            )}
          </>
        )}
      </section>

      <section className="support-sheet-block" aria-labelledby="risk-title">
        <h2 id="risk-title">Son risque</h2>
        <p className="support-sheet-risk">
          <RiskMeter level={sheet.riskLevel} label={`Niveau de risque ${sheet.riskLevel} sur 5`} />
          <span>{young ? RISK_WORD[sheet.riskLevel] : RISK_SENTENCE[sheet.riskLevel]}</span>
        </p>
        <p className="money-hint">{riskNote()}</p>
        <p>{young ? copy.young : copy.older}</p>
      </section>

      <section className="support-sheet-block support-sheet-duration" aria-labelledby="duration-title">
        <ObjectArt name="hourglass" size={64} />
        <div>
          <h2 id="duration-title">{young ? "Pour attendre combien de temps ?" : "Durée de placement recommandée"}</h2>
          <p>{young ? `Pour attendre : ${sheet.duration}.` : `${sheet.duration.charAt(0).toUpperCase()}${sheet.duration.slice(1)} (dans ce jeu).`}</p>
          <p className="money-hint">Attendre longtemps ne garantit rien.</p>
        </div>
      </section>

      {!young && typeof sheet.managementRate === "number" && sheet.managementRate > 0 && (
        <section className="support-sheet-block" aria-labelledby="fees-title">
          <h2 id="fees-title">Frais</h2>
          <p>Frais de gestion : {PCT.format(sheet.managementRate * 100)} % par an, retirés un peu chaque mois.</p>
        </section>
      )}

      <section className="support-sheet-block" aria-labelledby="real-title">
        <h2 id="real-title">Dans la vraie vie</h2>
        <p>{young ? (code === "PRETER" ? "Dans la vraie vie, on peut prêter de l'argent et le récupérer plus tard." : code === "SECURISE" ? "Dans la vraie vie, on peut garder de l'argent à l'abri, où il grandit tout doucement." : "Dans la vraie vie, on peut acheter un petit morceau d'une entreprise.") : copy.realLife}</p>
      </section>

      <FinanceTip screen="support" support={code} />
    </div>
  );
}
