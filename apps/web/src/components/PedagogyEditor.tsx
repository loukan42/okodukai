import { useState } from "react";
import { api, ApiError } from "../lib/api";

export type PedagogyLevel = "AUTO" | "DECOUVERTE" | "APPROFONDI";

const LEVELS: { value: PedagogyLevel; label: string; help: string }[] = [
  { value: "AUTO", label: "Automatique selon l'âge", help: "Découverte pour 8-9 ans, Approfondi pour 10-12 ans." },
  { value: "DECOUVERTE", label: "Découverte", help: "Des mots simples et des jetons : pas de pourcentage, de frais ni d'assurance-vie." },
  { value: "APPROFONDI", label: "Approfondi", help: "Les vrais mots : pourcentages, frais, rendement, verger du temps long." },
];

/**
 * Niveau pédagogique (docs/FINANCIAL_EDUCATION.md §4.1) : prioritaire sur l'âge. Le portefeuille
 * continue sans rupture ; seuls les mots et les fonctionnalités montrées changent.
 */
export function PedagogyEditor({ childId, initial, ageBand }: { childId: string; initial: PedagogyLevel; ageBand: string }) {
  const [level, setLevel] = useState<PedagogyLevel>(initial);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function choose(next: PedagogyLevel) {
    const previous = level;
    setLevel(next);
    setStatus(null);
    try {
      await api.put(`/household/children/${childId}/pedagogy`, { level: next });
      setStatus({ tone: "ok", text: "Niveau enregistré. Il s'applique dès la prochaine ouverture." });
    } catch (err) {
      setLevel(previous);
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : "Le niveau n'a pas été enregistré." });
    }
  }

  return (
    <fieldset className="vault-rule">
      <legend>Niveau pédagogique</legend>
      <p className="money-hint">Âge du profil : {ageBand === "AGE_8_9" ? "8-9 ans" : "10-12 ans"}. Vous pouvez choisir un autre niveau si votre enfant est prêt, ou préfère aller plus doucement.</p>
      <div className="vault-rule-options" role="radiogroup" aria-label="Niveau pédagogique">
        {LEVELS.map((l) => (
          <label key={l.value} className={`vault-rule-option${level === l.value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={`pedagogy-${childId}`} checked={level === l.value} onChange={() => void choose(l.value)} />
            <span>
              <strong>{l.label}</strong>
              <small>{l.help}</small>
            </span>
          </label>
        ))}
      </div>
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
    </fieldset>
  );
}
