import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { VaultMode } from "../lib/money";
import { deName } from "../lib/french";
import { defineCopy, useCopy } from "../i18n";

const ORDER: VaultMode[] = ["FREE", "PARENT_APPROVAL", "MIN_DAYS", "GOAL_ONLY"];

const COPY = defineCopy({
  fr: {
    modes: {
      FREE: ["Libre", "L'enfant reprend ses pièces quand il veut."],
      PARENT_APPROVAL: ["Avec votre accord", "Chaque retrait vous est demandé ; vous acceptez ou refusez."],
      MIN_DAYS: ["Durée minimale", "Chaque dépôt reste au coffre un nombre de jours choisi."],
      GOAL_ONLY: ["Objectif atteint", "Les pièces se reprennent une fois l'objectif atteint (sans objectif : avec votre accord)."],
    } as Record<VaultMode, string[]>,
    saved: "Règle enregistrée. Elle s'applique aux pièces déposées à partir de maintenant.",
    notSaved: "La règle n'a pas été enregistrée. Réessayez.",
    legend: (name: string) => `Coffre magique ${deName(name)}`,
    hint: (name: string) => `${name} peut y garder des pièces pour un objectif. Pour les dépenser dans la boutique, il faut d'abord les reprendre sur son compte. Choisissez ici quand ce retrait est possible.`,
    days: "Nombre de jours",
    saving: "Enregistrement…",
    save: "Enregistrer la règle",
  },
  en: {
    modes: {
      FREE: ["Free", "Your child takes coins back whenever they like."],
      PARENT_APPROVAL: ["With your approval", "Each withdrawal comes to you; you accept or decline it."],
      MIN_DAYS: ["Minimum time", "Each deposit stays in the vault for a number of days you choose."],
      GOAL_ONLY: ["Goal reached", "Coins can come out once the goal is reached (with no goal: with your approval)."],
    },
    saved: "Rule saved. It applies to coins put in from now on.",
    notSaved: "The rule wasn't saved. Please try again.",
    legend: (name: string) => `${name}'s Magic Vault`,
    hint: (name: string) => `${name} can keep coins here for a goal. To spend them in the shop, they first have to move them back to their account. Choose when that's allowed.`,
    days: "Number of days",
    saving: "Saving…",
    save: "Save the rule",
  },
});

/** Règle de retrait de Mon coffre pour un enfant ; elle s'applique aux dépôts faits ensuite. */
export function VaultRuleEditor({ childId, childName }: { childId: string; childName: string }) {
  const t = useCopy(COPY);
  const [mode, setMode] = useState<VaultMode>("FREE");
  const [minDays, setMinDays] = useState(7);
  const [saved, setSaved] = useState<{ mode: VaultMode; minDays: number | null } | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ rule: { mode: VaultMode; minDays: number | null } }>(`/household/children/${childId}/vault-rule`)
      .then(({ rule }) => {
        setMode(rule.mode);
        if (rule.minDays) setMinDays(rule.minDays);
        setSaved(rule);
      })
      .catch(() => setSaved({ mode: "FREE", minDays: null }));
  }, [childId]);

  const dirty = saved !== null && (saved.mode !== mode || (mode === "MIN_DAYS" && saved.minDays !== minDays));

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const { rule } = await api.put<{ rule: { mode: VaultMode; minDays: number | null } }>(`/household/children/${childId}/vault-rule`, { mode, minDays: mode === "MIN_DAYS" ? minDays : null });
      setSaved(rule);
      setStatus({ tone: "ok", text: t.saved });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : t.notSaved });
    } finally {
      setBusy(false);
    }
  }

  const name = `vault-rule-${childId}`;
  return (
    <fieldset className="vault-rule">
      <legend>{t.legend(childName)}</legend>
      <p className="money-hint">{t.hint(childName)}</p>
      <div className="vault-rule-options">
        {ORDER.map((value) => (
          <label key={value} className={`vault-rule-option${mode === value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={name} value={value} checked={mode === value} onChange={() => setMode(value)} />
            <span>
              <strong>{t.modes[value][0]}</strong>
              <small>{t.modes[value][1]}</small>
            </span>
          </label>
        ))}
      </div>
      {mode === "MIN_DAYS" && (
        <div className="field vault-rule-days">
          <label htmlFor={`${name}-days`}>{t.days}</label>
          <input id={`${name}-days`} type="number" inputMode="numeric" min={1} max={365} value={minDays} onChange={(e) => setMinDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
        </div>
      )}
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!dirty || busy}>
        {busy ? t.saving : t.save}
      </button>
    </fieldset>
  );
}
