import { useState } from "react";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    title: "Votre compte",
    intro: "Choisissez comment vous vous connectez à Okodukai.",
    email: "Adresse e-mail",
    google: "Connexion Google",
    linked: "Votre compte Google est associé. Vous pouvez l'utiliser pour vous connecter.",
    link: "Associez votre compte Google pour retrouver cette famille avec le bouton Google. Choisissez la même adresse e-mail que celle affichée ici.",
    success: "Compte Google associé.",
    error: "Impossible d'associer ce compte Google. Réessayez.",
  },
  en: {
    title: "Your account",
    intro: "Choose how you sign in to Okodukai.",
    email: "Email address",
    google: "Google sign-in",
    linked: "Your Google account is linked. You can use it to sign in.",
    link: "Link your Google account to access this family with the Google button. Choose the same email address shown here.",
    success: "Google account linked.",
    error: "We couldn't link this Google account. Try again.",
  },
});

export function ParentAccount() {
  const t = useCopy(COPY);
  const { session, refresh } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (session?.kind !== "parent") return null;

  async function link(credential: string) {
    setError(null);
    setMessage(null);
    try {
      await api.postGoogle("/auth/google/link", { credential });
      await refresh();
      setMessage(t.success);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.error);
    }
  }

  return <main className="parent-account">
    <header className="parent-page-intro"><div><h1>{t.title}</h1><p>{t.intro}</p></div></header>
    <section className="card" aria-labelledby="account-email-title">
      <h2 id="account-email-title">{t.email}</h2>
      <p>{session.user.email}</p>
    </section>
    <section className="card" aria-labelledby="account-google-title">
      <h2 id="account-google-title">{t.google}</h2>
      <p>{session.hasGoogleLogin ? t.linked : t.link}</p>
      {!session.hasGoogleLogin && <GoogleSignInButton onCredential={(credential) => { void link(credential); }} />}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
  </main>;
}
