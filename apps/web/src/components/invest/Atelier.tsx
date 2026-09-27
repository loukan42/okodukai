import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RISK_DETAIL, RISK_WORD, SUPPORTS, SUPPORT_ORDER, type SupportCode } from "../../lib/invest";
import { RiskMeter, SupportEmblem } from "./SupportEmblem";
import { defineCopy, useCopy } from "../../i18n";
import { percentText } from "../../i18n/format";

export type Allocation = Record<SupportCode, number>;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const EMPTY_ALLOCATION: Allocation = { SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };

const COPY = defineCopy({
  fr: {
    riskOf: (n: number) => `Niveau de risque ${n} sur 5`,
    remove: (young: boolean, step: number, name: string) => (young ? `Retirer 10 parts de ${name}` : `Retirer ${step} % de ${name}`),
    add: (young: boolean, step: number, name: string) => (young ? `Ajouter 10 parts à ${name}` : `Ajouter ${step} % à ${name}`),
    tokens: (v: number) => `${v / 10} ${v / 10 > 1 ? "jetons" : "jeton"} · ${v} parts`,
    gaugeYoung: (placed: number) => `Total : ${placed} sur 100`,
    gaugeOld: (placed: number, left: number) => `Placé : ${placed} %, à placer : ${left} %`,
    totalYoung: (placed: number, left: number) => `Total : ${placed} parts sur 100 · Encore ${left} à répartir`,
    totalOld: (placed: number, left: number) => `Placé : ${placed} % · À placer : ${left} % · Total : 100 %`,
    mixRisk: (n: number) => `Niveau de risque de ta répartition : ${n} sur 5`,
    mixYoung: (word: string) => `Ta répartition : ${word}`,
    fullYoung: "Toutes les parts sont réparties. Retires-en d'un support pour en ajouter ici.",
    fullOld: "Tout est placé. Retire d'abord une part d'un autre support.",
    allInYoung: "Tu mets tout au même endroit. Si cet endroit baisse, tout ton placement baisse. Tu peux garder ce choix.",
    allInOld: "Tu mets 100 % sur un seul support. S'il baisse, tout ton portefeuille baisse avec lui. Répartir sur plusieurs supports s'appelle la diversification. Tu peux garder ce choix.",
    allSafeYoung: "Tout sur Sécurisé : ton placement bougera très peu. Il grandira aussi très lentement. Tu peux garder ce choix.",
    allSafeOld: "100 % Sécurisé : ton portefeuille variera très peu. Il grandira aussi lentement. Tu peux garder ce choix.",
  },
  en: {
    riskOf: (n: number) => `Risk level ${n} of 5`,
    remove: (young: boolean, step: number, name: string) => (young ? `Take 10 parts from ${name}` : `Take ${step}% from ${name}`),
    add: (young: boolean, step: number, name: string) => (young ? `Add 10 parts to ${name}` : `Add ${step}% to ${name}`),
    tokens: (v: number) => `${v / 10} ${v / 10 === 1 ? "token" : "tokens"} · ${v} parts`,
    gaugeYoung: (placed: number) => `Total: ${placed} of 100`,
    gaugeOld: (placed: number, left: number) => `Invested: ${placed}%, left to invest: ${left}%`,
    totalYoung: (placed: number, left: number) => `Total: ${placed} parts of 100 · ${left} left to share out`,
    totalOld: (placed: number, left: number) => `Invested: ${placed}% · Left: ${left}% · Total: 100%`,
    mixRisk: (n: number) => `Risk level of your split: ${n} of 5`,
    mixYoung: (word: string) => `Your split: ${word}`,
    fullYoung: "All the parts are shared out. Take some from another place to add some here.",
    fullOld: "Everything is invested. Take a part out of another holding first.",
    allInYoung: "You're putting everything in one place. If that place goes down, all of your investment goes down. You can keep this choice.",
    allInOld: "You're putting 100% into one holding. If it drops, your whole portfolio drops with it. Spreading across several holdings is called diversification. You can keep this choice.",
    allSafeYoung: "Everything on Safe: your investment will barely move. It will also grow very slowly. You can keep this choice.",
    allSafeOld: "100% Safe: your portfolio will barely move. It will also grow slowly. You can keep this choice.",
  },
});

