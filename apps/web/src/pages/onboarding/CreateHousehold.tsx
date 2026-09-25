import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { StepIndicator } from "../../components/StepIndicator";
import type { AccountDraft } from "./CreateAccount";

export function CreateHousehold() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, refresh } = useAuth();
  const draft = location.state as AccountDraft | null;
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session?.kind === "parent") return <Navigate to="/inscription/enfants" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  if (!draft) return <Navigate to="/inscription" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ household: { id: string; name: string } }>("/auth/register", {
        householdName,
        parentName: draft!.parentName,
        email: draft!.email,
        password: draft!.password,
      });
      await refresh();
      navigate("/inscription/enfants", { replace: true, state: { householdName: res.household.name } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-auth">
      <div className="onboarding-shell">
        <StepIndicator current={2} total={4} />
        <form onSubmit={onSubmit} className="card">
          <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
            Nommez votre foyer
          </h1>
          <p className="text-faint text-sm" style={{ marginBottom: 20 }}>
            C'est le nom que verront vos enfants en se connectant.
          </p>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label htmlFor="householdName">Nom du foyer</label>
            <input
              id="householdName"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Famille Martin"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Création…" : "Créer mon foyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
