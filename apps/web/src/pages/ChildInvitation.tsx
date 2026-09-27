import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Avatar } from "../components/Avatar";
import { PinPad } from "../components/PinPad";
import { WorldShell } from "../components/WorldShell";
import { defineCopy, useCopy } from "../i18n";

const copy = defineCopy({
  fr: { invalid: "Ce lien ne fonctionne plus.", failed: "Impossible d'ouvrir ton espace.", loading: "Ouverture du lien…", welcome: (name: string) => `Bienvenue ${name}`, pin: "Saisis ton code à 4 chiffres pour entrer dans ton monde.", pinHelp: "Le code est celui choisi avec ton parent pour ton profil.", invalidTitle: "Ce lien ne fonctionne plus", requestNew: "Demande un nouveau lien à un parent.", parentLogin: "Connexion parent" },
  en: { invalid: "This link no longer works.", failed: "Could not open your space.", loading: "Opening the link…", welcome: (name: string) => `Welcome ${name}`, pin: "Enter your 4-digit code to enter your world.", pinHelp: "Use the code you chose with your parent for your profile.", invalidTitle: "This link no longer works", requestNew: "Ask a parent for a new link.", parentLogin: "Parent sign in" },
});

export function ChildInvitation() {
  const t = useCopy(copy);
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [child, setChild] = useState<{ childName: string; avatarId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<{ childName: string; avatarId: string }>(`/auth/child-link/${token}`)
      .then(setChild)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.invalid))
      .finally(() => setLoading(false));
  }, [token]);

  async function enter(pin: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/child-link/redeem", { token, pin });
      await refresh();
      navigate("/enfant", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.failed);
    } finally { setBusy(false); }
  }

  return <WorldShell>
    {loading ? <p role="status">{t.loading}</p> : child ? <div className="child-invitation"><Avatar avatarId={child.avatarId} size="lg" /><h1 className="world-title">{t.welcome(child.childName)}</h1><p className="world-lead">{t.pin}</p><PinPad onSubmit={(pin) => void enter(pin)} submitting={busy} error={error}/><p className="world-footnote">{t.pinHelp}</p></div> : <div className="child-invitation"><h1 className="world-title">{t.invalidTitle}</h1><p>{error ?? t.requestNew}</p><Link className="btn btn-primary" to="/connexion">{t.parentLogin}</Link></div>}
  </WorldShell>;
}
