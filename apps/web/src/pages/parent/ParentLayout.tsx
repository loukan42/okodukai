import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Logo } from "../../art/Logo";
import { ParentChildAccess } from "../../components/ParentChildAccess";

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
    <div className="screen parent-screen">
      <div className="parent-topbar">
        <span className="parent-brand">
          <Logo />
        </span>
        <div className="row">
          <span className="text-sm" style={{ opacity: 0.8 }}>
            {session.user.displayName}
          </span>
          <ParentChildAccess />
          <button className="btn btn-ghost btn-sm parent-logout" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </div>
      <nav className="parent-nav">
        <NavLink to="/parent" end className={({ isActive }) => (isActive ? "active" : "")}>
          Vue d'ensemble
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
