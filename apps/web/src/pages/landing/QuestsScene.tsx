import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { GameIcon } from "../../components/GameIcon";
import { CoinPill } from "../../components/CoinPill";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Trois fiches épinglées : la même quête vue à trois moments (proposée, déclarée, validée). */
const SHEETS = [
  { title: "Lire 15 minutes", status: "Disponible", note: "Proposée par Sophie", coins: 5, xp: 15, tone: "open" },
  { title: "Vider le lave-vaisselle", status: "En attente du parent", note: "Emma a prévenu : c'est fait", coins: 10, xp: 15, tone: "waiting" },
  { title: "Ranger sa chambre", status: "Validée", note: "Validée par Papa", coins: 10, xp: 20, tone: "done", booster: true },
] as const;

/** Chez Okodukai, l'argent commence par une action : le tableau d'aventurier et le chemin d'une quête. */
export function QuestsScene() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const still = useMotionValue(0.5);
  const p = reduce ? still : scrollYProgress;
  const boardY = useTransform(p, [0, 1], [80, -80]);
  const boardRotate = useTransform(p, [0, 1], [-3, 2]);

  return (
    <section id="quetes" className="lp-quests" ref={ref} aria-labelledby="lp-quests-title">
      <div className="lp-quests-copy">
        <h2 id="lp-quests-title" className="lp-h2">
          Chez Okodukai, l'argent commence par <em>une action.</em>
        </h2>
        <p>Vous proposez les quêtes : ranger, lire, aider, nourrir le chat. Il les fait, puis vous prévient. Vous validez, et seulement alors les pièces et l'XP arrivent.</p>
        <p className="lp-quests-aside">Certaines quêtes rapportent aussi un booster de cartes.</p>
      </div>

      <div className="lp-quests-stage">
        <motion.img
          className="lp-quests-board"
          style={{ y: boardY, rotate: boardRotate }}
          src="/assets/quests/quest-board-1080.webp"
          srcSet="/assets/quests/quest-board-540.webp 540w, /assets/quests/quest-board-1080.webp 1080w"
          sizes="(max-width: 767px) 80vw, 520px"
          alt=""
          width={1080}
          height={1080}
          loading="lazy"
          decoding="async"
        />
        <ol className="lp-quests-sheets" aria-label="Le chemin d'une quête, en démonstration">
          {SHEETS.map((s, i) => (
            <motion.li
              key={s.title}
              className={`lp-sheet lp-sheet--${s.tone}`}
              initial={reduce ? false : { opacity: 0, y: 50, rotate: i % 2 ? 4 : -4 }}
              whileInView={{ opacity: 1, y: 0, rotate: [-2.5, 1.5, -1][i] }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.18, duration: 0.8, ease: EASE }}
            >
              <span className="lp-sheet-pin" aria-hidden="true" />
              <div className="lp-sheet-head">
                <h3>{s.title}</h3>
                <span className="lp-sheet-status">{s.status}</span>
              </div>
              <p className="lp-sheet-note">
                {s.tone === "waiting" && <GameIcon name="lock" size={15} />}
                {s.note}
              </p>
              <div className="lp-sheet-rewards">
                <CoinPill amount={s.coins} />
                <span className="lp-sheet-xp">
                  <GameIcon name="xp" size={16} />
                  {s.xp} XP
                </span>
                {"booster" in s && (
                  <span className="lp-sheet-booster">
                    <GameIcon name="gift" size={16} />1 booster
                  </span>
                )}
              </div>
              {s.tone === "done" && (
                <motion.span
                  className="lp-sheet-stamp"
                  aria-hidden="true"
                  initial={reduce ? false : { opacity: 0, scale: 1.8, rotate: -24 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: -12 }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 16 }}
                >
                  <GameIcon name="check" size={20} />
                  Validé
                </motion.span>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
