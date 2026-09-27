import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { GameIcon } from "../../components/GameIcon";
import { CoinPill } from "../../components/CoinPill";
import { LANDING } from "./copy";
import { useCopy } from "../../i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Trois fiches épinglées : la même quête vue à trois moments (proposée, déclarée, validée). */
const SHEETS = [
  { coins: 5, xp: 15, tone: "open" },
  { coins: 10, xp: 15, tone: "waiting" },
  { coins: 10, xp: 20, tone: "done", booster: true },
] as const;

/** Chez Okodukai, l'argent commence par une action : le tableau d'aventurier et le chemin d'une quête. */
export function QuestsScene() {
  const t = useCopy(LANDING).quests;
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
          {t.title} <em>{t.titleEm}</em>
        </h2>
        <p>{t.text}</p>
        <p className="lp-quests-aside">{t.aside}</p>
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
        <ol className="lp-quests-sheets" aria-label={t.sheetsLabel}>
          {SHEETS.map((s, i) => (
            <motion.li
              key={t.sheets[i].title}
              className={`lp-sheet lp-sheet--${s.tone}`}
              initial={reduce ? false : { opacity: 0, y: 50, rotate: i % 2 ? 4 : -4 }}
              whileInView={{ opacity: 1, y: 0, rotate: [-2.5, 1.5, -1][i] }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.18, duration: 0.8, ease: EASE }}
            >
              <span className="lp-sheet-pin" aria-hidden="true" />
              <div className="lp-sheet-head">
                <h3>{t.sheets[i].title}</h3>
                <span className="lp-sheet-status">{t.sheets[i].status}</span>
              </div>
              <p className="lp-sheet-note">
                {s.tone === "waiting" && <GameIcon name="lock" size={15} />}
                {t.sheets[i].note}
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
                  {t.stamp}
                </motion.span>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
