import { motion, useReducedMotion, type MotionValue } from "framer-motion";
import { ChestArt } from "./ChestArt";
import { CoinArt } from "./CoinArt";

// Pièces éjectées quand le coffre se pose : direction (x, y) en px, rotation, délai.
const BURST = [
  { x: -150, y: -120, r: -220, d: 0 },
  { x: -70, y: -190, r: 180, d: 0.05 },
  { x: 40, y: -210, r: -160, d: 0.02 },
  { x: 140, y: -150, r: 240, d: 0.08 },
  { x: 190, y: -40, r: -200, d: 0.04 },
  { x: -200, y: -30, r: 160, d: 0.1 },
];

// Pièces qui flottent autour du coffre (boucle CSS, coupée si mouvement réduit).
const ORBIT = [
  { left: "4%", top: "20%", size: 54, delay: "0s" },
  { left: "84%", top: "12%", size: 44, delay: "-1.4s" },
  { left: "90%", top: "56%", size: 36, delay: "-2.6s" },
];

/**
 * Le coffre de la landing : il tombe, se pose dans un jaillissement de pièces, puis
 * flotte doucement. L'entrée est orchestrée ici ; les boucles d'attente sont en CSS.
 */
export function HeroChest({ offsetX, offsetY }: { offsetX?: MotionValue<number>; offsetY?: MotionValue<number> }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className="hero-chest" style={{ x: offsetX, y: offsetY }} aria-hidden="true">
      <div className="hero-chest-glow" />
      {ORBIT.map((c, i) => (
        <motion.div
          key={i}
          className="hero-chest-orbit"
          style={{ left: c.left, top: c.top }}
          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.15 + i * 0.12, type: "spring", stiffness: 260, damping: 14 }}
        >
          <div className="hero-chest-bob" style={{ animationDelay: c.delay }}>
            <CoinArt size={c.size} />
          </div>
        </motion.div>
      ))}
      <motion.div
        className="hero-chest-body"
        initial={reduce ? false : { y: -110, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ y: { type: "spring", stiffness: 170, damping: 12, delay: 0.35 }, opacity: { delay: 0.35, duration: 0.25 }, scale: { delay: 0.35, duration: 0.5 } }}
      >
        <div className="hero-chest-float">
          <ChestArt state="reached" size={420} className="hero-chest-img" />
        </div>
      </motion.div>
      {!reduce &&
        BURST.map((c, i) => (
          <motion.div
            key={i}
            className="hero-chest-burst"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ x: [0, c.x * 0.8, c.x], y: [0, c.y, c.y + 260], opacity: [0, 1, 0], scale: [0.5, 1, 0.9], rotate: c.r }}
            transition={{ delay: 0.95 + c.d, duration: 1.5, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }}
          >
            <CoinArt size={40} />
          </motion.div>
        ))}
    </motion.div>
  );
}
