import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export function ParentLayout() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();

  if (session?.kind !== "parent") return null;

  async function logout() {
    await api.post("/auth/logout");
    await refresh();
    navigate("/", { replace: true });
  }

  return (
    <div className="screen">
      <div className="parent-topbar">
        <span className="row" style={{ gap: 8 }}>
          <img src="/icons/logo-mark.png" alt="" style={{ width: 28, height: 28 }} />
          <span className="font-display" style={{ fontSize: 20 }}>
            Okodukai
          </span>
        </span>
        <div className="row">
          <span className="text-sm" style={{ opacity: 0.8 }}>
            {session.user.displayName}
          </span>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }} onClick={logout}>
            Déconnexion
          </button>
        </div>
      </div>
      <nav className="parent-nav">
        <NavLink to="/parent" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/parent/quetes" className={({ isActive }) => (isActive ? "active" : "")}>
          Quêtes
        </NavLink>
        <NavLink to="/parent/boutique" className={({ isActive }) => (isActive ? "active" : "")}>
          Boutique
        </NavLink>
        <NavLink to="/parent/enfants" className={({ isActive }) => (isActive ? "active" : "")}>
          Enfants
        </NavLink>
        <NavLink to="/parent/univers" className={({ isActive }) => (isActive ? "active" : "")}>
          Univers
        </NavLink>
      </nav>
      <div className="screen-content screen-content--wide">
        <Outlet />
      </div>
    </div>
  );
}
