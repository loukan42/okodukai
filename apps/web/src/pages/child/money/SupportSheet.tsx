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
import { defineCopy, useCopy } from "../../../i18n";
import { numberFormatter, percentText } from "../../../i18n/format";

const COPY = defineCopy({
  fr: {
    curve: "Évolution de la valeur de ce support depuis le début de ta partie",
    error: "Cette fiche ne s'ouvre pas pour l'instant.",
    loading: "Ouverture de la fiche…",
    back: "Retour",
    discovered: "Découverte d'un support",
    part: "Ta part",
    none: "Tu n'as pas d'unités ici pour l'instant.",
    placed: (funded: boolean | undefined) => (funded ? "pièces placées" : "unités école"),
    youHave: (n: string, word: string) => `Tu as ${n} ${word} ici.`,
    yourPart: (n: string, word: string, actual: string, target: string) => `Ta part : ${n} ${word} · ${actual} de ton portefeuille (choisi : ${target})`,
    flat: "Depuis le dernier relevé : presque pas bougé.",
    moved: (n: string, up: boolean) => `Depuis le dernier relevé : ${n} de ${up ? "plus" : "moins"}.`,
    sinceOld: (start: string, last: string, pct: string) => `Depuis le départ : ${start} · Dernier relevé : ${last} (${pct})`,
    trail: "Tes 5 derniers relevés sur ce support",
    risk: "Son risque",
    riskOf: (n: number) => `Niveau de risque ${n} sur 5`,
    howLongYoung: "Pour attendre combien de temps ?",
    howLongOld: "Durée de placement recommandée",
    waitYoung: (d: string) => `Pour attendre : ${d}.`,
    waitOld: (d: string) => `${d.charAt(0).toUpperCase()}${d.slice(1)} (dans ce jeu).`,
    noGuarantee: "Attendre longtemps ne garantit rien.",
    fees: "Frais",
    feesText: (rate: string) => `Frais de gestion : ${rate} par an, retirés un peu chaque mois.`,
    real: "Dans la vraie vie",
    realLend: "Dans la vraie vie, on peut prêter de l'argent et le récupérer plus tard.",
    realSafe: "Dans la vraie vie, on peut garder de l'argent à l'abri, où il grandit tout doucement.",
    realShare: "Dans la vraie vie, on peut acheter un petit morceau d'une entreprise.",
  },
  en: {
    curve: "How this holding's value has moved since your game started",
    error: "This page can't open right now.",
    loading: "Opening the page…",
    back: "Back",
    discovered: "Discovered a holding",
    part: "Your share",
    none: "You don't have any units here yet.",
    placed: (funded: boolean | undefined) => (funded ? "coins invested" : "practice units"),
    youHave: (n: string, word: string) => `You have ${n} ${word} here.`,
    yourPart: (n: string, word: string, actual: string, target: string) => `Your share: ${n} ${word} · ${actual} of your portfolio (chosen: ${target})`,
    flat: "Since the last statement: barely moved.",
    moved: (n: string, up: boolean) => `Since the last statement: ${n} ${up ? "more" : "less"}.`,
    sinceOld: (start: string, last: string, pct: string) => `Since the start: ${start} · Last statement: ${last} (${pct})`,
    trail: "Your last 5 statements for this holding",
    risk: "Its risk",
    riskOf: (n: number) => `Risk level ${n} of 5`,
    howLongYoung: "How long should you wait?",
    howLongOld: "Suggested time to stay invested",
    waitYoung: (d: string) => `How long to wait: ${d}.`,
    waitOld: (d: string) => `${d.charAt(0).toUpperCase()}${d.slice(1)} (in this game).`,
    noGuarantee: "Waiting a long time doesn't guarantee anything.",
    fees: "Fees",
    feesText: (rate: string) => `Management fees: ${rate} a year, taken a little each month.`,
    real: "In real life",
    realLend: "In real life, you can lend money and get it back later.",
    realSafe: "In real life, you can keep money somewhere safe, where it grows very slowly.",
    realShare: "In real life, you can buy a small piece of a company.",
  },
});

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

const PCT = numberFormatter({ maximumFractionDigits: 1 });

