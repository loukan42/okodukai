import { NavLink, Outlet } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { defineCopy, useCopy } from "../../../i18n";

const TABS = [
  { to: "/enfant/argent", key: "account" as const, end: true },
  { to: "/enfant/argent/coffre", key: "vault" as const },
  { to: "/enfant/argent/investir", key: "invest" as const },
  { to: "/enfant/argent/historique", key: "history" as const },
];
const copy = defineCopy({
  fr: { title: "Mon trésor", tabs: { account: "Mon compte", vault: "Coffre magique", invest: "Investir", history: "Historique" } },
  en: { title: "My treasure", tabs: { account: "My account", vault: "Magic Vault", invest: "Invest", history: "History" } },
});

/**
 * L'onglet « Mon trésor » (pas « Mon argent » : les pièces sont virtuelles) : quatre lieux, un seul
 * solde de vérité (le serveur).
 */
export function MoneyLayout() {
  const t = useCopy(copy);
  const reduce = useReducedMotion();
  return (
    <div className="money">
      <nav className="money-tabs" aria-label={t.title}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `money-tab${isActive ? " money-tab--on" : ""}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="money-tab-pill" className="nav-pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} />}
                {t.tabs[tab.key]}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