interface AtelierProps {
  young: boolean;
  step: number;
  allowed: SupportCode[];
  risks: Record<SupportCode, number>;
  value: Allocation;
  onChange: (next: Allocation) => void;
}

/**
 * L'établi de répartition : rien n'est pré-rempli, aucun support n'est conseillé, le total ne
 * peut pas dépasser 100, et une répartition concentrée n'est jamais bloquée (docs/INVESTMENT_UX.md §7).
 */
export function Atelier({ young, step, allowed, risks, value, onChange }: AtelierProps) {
  const t = useCopy(COPY);
  const placed = SUPPORT_ORDER.reduce((sum, c) => sum + value[c], 0);
  const left = 100 - placed;
  const [riskLevel, setRiskLevel] = useState<number | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (placed === 0) {
      setRiskLevel(null);
      return;
    }
    const timer = setTimeout(() => {
      api
        .post<{ riskLevel: number | null }>("/child/invest/risk", { allocation: value })
        .then((r) => setRiskLevel(r.riskLevel))
        .catch(() => setRiskLevel(null));
    }, 180);
    return () => clearTimeout(timer);
  }, [placed, value]);

  function change(code: SupportCode, delta: number) {
    const next = value[code] + delta;
    if (next < 0) return;
    if (delta > 0 && left <= 0) {
      setFull(true);
      return;
    }
    setFull(false);
    onChange({ ...value, [code]: next });
  }

  const only = SUPPORT_ORDER.filter((c) => value[c] > 0);
  const concentrated = placed === 100 && only.length === 1;

  return (
    <div className="atelier">
      <ul className="atelier-rows">
        {SUPPORT_ORDER.filter((c) => allowed.includes(c)).map((code) => {
          const v = value[code];
          const name = SUPPORTS[code].name;
          return (
            <li key={code} className={`atelier-row atelier-row--${code.toLowerCase()}`}>
              <span className="atelier-emblem">
                <SupportEmblem code={code} />
              </span>
              <span className="atelier-name">
                <strong>{name}</strong>
                <RiskMeter level={risks[code]} label={t.riskOf(risks[code])} />
              </span>
              <span className="atelier-controls">
                <button type="button" onClick={() => change(code, -step)} disabled={v <= 0} aria-label={t.remove(young, step, name)}>
                  −
                </button>
                <output>{young ? t.tokens(v) : percentText(String(v))}</output>
                <button type="button" onClick={() => change(code, step)} disabled={left <= 0} aria-label={t.add(young, step, name)}>
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="atelier-gauge" role="img" aria-label={young ? t.gaugeYoung(placed) : t.gaugeOld(placed, left)}>
        {SUPPORT_ORDER.map((code) =>
          value[code] > 0 ? <span key={code} className={`atelier-gauge-part atelier-gauge-part--${code.toLowerCase()}`} style={{ width: `${value[code]}%` }} /> : null
        )}
        {left > 0 && <span className="atelier-gauge-left" style={{ width: `${left}%` }} />}
      </div>
      <p className="atelier-total">{young ? t.totalYoung(placed, left) : t.totalOld(placed, left)}</p>

      {riskLevel !== null && (
        <p className="atelier-risk">
          <RiskMeter level={riskLevel} label={t.mixRisk(riskLevel)} />
          <span>{young ? t.mixYoung(RISK_WORD[riskLevel].toLowerCase()) : `${t.mixRisk(riskLevel)}. ${capitalize(RISK_DETAIL[riskLevel] ?? "")}`}</span>
        </p>
      )}
      {full && <p className="money-hint">{young ? t.fullYoung : t.fullOld}</p>}
      {concentrated && only[0] !== "SECURISE" && (
        <p className="library-note" role="note">
          {young ? t.allInYoung : t.allInOld}
        </p>
      )}
      {concentrated && only[0] === "SECURISE" && (
        <p className="library-note" role="note">
          {young ? t.allSafeYoung : t.allSafeOld}
        </p>
      )}
    </div>
  );
}
