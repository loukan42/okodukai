import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { StepIndicator } from "../../components/StepIndicator";

export interface AccountDraft {
  parentName: string;
  email: string;
  password: string;
}

export function CreateAccount() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (session?.kind === "parent") return <Navigate to="/inscription/enfants" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const draft: AccountDraft = { parentName, email, password };
    navigate("/inscription/foyer", { state: draft });
  }

  return (
    <div className="centered-auth">
      <div className="onboarding-shell">
        <StepIndicator current={1} total={4} />
        <form onSubmit={onSubmit} className="card">
          <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
            Créer votre compte
          </h1>
          <p className="text-faint text-sm" style={{ marginBottom: 20 }}>
            C'est votre espace parent : vous seul(e) y avez accès.
          </p>

          <div className="field">
            <label htmlFor="parentName">Votre prénom</label>
            <input id="parentName" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

          <button type="submit" className="btn btn-primary btn-block">
            Continuer
          </button>
          <p className="text-sm text-center" style={{ marginTop: 16 }}>
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
