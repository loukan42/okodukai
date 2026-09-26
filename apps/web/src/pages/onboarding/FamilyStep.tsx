import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth, type ParentSession } from "../../lib/AuthContext";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { CoinArt } from "../../art/CoinArt";

// Nom provisoire donné au foyer à la création du compte (voir /auth/continue).
const PROVISIONAL_HOUSEHOLD = "Ma famille";

/** Accueil, étape 2 : le prénom du parent et le nom de la famille. */
export function FamilyStep({ session }: { session: ParentSession }) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [parentName, setParentName] = useState(session.user.displayName);
  const [householdName, setHouseholdName] = useState(session.household.name === PROVISIONAL_HOUSEHOLD ? "" : session.household.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.put("/household/profile", { parentName, householdName });
      await refresh();
      navigate("/accueil/enfants");
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 ? err.message : "L'enregistrement n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorldShell emblem={<CoinArt size={96} />}>
      <OnboardingPath current={1} />
      <h1 className="world-title">Votre famille</h1>
      <p className="world-lead">Vos enfants verront ce nom en entrant dans leur espace.</p>
      <form onSubmit={onSubmit} className="world-form">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="family-parent">Votre prénom</label>
          <input id="family-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={40} autoComplete="given-name" required />
        </div>
        <div className="field">
          <label htmlFor="family-name">Nom de la famille</label>
          <input
            id="family-name"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            maxLength={60}
            placeholder="Famille Martin"
            autoComplete="family-name"
            required
          />
        </div>
        <button type="submit" className="btn btn-quest btn-block" disabled={saving}>
          {saving ? "Enregistrement…" : "Continuer"}
        </button>
      </form>
    </WorldShell>
  );
}
