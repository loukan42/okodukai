import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { defineCopy, useCopy } from "../i18n";

export type PedagogyLevel = "AUTO" | "DECOUVERTE" | "APPROFONDI";

const ORDER: PedagogyLevel[] = ["AUTO", "DECOUVERTE", "APPROFONDI"];

const COPY = defineCopy({
  fr: {
    levels: {
      AUTO: ["Automatique selon l'âge", "Découverte pour moins de 9 ans ; Approfondi dès 9 ans."],
      DECOUVERTE: ["Découverte", "L'enfant répartit des jetons avec des mots simples. Les pourcentages, les frais et le verger du temps long sont masqués."],
      APPROFONDI: ["Approfondi", "L'enfant voit les pourcentages, les frais et le rendement. Il peut découvrir le verger du temps long et les versements programmés si vous les autorisez."],
    } as Record<PedagogyLevel, string[]>,
    saved: "Niveau enregistré. Il s'applique dès la prochaine ouverture.",
    notSaved: "Le niveau n'a pas été enregistré.",
    legend: "Niveau pédagogique",
    hint: (young: boolean) =>
      `Ce réglage change les mots et les activités de placement proposés à l'enfant. Il ne change ni son solde ni ses pièces gagnées. Âge du profil : ${young ? "moins de 9 ans" : "9 ans ou plus"}. Vous pouvez ajuster le niveau à son rythme.`,
  },
  en: {
    levels: {
      AUTO: ["Automatic, based on age", "Discovery under 9; In depth from 9."],
      DECOUVERTE: ["Discovery", "Your child shares out tokens using simple words. Percentages, fees and the long-term orchard stay hidden."],
      APPROFONDI: ["In depth", "Your child sees percentages, fees and returns. They can try the long-term orchard and regular deposits if you allow them."],
    },
    saved: "Level saved. It applies the next time the app is opened.",
    notSaved: "The level wasn't saved.",
    legend: "Learning level",
    hint: (young: boolean) =>
      `This setting changes the words and investing activities your child sees. It doesn't change their balance or the coins they've earned. Profile age: ${young ? "under 9" : "9 or over"}. You can adjust the level to suit them.`,
  },
});

/**
 * Niveau pédagogique (docs/FINANCIAL_EDUCATION.md §4.1) : prioritaire sur l'âge. Le portefeuille
 * continue sans rupture ; seuls les mots et les fonctionnalités montrées changent.
 */
export function PedagogyEditor({ childId, initial, ageBand }: { childId: string; initial: PedagogyLevel; ageBand: string }) {
  const t = useCopy(COPY);
  const [level, setLevel] = useState<PedagogyLevel>(initial);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function choose(next: PedagogyLevel) {
    const previous = level;
    setLevel(next);
    setStatus(null);
    try {
      await api.put(`/household/children/${childId}/pedagogy`, { level: next });
      setStatus({ tone: "ok", text: t.saved });
    } catch (err) {
      setLevel(previous);
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : t.notSaved });
    }
  }

  return (
    <fieldset className="vault-rule">
      <legend>{t.legend}</legend>
      <p className="money-hint">{t.hint(ageBand === "AGE_8_9")}</p>
      <div className="vault-rule-options" role="radiogroup" aria-label={t.legend}>
        {ORDER.map((value) => (
          <label key={value} className={`vault-rule-option${level === value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={`pedagogy-${childId}`} checked={level === value} onChange={() => void choose(value)} />
            <span>
              <strong>{t.levels[value][0]}</strong>
              <small>{t.levels[value][1]}</small>
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
