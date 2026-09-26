import { motion, useReducedMotion } from "framer-motion";
import { GameIcon, type GameIconName } from "../../components/GameIcon";

/** Les vrais réglages de l'espace parent, avec leurs vraies options. */
const CONTROLS: { icon: GameIconName; title: string; value: string }[] = [
  { icon: "quest", title: "Les quêtes", value: "Vous les créez, vous les validez." },
  { icon: "shop", title: "La boutique", value: "Vos récompenses, vos prix." },
  { icon: "vault", title: "Retraits du Coffre magique", value: "Libres, avec votre accord, après une durée ou à l'objectif." },
  { icon: "coin", title: "Argent de poche", value: "Un montant, un jour, chaque semaine." },
  { icon: "learn", title: "Placements", value: "Activés ou non, rythme des relevés, versements plafonnés." },
  { icon: "collection", title: "Univers de cartes", value: "Vous choisissez lesquels." },
];

/** Côté parents : plus calme. Le vrai tableau de bord, et les réglages qui restent entre vos mains. */
export function ParentsScene() {
  const reduce = useReducedMotion();
  return (
    <section id="parents" className="lp-parents" aria-labelledby="lp-parents-title">
      <h2 id="lp-parents-title" className="lp-parents-title">
        Vous gardez les règles.
        <em>Il apprend à choisir.</em>
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
            src="/assets/screens/parent-dashboard-1440.webp"
            srcSet="/assets/screens/parent-dashboard-960.webp 960w, /assets/screens/parent-dashboard-1440.webp 1440w"
            sizes="(max-width: 1023px) 92vw, 760px"
            alt="L'espace parent : les deux enfants, leurs pièces disponibles et au coffre, et une quête à valider."
            width={1440}
            height={960}
            loading="lazy"
            decoding="async"
          />
          <figcaption>L'espace parent du foyer de démonstration.</figcaption>
        </motion.figure>
        <ul className="lp-controls">
          {CONTROLS.map((c, i) => (
            <motion.li
              key={c.title}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="lp-control-icon">
                <GameIcon name={c.icon} size={20} />
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
      <p className="lp-parents-foot">Vous suivez aussi ce qu'il a compris des placements, avec une idée de sujet pour en parler ensemble.</p>
    </section>
  );
}
