import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export function RegisterHousehold() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [householdName, setHouseholdName] = useState("");
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/register", { householdName, parentName, email, password });
      await refresh();
      navigate("/parent", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-auth">
      <form onSubmit={onSubmit} className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
          Créer votre foyer
        </h1>
        <p className="text-faint text-sm" style={{ marginBottom: 20 }}>
          Vous pourrez ensuite ajouter vos enfants et personnaliser les règles.
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
          />
        </div>
        <div className="field">
          <label htmlFor="parentName">Votre prénom</label>
          <input id="parentName" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Création…" : "Créer mon foyer"}
        </button>
        <p className="text-sm text-center" style={{ marginTop: 16 }}>
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
