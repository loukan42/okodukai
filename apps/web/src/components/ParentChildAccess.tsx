import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useDialogFocus } from "../lib/useDialogFocus";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";

interface ChildOption { id: string; displayName: string; avatarId: string }

export function ParentChildAccess() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(open);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ childId: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || session?.kind !== "parent") return;
    api.get<{ children: ChildOption[] }>("/household/children")
      .then((res) => setChildren(res.children))
      .catch(() => setError("Impossible de charger les profils. Réessayez."));
  }, [open, session?.kind]);

  if (session?.kind !== "parent") return null;

  async function savePin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/parent-pin", { password, pin });
      await refresh();
      setPassword("");
      setPin("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le code n'a pas été enregistré.");
    } finally { setBusy(false); }
  }

  async function switchChild(childId: string) {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/auth/switch-child/${childId}`);
      await refresh();
      setOpen(false);
      navigate("/enfant", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de passer en mode enfant.");
    } finally { setBusy(false); }
  }

  async function createLink(childId: string) {
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      const result = await api.post<{ token: string }>(`/auth/child-link/create/${childId}`);
      setLink({ childId, url: `${window.location.origin}/invitation-enfant/${result.token}` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer le lien.");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); }
    catch { setError("Copie impossible sur cet appareil. Sélectionnez le lien pour le copier."); }
  }

  return <>
    <button className="btn btn-gold btn-sm parent-child-switch" type="button" onClick={() => { setError(null); setOpen(true); }}>
      <GameIcon name="user" size={18} /> Espace enfant
    </button>
    {open && <div className="dialog-backdrop" role="presentation">
      <div ref={dialogRef} className="parent-child-dialog" role="dialog" aria-modal="true" aria-labelledby="parent-child-title" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
        <div className="parent-child-dialog-head"><div><h2 id="parent-child-title">Passer en mode enfant</h2><p>Choisissez comment votre enfant va utiliser Okodukai.</p></div><button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)} aria-label="Fermer">Fermer</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!session.hasParentPin && <form className="parent-pin-setup" onSubmit={savePin}>
          <h3>Créez votre code parent</h3>
          <p>Il permettra de revenir à votre espace quand vous prêtez ce téléphone.</p>
          <div className="parent-pin-fields"><label>Code à 4 chiffres<input autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} required /></label><label>Votre mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label></div>
          <button className="btn btn-primary" disabled={busy || pin.length !== 4}>Enregistrer le code</button>
        </form>}
        <div className="parent-child-options">{children.length === 0 ? <p>Créez d'abord un profil enfant dans l'onglet Enfants.</p> : children.map((child) => <div className="parent-child-option" key={child.id}>
          <Avatar avatarId={child.avatarId} />
          <strong>{child.displayName}</strong>
          <div className="parent-child-option-actions"><button className="btn btn-primary btn-sm" type="button" disabled={busy || !session.hasParentPin} onClick={() => void switchChild(child.id)}>Donner ce téléphone</button><button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => void createLink(child.id)}>Partager un lien</button></div>
        </div>)}</div>
        {link && <div className="parent-share-link"><strong>Lien pour {children.find((child) => child.id === link.childId)?.displayName}</strong><p>À ouvrir sur son téléphone. Le lien expire dans 24 heures, fonctionne une seule fois et demande le code de l'enfant.</p><input readOnly value={link.url} onFocus={(event) => event.target.select()} aria-label="Lien personnel pour l'enfant" /><button className="btn btn-gold btn-sm" type="button" onClick={() => void copyLink()}>{copied ? "Lien copié" : "Copier le lien"}</button></div>}
      </div>
    </div>}
  </>;
}