/** Tracé du support (10-12) : sa valeur de part, base 100, jusqu'au dernier relevé seulement. */
function SupportCurve({ curve, label }: { curve: { step: number; value: number }[]; label: string }) {
  if (curve.length < 2) return null;
  const W = 320, H = 110, P = 8;
  const values = curve.map((p) => p.value);
  const min = Math.min(...values, 100), max = Math.max(...values, 100);
  const x = (i: number) => P + (i / (curve.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = curve.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg className="support-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={P} x2={W - P} y1={y(100)} y2={y(100)} className="support-curve-base" />
      <path d={d} className="support-curve-line" />
    </svg>
  );
}

/** Fiche support (docs/INVESTMENT_UX.md E8) : la part de l'enfant, son évolution, son risque. */
export function SupportSheet() {
  const t = useCopy(COPY);
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

  if (error || !code || !SUPPORTS[code]) return <p className="form-error" role="alert">{t.error}</p>;
  if (!sheet) return <p className="loading-message" role="status">{t.loading}</p>;
  const copy = SUPPORTS[code];
  const back = mode === "ASSURANCE_VIE" ? "/enfant/argent/investir/verger" : "/enfant/argent/investir";
  const lastTrend = trendOf(sheet.lastChange ?? 0, Math.max(0.01, (sheet.units ?? 0) - (sheet.lastChange ?? 0)), young);

  return (
    <div className="money-page support-sheet">
      <Link to={back} className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> {t.back}
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
      <XpEarned amount={sheet.xpAwarded} reason={t.discovered} />

      <section className="support-sheet-block" aria-labelledby="part-title">
        <h2 id="part-title">{t.part}</h2>
        {!sheet.held ? (
          <p>{t.none}</p>
        ) : young ? (
          <p>{t.youHave(units(sheet.units ?? 0, true), t.placed(sheet.funded))}</p>
        ) : (
          <p>{t.yourPart(units(sheet.units ?? 0, false), t.placed(sheet.funded), percentText(PCT.format(sheet.actualPercent ?? 0)), percentText(String(sheet.targetPercent ?? 0)))}</p>
        )}
        {sheet.held && sheet.trail && sheet.trail.length > 0 && (
          <>
            <p className="statement-main">
              <span aria-hidden="true">{TREND_GLYPH[lastTrend]}</span>{" "}
              {young
                ? lastTrend === "flat"
                  ? t.flat
                  : t.moved(units(Math.abs(sheet.lastChange ?? 0), true), lastTrend === "up")
                : t.sinceOld(signedPercent(sheet.sinceStart ?? 0), signedUnits(sheet.lastChange ?? 0, false), signedPercent(sheet.lastPeriod ?? 0))}
            </p>
            {young ? (
              <ol className="support-trail" aria-label={t.trail}>
                {sheet.trail.map((point) => (
                  <li key={point.index}>{units(point.value, true)}</li>
                ))}
              </ol>
            ) : (
              <SupportCurve curve={sheet.curve ?? []} label={t.curve} />
            )}
          </>
        )}
      </section>

      <section className="support-sheet-block" aria-labelledby="risk-title">
        <h2 id="risk-title">{t.risk}</h2>
        <p className="support-sheet-risk">
          <RiskMeter level={sheet.riskLevel} label={t.riskOf(sheet.riskLevel)} />
          <span>{young ? RISK_WORD[sheet.riskLevel] : RISK_SENTENCE[sheet.riskLevel]}</span>
        </p>
        <p className="money-hint">{riskNote()}</p>
        <p>{young ? copy.young : copy.older}</p>
      </section>

      <section className="support-sheet-block support-sheet-duration" aria-labelledby="duration-title">
        <ObjectArt name="hourglass" size={64} />
        <div>
          <h2 id="duration-title">{young ? t.howLongYoung : t.howLongOld}</h2>
          <p>{young ? t.waitYoung(sheet.duration) : t.waitOld(sheet.duration)}</p>
          <p className="money-hint">{t.noGuarantee}</p>
        </div>
      </section>

      {!young && typeof sheet.managementRate === "number" && sheet.managementRate > 0 && (
        <section className="support-sheet-block" aria-labelledby="fees-title">
          <h2 id="fees-title">{t.fees}</h2>
          <p>{t.feesText(percentText(PCT.format(sheet.managementRate * 100)))}</p>
        </section>
      )}

      <section className="support-sheet-block" aria-labelledby="real-title">
        <h2 id="real-title">{t.real}</h2>
        <p>{young ? (code === "PRETER" ? t.realLend : code === "SECURISE" ? t.realSafe : t.realShare) : copy.realLife}</p>
      </section>

      <FinanceTip screen="support" support={code} />
    </div>
  );
}
