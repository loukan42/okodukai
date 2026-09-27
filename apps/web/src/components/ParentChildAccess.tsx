import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useDialogFocus } from "../lib/useDialogFocus";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { defineCopy, useCopy } from "../i18n";
import { GoogleSignInButton } from "./GoogleSignInButton";

const copy = defineCopy({
  fr: { loadError: "Impossible de charger les profils. Réessayez.", saveError: "Le code n'a pas été enregistré.", switchError: "Impossible de passer en mode enfant.", linkError: "Impossible de créer le lien.", copyError: "Copie impossible sur cet appareil. Sélectionnez le lien pour le copier.", entry: "Espace enfant", title: "Passer en mode enfant", intro: "Choisissez comment votre enfant va utiliser Okodukai.", close: "Fermer", pinTitle: "Créez votre code parent", pinHelp: "Il permettra de revenir à votre espace quand vous prêtez ce téléphone.", pinLabel: "Code à 4 chiffres", password: "Votre mot de passe", googlePinHelp: "Saisissez 4 chiffres, puis confirmez avec votre compte Google.", savePin: "Enregistrer le code", noChild: "Créez d'abord un profil enfant dans l'onglet Enfants.", samePhone: "Donner ce téléphone", share: "Partager un lien", linkFor: (name: string) => `Lien pour ${name}`, linkHelp: "À ouvrir sur son téléphone. Le lien expire dans 24 heures, fonctionne une seule fois et demande le code de l'enfant.", linkAria: "Lien personnel pour l'enfant", copied: "Lien copié", copyLink: "Copier le lien" },
  en: { loadError: "Could not load the profiles. Try again.", saveError: "The PIN could not be saved.", switchError: "Could not switch to child mode.", linkError: "Could not create the link.", copyError: "Could not copy on this device. Select the link to copy it.", entry: "Child space", title: "Switch to child mode", intro: "Choose how your child will use Okodukai.", close: "Close", pinTitle: "Create your parent PIN", pinHelp: "It lets you return to your space when you hand over this phone.", pinLabel: "4-digit PIN", password: "Your password", googlePinHelp: "Enter 4 digits, then confirm with your Google account.", savePin: "Save PIN", noChild: "Create a child profile in the Children tab first.", samePhone: "Hand over this phone", share: "Share a link", linkFor: (name: string) => `Link for ${name}`, linkHelp: "Open it on their phone. The link expires in 24 hours, works once, and requires the child's PIN.", linkAria: "Personal link for the child", copied: "Link copied", copyLink: "Copy link" },
});

interface ChildOption { id: string; displayName: string; avatarId: string }

export function ParentChildAccess() {
  const t = useCopy(copy);
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
      .catch(() => setError(t.loadError));
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
      setError(err instanceof ApiError ? err.message : t.saveError);
    } finally { setBusy(false); }
  }

  async function savePinWithGoogle(credential: string) {
    if (pin.length !== 4) return;
    setError(null);
    setBusy(true);
    try {
      await api.postGoogle("/auth/parent-pin", { credential, pin });
      await refresh();
      setPin("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.saveError);
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
      setError(err instanceof ApiError ? err.message : t.switchError);
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
      setError(err instanceof ApiError ? err.message : t.linkError);
    } finally { setBusy(false); }
  }

  async function copyLink() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); }
    catch { setError(t.copyError); }
  }

  return <>
    <button className="btn btn-gold btn-sm parent-child-switch" type="button" onClick={() => { setError(null); setOpen(true); }}>
      <GameIcon name="user" size={18} /> {t.entry}
    </button>
    {open && <div className="dialog-backdrop" role="presentation">
      <div ref={dialogRef} className="parent-child-dialog" role="dialog" aria-modal="true" aria-labelledby="parent-child-title" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
        <div className="parent-child-dialog-head"><div><h2 id="parent-child-title">{t.title}</h2><p>{t.intro}</p></div><button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)} aria-label={t.close}>{t.close}</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!session.hasParentPin && <form className="parent-pin-setup" onSubmit={session.hasPasswordLogin ? savePin : (event) => event.preventDefault()}>
          <h3>{t.pinTitle}</h3>
          <p>{t.pinHelp}</p>
          <div className="parent-pin-fields"><label>{t.pinLabel}<input type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} required /></label>{session.hasPasswordLogin && <label>{t.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}</div>
          {session.hasPasswordLogin ? <button className="btn btn-primary" disabled={busy || pin.length !== 4}>{t.savePin}</button> : <><p>{t.googlePinHelp}</p>{pin.length === 4 && !busy && <GoogleSignInButton onCredential={(credential) => void savePinWithGoogle(credential)} />}</>}
        </form>}
        <div className="parent-child-options">{children.length === 0 ? <p>{t.noChild}</p> : children.map((child) => <div className="parent-child-option" key={child.id}>
          <Avatar avatarId={child.avatarId} />
          <strong>{child.displayName}</strong>
          <div className="parent-child-option-actions"><button className="btn btn-primary btn-sm" type="button" disabled={busy || !session.hasParentPin} onClick={() => void switchChild(child.id)}>{t.samePhone}</button><button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => void createLink(child.id)}>{t.share}</button></div>
        </div>)}</div>
        {link && <div className="parent-share-link"><strong>{t.linkFor(children.find((child) => child.id === link.childId)?.displayName ?? "")}</strong><p>{t.linkHelp}</p><input readOnly value={link.url} onFocus={(event) => event.target.select()} aria-label={t.linkAria} /><button className="btn btn-gold btn-sm" type="button" onClick={() => void copyLink()}>{copied ? t.copied : t.copyLink}</button></div>}
      </div>
    </div>}
  </>;
}
