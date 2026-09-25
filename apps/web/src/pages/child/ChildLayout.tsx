import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Avatar } from "../../components/Avatar";

export function ChildLayout() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [showExit, setShowExit] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="screen">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
        }}
      >
        <div className="row">
          <Avatar avatarId={session.child.avatarId} />
          <span className="font-display" style={{ fontSize: 18 }}>
            {session.child.displayName}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowExit(true)}>
          🔒 Parent
        </button>
      </header>

      <div className="screen-content">
        <Outlet />
      </div>

      <nav className="child-nav">
        <NavLink to="/enfant" end className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🏠</span>
          Accueil
        </NavLink>
        <NavLink to="/enfant/quetes" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🗺️</span>
          Quêtes
        </NavLink>
        <NavLink to="/enfant/boutique" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🎁</span>
          Boutique
        </NavLink>
        <NavLink to="/enfant/collection" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🃏</span>
          Collection
        </NavLink>
        <NavLink to="/enfant/coffre" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">🏦</span>
          Mon coffre
        </NavLink>
      </nav>

      {showExit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(28,46,74,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
        >
          <form onSubmit={exitToParent} className="card" style={{ width: "100%", maxWidth: 360 }}>
            <h2 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
              Retour espace parent
            </h2>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary btn-block">
                Valider
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowExit(false)}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
