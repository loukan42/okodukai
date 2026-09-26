import { useState } from "react";
import { api, ApiError } from "../lib/api";

export type PedagogyLevel = "AUTO" | "DECOUVERTE" | "APPROFONDI";

const LEVELS: { value: PedagogyLevel; label: string; help: string }[] = [
  { value: "AUTO", label: "Automatique selon l'âge", help: "Découverte pour moins de 9 ans ; Approfondi dès 9 ans." },
  { value: "DECOUVERTE", label: "Découverte", help: "L'enfant répartit des jetons avec des mots simples. Les pourcentages, les frais et le verger du temps long sont masqués." },
  { value: "APPROFONDI", label: "Approfondi", help: "L'enfant voit les pourcentages, les frais et le rendement. Il peut découvrir le verger du temps long et les versements programmés si vous les autorisez." },
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
      <p className="money-hint">Ce réglage change les mots et les activités de placement proposés à l'enfant. Il ne change ni son solde ni ses pièces gagnées. Âge du profil : {ageBand === "AGE_8_9" ? "moins de 9 ans" : "9 ans ou plus"}. Vous pouvez ajuster le niveau à son rythme.</p>
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
