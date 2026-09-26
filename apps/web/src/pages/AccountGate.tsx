import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { WorldShell } from "../components/WorldShell";
import { OnboardingPath } from "../components/OnboardingPath";
import { ChestArt } from "../art/ChestArt";

interface ContinueResponse {
  outcome: "created" | "signed_in";
  onboardingCompleted: boolean;
}

const COPY = {
  title: "Votre compte Okodukai",
  lead: "Un e-mail et un mot de passe. Nouveau ici : le compte est créé. Déjà inscrit : vous êtes connecté.",
  email: "E-mail",
  password: "Mot de passe",
  passwordHint: "8 caractères minimum pour un nouveau compte.",
  show: "Afficher",
  hide: "Masquer",
  submit: "Continuer",
  submitting: "Un instant…",
  unreachable: "Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.",
  cookieBlocked:
    "Le compte est prêt, mais votre navigateur a refusé le cookie de connexion. Autorisez les cookies pour ce site puis réessayez.",
  fallback: "La connexion n'a pas abouti. Réessayez dans un instant.",
  privacy: "Aucun paiement, aucune carte bancaire : les pièces d'Okodukai restent virtuelles.",
};

/**
 * Entrée unique du parent (/inscription et /connexion) : si l'e-mail existe on
 * connecte, sinon on crée le compte. Le nom de famille et les enfants viennent après.
 */
export function AccountGate() {
  const navigate = useNavigate();
  const { session, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  if (session?.kind === "parent") {
    return <Navigate to={session.household?.onboardingCompleted === false ? "/accueil/famille" : "/parent"} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<ContinueResponse>("/auth/continue", { email, password });
      const me = await refresh();
      if (!me) {
        setError(COPY.cookieBlocked);
        return;
      }
      navigate(res.outcome === "created" || !res.onboardingCompleted ? "/accueil/famille" : "/parent", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.status === 0 ? COPY.unreachable : err.message);
      else setError(COPY.fallback);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorldShell emblem={<ChestArt state="closed" size={148} />}>
      <OnboardingPath current={0} />
      <h1 className="world-title">{COPY.title}</h1>
      <p className="world-lead">{COPY.lead}</p>

      <form onSubmit={onSubmit} className="world-form">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="gate-email">{COPY.email}</label>
          <input
            id="gate-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="gate-password">{COPY.password}</label>
          <div className="password-field">
            <input
              id="gate-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="gate-password-hint"
              required
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
              {showPassword ? COPY.hide : COPY.show}
            </button>
          </div>
          <p id="gate-password-hint" className="field-hint">
            {COPY.passwordHint}
          </p>
        </div>
        <button type="submit" className="btn btn-quest btn-block" disabled={submitting}>
          {submitting ? COPY.submitting : COPY.submit}
        </button>
      </form>
      <p className="world-footnote">{COPY.privacy}</p>
    </WorldShell>
  );
}
