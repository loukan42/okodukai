import { NavLink, Outlet } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

const TABS = [
  { to: "/enfant/argent", label: "Mon compte", end: true },
  { to: "/enfant/argent/coffre", label: "Coffre magique" },
  { to: "/enfant/argent/investir", label: "Investir" },
  { to: "/enfant/argent/historique", label: "Historique" },
];

/** L'onglet « Mon argent » : quatre lieux, un seul solde de vérité (le serveur). */
export function MoneyLayout() {
  const reduce = useReducedMotion();
  return (
    <div className="money">
      <nav className="money-tabs" aria-label="Mon argent">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `money-tab${isActive ? " money-tab--on" : ""}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="money-tab-pill" className="nav-pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} />}
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
