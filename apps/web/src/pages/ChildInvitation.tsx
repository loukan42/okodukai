import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Avatar } from "../components/Avatar";
import { PinPad } from "../components/PinPad";
import { WorldShell } from "../components/WorldShell";

export function ChildInvitation() {
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
      .catch((err) => setError(err instanceof ApiError ? err.message : "Ce lien ne fonctionne plus."))
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
      setError(err instanceof ApiError ? err.message : "Impossible d'ouvrir ton espace.");
    } finally { setBusy(false); }
  }

  return <WorldShell>
    {loading ? <p role="status">Ouverture du lien…</p> : child ? <div className="child-invitation"><Avatar avatarId={child.avatarId} size="lg" /><h1 className="world-title">Bienvenue {child.childName}</h1><p className="world-lead">Saisis ton code à 4 chiffres pour entrer dans ton monde.</p><PinPad onSubmit={(pin) => void enter(pin)} submitting={busy} error={error}/><p className="world-footnote">Le code est celui choisi avec ton parent pour ton profil.</p></div> : <div className="child-invitation"><h1 className="world-title">Ce lien ne fonctionne plus</h1><p>{error ?? "Demande un nouveau lien à un parent."}</p><Link className="btn btn-primary" to="/connexion">Connexion parent</Link></div>}
  </WorldShell>;
}
