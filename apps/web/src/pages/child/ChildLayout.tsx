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

const navigation: { to: string; label: string; icon: GameIconName; end?: boolean }[] = [
  { to: "/enfant", label: "Accueil", icon: "home", end: true },
  { to: "/enfant/argent", label: "Mon argent", icon: "coin" },
  { to: "/enfant/quetes", label: "Quêtes", icon: "quest" },
  { to: "/enfant/boutique", label: "Boutique", icon: "shop" },
  { to: "/enfant/collection", label: "Collection", icon: "collection" },
];

export function ChildLayout() {
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
      setError(err instanceof ApiError ? err.message : "Identifiants invalides");
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
      setError(err instanceof ApiError ? err.message : "Code incorrect");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="screen child-screen">
      <header className="child-header">
        <div className="child-brand"><Logo /></div>
        <div className="child-identity"><Avatar avatarId={session.child.avatarId} /><span>{session.child.displayName}</span></div>
        <button className="parent-gate" onClick={() => setShowExit(true)} aria-label="Accéder à l'espace parent">
          <GameIcon name="lock" size={19} /><span>Parent</span>
        </button>
      </header>

      <div className="screen-content">
        <Outlet />
      </div>
      <QuestRewardCelebration />

      <nav className="child-nav" aria-label="Navigation enfant">
        {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {({ isActive }) => <>
            {isActive && <motion.span layoutId="child-nav-pill" className="nav-pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} />}
            <GameIcon name={item.icon} size={23} /><span>{item.label}</span>
          </>}
        </NavLink>)}
      </nav>

      {showExit && (
        <div className="dialog-backdrop" role="presentation">
          <form ref={gateRef} onSubmit={(event) => { if (usePassword) void exitToParent(event); else event.preventDefault(); }} onKeyDown={(e) => { if (e.key === "Escape") setShowExit(false); }} className="card parent-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="gate-title">
            <h2 id="gate-title" className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
              Retour espace parent
            </h2>
            {!usePassword ? <><p>Entre le code parent pour revenir à son espace.</p><PinPad onSubmit={(pin) => void exitWithPin(pin)} submitting={submitting} error={error}/><button type="button" className="btn btn-ghost btn-block" onClick={() => { setUsePassword(true); setError(null); }}>Utiliser le mot de passe parent</button></> : <>{error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="gate-email">Email</label>
              <input id="gate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="gate-password">Mot de passe</label>
              <input id="gate-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary btn-block">
                Valider
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowExit(false)}>
                Annuler
              </button>
            </div>
            </>}
            {!usePassword && <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowExit(false)}>Rester dans mon espace</button>}
          </form>
        </div>
      )}
    </div>
  );
}
