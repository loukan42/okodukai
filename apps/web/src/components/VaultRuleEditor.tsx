import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { VaultMode } from "../lib/money";

const MODES: { value: VaultMode; label: string; help: string }[] = [
  { value: "FREE", label: "Libre", help: "L'enfant reprend ses pièces quand il veut." },
  { value: "PARENT_APPROVAL", label: "Avec votre accord", help: "Chaque retrait vous est demandé ; vous acceptez ou refusez." },
  { value: "MIN_DAYS", label: "Durée minimale", help: "Chaque dépôt reste au coffre un nombre de jours choisi." },
  { value: "GOAL_ONLY", label: "Objectif atteint", help: "Les pièces se reprennent une fois l'objectif atteint (sans objectif : avec votre accord)." },
];

/** « de Léa », « d'Emma » : élision devant une voyelle. */
function ofName(name: string) {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`;
}

/** Règle de retrait de Mon coffre pour un enfant ; elle s'applique aux dépôts faits ensuite. */
export function VaultRuleEditor({ childId, childName }: { childId: string; childName: string }) {
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
      setStatus({ tone: "ok", text: "Règle enregistrée. Elle s'applique aux pièces déposées à partir de maintenant." });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : "La règle n'a pas été enregistrée. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  const name = `vault-rule-${childId}`;
  return (
    <fieldset className="vault-rule">
      <legend>Coffre magique {ofName(childName)}</legend>
      <p className="money-hint">{childName} peut y garder des pièces pour un objectif. Pour les dépenser dans la boutique, il faut d'abord les reprendre sur son compte. Choisissez ici quand ce retrait est possible.</p>
      <div className="vault-rule-options">
        {MODES.map((m) => (
          <label key={m.value} className={`vault-rule-option${mode === m.value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={name} value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} />
            <span>
              <strong>{m.label}</strong>
              <small>{m.help}</small>
            </span>
          </label>
        ))}
      </div>
      {mode === "MIN_DAYS" && (
        <div className="field vault-rule-days">
          <label htmlFor={`${name}-days`}>Nombre de jours</label>
          <input id={`${name}-days`} type="number" min={1} max={365} value={minDays} onChange={(e) => setMinDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
        </div>
      )}
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!dirty || busy}>
        {busy ? "Enregistrement…" : "Enregistrer la règle"}
      </button>
    </fieldset>
  );
}
