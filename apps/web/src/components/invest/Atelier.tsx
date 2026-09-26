import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RISK_SENTENCE, RISK_WORD, SUPPORTS, SUPPORT_ORDER, type SupportCode } from "../../lib/invest";
import { RiskMeter, SupportEmblem } from "./SupportEmblem";

export type Allocation = Record<SupportCode, number>;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const EMPTY_ALLOCATION: Allocation = { SECURISE: 0, PRETER: 0, MONDE: 0, ENTREPRISES: 0 };

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
  const placed = SUPPORT_ORDER.reduce((sum, c) => sum + value[c], 0);
  const left = 100 - placed;
  const [riskLevel, setRiskLevel] = useState<number | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (placed === 0) {
      setRiskLevel(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .post<{ riskLevel: number | null }>("/child/invest/risk", { allocation: value })
        .then((r) => setRiskLevel(r.riskLevel))
        .catch(() => setRiskLevel(null));
    }, 180);
    return () => clearTimeout(t);
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
                <RiskMeter level={risks[code]} label={`Niveau de risque ${risks[code]} sur 5`} />
              </span>
              <span className="atelier-controls">
                <button type="button" onClick={() => change(code, -step)} disabled={v <= 0} aria-label={young ? `Retirer 10 parts de ${name}` : `Retirer ${step} % de ${name}`}>
                  −
                </button>
                <output>{young ? `${v / 10} ${v / 10 > 1 ? "jetons" : "jeton"} · ${v} parts` : `${v} %`}</output>
                <button type="button" onClick={() => change(code, step)} disabled={left <= 0} aria-label={young ? `Ajouter 10 parts à ${name}` : `Ajouter ${step} % à ${name}`}>
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="atelier-gauge" role="img" aria-label={young ? `Total : ${placed} sur 100` : `Placé : ${placed} %, à placer : ${left} %`}>
        {SUPPORT_ORDER.map((code) =>
          value[code] > 0 ? <span key={code} className={`atelier-gauge-part atelier-gauge-part--${code.toLowerCase()}`} style={{ width: `${value[code]}%` }} /> : null
        )}
        {left > 0 && <span className="atelier-gauge-left" style={{ width: `${left}%` }} />}
      </div>
      <p className="atelier-total">{young ? `Total : ${placed} parts sur 100 · Encore ${left} à répartir` : `Placé : ${placed} % · À placer : ${left} % · Total : 100 %`}</p>

      {riskLevel !== null && (
        <p className="atelier-risk">
          <RiskMeter level={riskLevel} label={`Niveau de risque de ta répartition : ${riskLevel} sur 5`} />
          <span>{young ? `Ta répartition : ${RISK_WORD[riskLevel].toLowerCase()}` : `Niveau de risque de ta répartition : ${riskLevel} sur 5. ${capitalize(RISK_SENTENCE[riskLevel].split(" : ")[1] ?? "")}`}</span>
        </p>
      )}
      {full && <p className="money-hint">{young ? "Toutes les parts sont réparties. Retires-en d'un support pour en ajouter ici." : "Tout est placé. Retire d'abord une part d'un autre support."}</p>}
      {concentrated && only[0] !== "SECURISE" && (
        <p className="library-note" role="note">
          {young
            ? "Tu mets tout au même endroit. Si cet endroit baisse, tout ton placement baisse. Tu peux garder ce choix."
            : "Tu mets 100 % sur un seul support. S'il baisse, tout ton portefeuille baisse avec lui. Répartir sur plusieurs supports s'appelle la diversification. Tu peux garder ce choix."}
        </p>
      )}
      {concentrated && only[0] === "SECURISE" && (
        <p className="library-note" role="note">
          {young
            ? "Tout sur Sécurisé : ton placement bougera très peu. Il grandira aussi très lentement. Tu peux garder ce choix."
            : "100 % Sécurisé : ton portefeuille variera très peu. Il grandira aussi lentement. Tu peux garder ce choix."}
        </p>
      )}
    </div>
  );
}
