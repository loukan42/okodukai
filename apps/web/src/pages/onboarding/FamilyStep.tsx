import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth, type ParentSession } from "../../lib/AuthContext";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { CoinArt } from "../../art/CoinArt";
import { defineCopy, useCopy } from "../../i18n";

// Noms provisoires donnés au foyer à la création du compte, selon la langue (voir /auth/continue).
const PROVISIONAL_HOUSEHOLD = ["Ma famille", "My family"];

const COPY = defineCopy({
  fr: {
    failed: "L'enregistrement n'a pas abouti. Réessayez dans un instant.",
    title: "Votre famille",
    lead: "Vos enfants verront ce nom en entrant dans leur espace.",
    parent: "Votre prénom",
    family: "Nom de la famille",
    placeholder: "Famille Martin",
    saving: "Enregistrement…",
    next: "Continuer",
  },
  en: {
    failed: "We couldn't save that. Try again in a moment.",
    title: "Your family",
    lead: "Your children will see this name when they open their space.",
    parent: "Your first name",
    family: "Family name",
    placeholder: "The Martins",
    saving: "Saving…",
    next: "Continue",
  },
});

/** Accueil, étape 2 : le prénom du parent et le nom de la famille. */
export function FamilyStep({ session }: { session: ParentSession }) {
  const t = useCopy(COPY);
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [parentName, setParentName] = useState(session.user.displayName);
  const [householdName, setHouseholdName] = useState(PROVISIONAL_HOUSEHOLD.includes(session.household.name) ? "" : session.household.name);
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
      setError(err instanceof ApiError && err.status !== 0 ? err.message : t.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorldShell emblem={<CoinArt size={96} />}>
      <OnboardingPath current={1} />
      <h1 className="world-title">{t.title}</h1>
      <p className="world-lead">{t.lead}</p>
      <form onSubmit={onSubmit} className="world-form">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="family-parent">{t.parent}</label>
          <input id="family-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={40} autoComplete="given-name" required />
        </div>
        <div className="field">
          <label htmlFor="family-name">{t.family}</label>
          <input
            id="family-name"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            maxLength={60}
            placeholder={t.placeholder}
            autoComplete="family-name"
            required
          />
        </div>
        <button type="submit" className="btn btn-quest btn-block" disabled={saving}>
          {saving ? t.saving : t.next}
        </button>
      </form>
    </WorldShell>
  );
}
