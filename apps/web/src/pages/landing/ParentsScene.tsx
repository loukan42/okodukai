import { motion, useReducedMotion } from "framer-motion";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { LANDING } from "./copy";
import { useCopy, useLocale } from "../../i18n";

/** Les vrais réglages de l'espace parent, avec leurs vraies options (textes dans `copy.ts`). */
const ICONS: GameIconName[] = ["quest", "shop", "vault", "coin", "learn", "collection"];

/** Côté parents : plus calme. Le vrai tableau de bord, et les réglages qui restent entre vos mains. */
export function ParentsScene() {
  const t = useCopy(LANDING).parents;
  const { locale } = useLocale();
  const shot = locale === "en" ? "parent-dashboard-en" : "parent-dashboard";
  const reduce = useReducedMotion();
  return (
    <section id="parents" className="lp-parents" aria-labelledby="lp-parents-title">
      <h2 id="lp-parents-title" className="lp-parents-title">
        {t.title}
        <em>{t.titleEm}</em>
      </h2>
      <div className="lp-parents-grid">
        <motion.figure
          className="lp-window"
          initial={reduce ? false : { opacity: 0, y: 40, rotateX: 8 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="lp-window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <img
            src={`/assets/screens/${shot}-1440.webp`}
            srcSet={`/assets/screens/${shot}-960.webp 960w, /assets/screens/${shot}-1440.webp 1440w`}
            sizes="(max-width: 1023px) 92vw, 760px"
            alt={t.screenAlt}
            width={1440}
            height={960}
            loading="lazy"
            decoding="async"
          />
          <figcaption>{t.screenCaption}</figcaption>
        </motion.figure>
        <ul className="lp-controls">
          {t.controls.map((c, i) => (
            <motion.li
              key={c.title}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="lp-control-icon">
                <GameIcon name={ICONS[i]} size={20} />
              </span>
              <span className="lp-control-text">
                <strong>{c.title}</strong>
                <span>{c.value}</span>
              </span>
              <span className="lp-control-switch" aria-hidden="true" />
            </motion.li>
          ))}
        </ul>
      </div>
      <p className="lp-parents-foot">{t.foot}</p>
    </section>
  );
}
