import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Avatar } from "../../components/Avatar";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { useDialogFocus } from "../../lib/useDialogFocus";
import { Logo } from "../../art/Logo";
import { QuestRewardCelebration } from "../../components/QuestRewardCelebration";
import { PinPad } from "../../components/PinPad";
import { defineCopy, useCopy } from "../../i18n";

const navigation: { to: string; key: "home" | "money" | "quests" | "shop" | "collection"; icon: GameIconName; end?: boolean }[] = [
  { to: "/enfant", key: "home", icon: "home", end: true },
  { to: "/enfant/argent", key: "money", icon: "coin" },
  { to: "/enfant/quetes", key: "quests", icon: "quest" },
  { to: "/enfant/boutique", key: "shop", icon: "shop" },
  { to: "/enfant/collection", key: "collection", icon: "collection" },
];

const copy = defineCopy({
  fr: { nav: { home: "Accueil", money: "Mon argent", quests: "Quêtes", shop: "Boutique", collection: "Collection" }, parent: "Parent", parentAria: "Accéder à l'espace parent", navAria: "Navigation enfant", returnTitle: "Retour espace parent", pinInstruction: "Entre le code parent pour revenir à son espace.", passwordOption: "Utiliser le mot de passe parent", email: "Email", password: "Mot de passe", submit: "Valider", cancel: "Annuler", stay: "Rester dans mon espace", invalid: "Identifiants invalides", wrongPin: "Code incorrect" },
  en: { nav: { home: "Home", money: "My money", quests: "Quests", shop: "Shop", collection: "Collection" }, parent: "Parent", parentAria: "Open parent space", navAria: "Child navigation", returnTitle: "Return to parent space", pinInstruction: "Enter the parent PIN to go back.", passwordOption: "Use the parent password", email: "Email", password: "Password", submit: "Continue", cancel: "Cancel", stay: "Stay in my space", invalid: "Invalid details", wrongPin: "Incorrect PIN" },
});

export function ChildLayout() {
  const t = useCopy(copy);
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [showExit, setShowExit] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const gateRef = useDialogFocus<HTMLFormElement>(showExit);

  if (session?.kind !== "child") return null;

  async function exitToParent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/exit-child-mode", { email, password });
      await refresh();
      navigate("/parent", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.invalid);
    }
  }

  async function exitWithPin(pin: string) {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/exit-child-mode/pin", { pin });
      await refresh();
      navigate("/parent", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.wrongPin);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="screen child-screen">
      <header className="child-header">
        <div className="child-brand"><Logo /></div>
        <div className="child-identity"><Avatar avatarId={session.child.avatarId} /><span>{session.child.displayName}</span></div>
        <button className="parent-gate" onClick={() => setShowExit(true)} aria-label={t.parentAria}>
          <GameIcon name="lock" size={19} /><span>{t.parent}</span>
        </button>
      </header>

      <div className="screen-content">
        <Outlet />
      </div>
      <QuestRewardCelebration />

      <nav className="child-nav" aria-label={t.navAria}>
        {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {({ isActive }) => <>
            {isActive && <motion.span layoutId="child-nav-pill" className="nav-pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} />}
            <GameIcon name={item.icon} size={23} /><span>{t.nav[item.key]}</span>
          </>}
        </NavLink>)}
      </nav>

      {showExit && (
        <div className="dialog-backdrop" role="presentation">
          <form ref={gateRef} onSubmit={(event) => { if (usePassword) void exitToParent(event); else event.preventDefault(); }} onKeyDown={(e) => { if (e.key === "Escape") setShowExit(false); }} className="card parent-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="gate-title">
            <h2 id="gate-title" className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
              {t.returnTitle}
            </h2>
            {!usePassword ? <><p>{t.pinInstruction}</p><PinPad onSubmit={(pin) => void exitWithPin(pin)} submitting={submitting} error={error}/><button type="button" className="btn btn-ghost btn-block" onClick={() => { setUsePassword(true); setError(null); }}>{t.passwordOption}</button></> : <>{error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="gate-email">{t.email}</label>
              <input id="gate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="gate-password">{t.password}</label>
              <input id="gate-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary btn-block">
                {t.submit}
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowExit(false)}>
                {t.cancel}
              </button>
            </div>
            </>}
            {!usePassword && <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowExit(false)}>{t.stay}</button>}
          </form>
        </div>
      )}
    </div>
  );
}
