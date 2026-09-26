import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ChestArt } from "../../art/ChestArt";
import { ProgressBar } from "../../components/ProgressBar";
import { VAULT_STAGES } from "./AppDemo";

const CAPTIONS = [
  "Le coffre est fermé. Tout est encore sur son compte.",
  "Il range 20 pièces. Elles ne partiront pas à la boutique par erreur.",
  "Chaque lundi, le coffre lui donne une petite prime : 1 pièce pour 10 gardées toute la semaine.",
  "Il lui manque 10 pièces pour « Glace en famille ».",
  "Objectif atteint. Samedi, c'est glace en famille.",
];

/**
 * Mon coffre, en plus calme : un seul objet au centre. Le défilement ouvre le coffre et
 * fait monter les pièces, étape par étape (les cinq rendus du studio, du coffre fermé à l'objectif atteint).
 */
export function VaultScene() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(VAULT_STAGES.length - 1, Math.max(0, Math.floor(v * VAULT_STAGES.length * 0.999)));
    if (next !== stage) setStage(next);
  });
  const current = VAULT_STAGES[stage];

  return (
    <section id="coffre" className="lp-vault" ref={ref} aria-labelledby="lp-vault-title">
      <div className="lp-vault-sticky">
        <h2 id="lp-vault-title" className="lp-vault-title">
          <span>Tout dépenser maintenant ?</span>
          <em>Ou garder pour plus tard ?</em>
        </h2>

        <div className="lp-vault-stage">
          <div className="lp-vault-light" aria-hidden="true" />
          {VAULT_STAGES.map((s, i) => (
            <div key={s.state} className={`lp-vault-chest${i === stage ? " is-on" : ""}`} aria-hidden={i !== stage}>
              <ChestArt state={s.state} size={520} />
            </div>
          ))}
        </div>

        <div className="lp-vault-ledger">
          <p className="lp-vault-balance">
            <span>Coffre magique</span>
            <strong>{current.balance}</strong> pièces
          </p>
          <div className="lp-vault-goal">
            <span>Objectif : Glace en famille</span>
            <ProgressBar value={current.balance} max={100} />
          </div>
          <div className="lp-vault-caption" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={stage} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.01 : 0.35 }}>
                {CAPTIONS[stage]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
