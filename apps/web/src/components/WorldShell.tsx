import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "../art/Logo";
import { ValleyBackdrop, type ValleyMood } from "../art/ValleyBackdrop";

interface WorldShellProps {
  children: ReactNode;
  /** Objet 3D posé sur le haut du panneau (coffre, pièce…). */
  emblem?: ReactNode;
  mood?: ValleyMood;
  wide?: boolean;
}

/**
 * Coquille des écrans d'entrée (compte, accueil) : la vallée en fond, le logo qui
 * ramène à l'accueil, et un panneau clair qui porte le formulaire.
 */
export function WorldShell({ children, emblem, mood = "golden", wide = false }: WorldShellProps) {
  const reduce = useReducedMotion();
  return (
    <div className={`world world--${mood}`}>
      <ValleyBackdrop mood={mood} className="world-backdrop" />
      <header className="world-header">
        <Link to="/" className="world-brand" aria-label="Okodukai, retour à l'accueil">
          <Logo sizes="(max-width: 600px) 132px, 168px" alt="" />
        </Link>
      </header>
      <main className="world-main">
        <motion.div
          className={`world-panel${wide ? " world-panel--wide" : ""}${emblem ? " world-panel--emblem" : ""}`}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          {emblem && (
            <motion.div
              className="world-emblem"
              initial={reduce ? false : { opacity: 0, y: -26, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 17, delay: 0.12 }}
            >
              {emblem}
            </motion.div>
          )}
          {children}
        </motion.div>
      </main>
    </div>
  );
}
