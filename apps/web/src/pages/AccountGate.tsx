import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { WorldShell } from "../components/WorldShell";
import { OnboardingPath } from "../components/OnboardingPath";
import { ChestArt } from "../art/ChestArt";
import { defineCopy, useCopy } from "../i18n";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

interface ContinueResponse {
  outcome: "created" | "signed_in";
  onboardingCompleted: boolean;
}

const TEXT = defineCopy({
  fr: {
    title: "Votre compte Okodukai",
    lead: "Continuez avec Google ou utilisez votre e-mail et votre mot de passe. Votre compte est créé si vous êtes nouveau.",
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
    accountPrivacy: "Votre e-mail sert à vous connecter. L'administrateur du service peut le consulter pour gérer votre compte.",
    noApp: "Ça marche directement dans le navigateur, sur ordinateur comme sur le téléphone de votre enfant : rien à télécharger.",
  },
  en: {
    title: "Your Okodukai account",
    lead: "Continue with Google or use your email and password. We'll create an account if you're new.",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters for a new account.",
    show: "Show",
    hide: "Hide",
    submit: "Continue",
    submitting: "One moment…",
    unreachable: "The server isn't responding. Check your connection and try again.",
    cookieBlocked:
      "Your account is ready, but your browser blocked the login cookie. Allow cookies for this site and try again.",
    fallback: "We couldn't log you in. Try again in a moment.",
    privacy: "No payment and no bank card: Okodukai coins are only virtual.",
    accountPrivacy: "Your email is used to sign in. The service administrator can view it to manage your account.",
    noApp: "It works directly in the browser, on a computer or on your child's phone: nothing to download.",
  },
});

/**
 * Entrée unique du parent (/inscription et /connexion) : si l'e-mail existe on
 * connecte, sinon on crée le compte. Le nom de famille et les enfants viennent après.
 */
export function AccountGate() {
  const COPY = useCopy(TEXT);
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

  async function onGoogleCredential(credential: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.postGoogle<ContinueResponse>("/auth/google/continue", { credential });
      const me = await refresh();
      if (!me) { setError(COPY.cookieBlocked); return; }
      navigate(res.outcome === "created" || !res.onboardingCompleted ? "/accueil/famille" : "/parent", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : COPY.fallback);
    } finally { setSubmitting(false); }
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
      <GoogleSignInButton onCredential={(credential) => { if (!submitting) void onGoogleCredential(credential); }} />
      <p className="world-footnote">{COPY.noApp}</p>
      <p className="world-footnote">{COPY.accountPrivacy}</p>
      <p className="world-footnote">{COPY.privacy}</p>
    </WorldShell>
  );
}
