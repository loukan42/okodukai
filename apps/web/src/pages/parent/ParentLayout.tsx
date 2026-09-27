import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Logo } from "../../art/Logo";
import { ParentChildAccess } from "../../components/ParentChildAccess";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { defineCopy, useCopy } from "../../i18n";
import { useFamilyLocaleSaver } from "../../lib/familyLocale";

const COPY = defineCopy({
  fr: { logout: "Déconnexion", nav: "Espace parent", overview: "Vue d'ensemble", quests: "Quêtes", shop: "Boutique", children: "Enfants", worlds: "Univers", account: "Compte", statistics: "Administration", statisticsShort: "Stats" },
  en: { logout: "Log out", nav: "Parent area", overview: "Overview", quests: "Quests", shop: "Shop", children: "Children", worlds: "Card worlds", account: "Account", statistics: "Administration", statisticsShort: "Stats" },
});

export function ParentLayout() {
  const t = useCopy(COPY);
  const { session, refresh } = useAuth();
  const saveFamilyLocale = useFamilyLocaleSaver();
  const navigate = useNavigate();

  if (session?.kind !== "parent") return null;

  async function logout() {
    await api.post("/auth/logout");
    await refresh();
    navigate("/", { replace: true });
  }

  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

  return (
    <div className="screen parent-screen">
      <div className="parent-topbar">
        <span className="parent-brand">
          <Logo />
        </span>
        <div className="row">
          <span className="text-sm parent-name" style={{ opacity: 0.8 }}>
            {session.user.displayName}
          </span>
          <LanguageSwitch className="parent-lang" tone="dark" onChange={saveFamilyLocale} />
          <ParentChildAccess />
          <button className="btn btn-ghost btn-sm parent-logout" onClick={logout}>
            {t.logout}
          </button>
        </div>
      </div>
      <nav className={`parent-nav${session.isPlatformAdmin ? " parent-nav--admin" : ""}`} aria-label={t.nav}>
        <NavLink to="/parent" end className={link}>
          {t.overview}
        </NavLink>
        <NavLink to="/parent/quetes" className={link}>
          {t.quests}
        </NavLink>
        <NavLink to="/parent/boutique" className={link}>
          {t.shop}
        </NavLink>
        <NavLink to="/parent/enfants" className={link}>
          {t.children}
        </NavLink>
        <NavLink to="/parent/univers" className={link}>
          {t.worlds}
        </NavLink>
        <NavLink to="/parent/compte" className={link}>{t.account}</NavLink>
        {session.isPlatformAdmin && <NavLink to="/parent/statistiques" className={link}>
          <span className="parent-nav-full">{t.statistics}</span><span className="parent-nav-short">{t.statisticsShort}</span>
        </NavLink>}
      </nav>
      <div className="screen-content screen-content--wide">
        <Outlet />
      </div>
    </div>
  );
}
