import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "../../art/Logo";
import type { Ctas } from "./ctas";

const NOT = ["Pas d'argent réel,", "pas de publicité,", "pas de réseau social,", "pas de chat."];

/** Confiance, en court : ce qu'Okodukai n'a pas, et ce qu'il a. */
export function Trust() {
  return (
    <section className="lp-trust" aria-labelledby="lp-trust-title">
      <h2 id="lp-trust-title" className="sr-only">
        Ce qu'Okodukai n'a pas
      </h2>
      <ul className="lp-trust-not">
        {NOT.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="lp-trust-yes">
        Les pièces sont virtuelles : elles ne s'achètent pas et ne se convertissent pas en euros. <strong>Vous fixez les règles, et les écrans sont pensés pour les 8-12 ans.</strong>
      </p>
    </section>
  );
}

/** La fin revient dans le monde du début : le chemin mène au hameau, au lever du jour. */
export function Finale({ ctas }: { ctas: Ctas }) {
  const reduce = useReducedMotion();
  return (
    <>
      <section className="lp-finale" aria-labelledby="lp-finale-title">
        <picture className="lp-finale-bg">
          <source media="(max-width: 767px)" srcSet="/assets/backgrounds/valley-hamlet-dawn-tall-720.webp 720w, /assets/backgrounds/valley-hamlet-dawn-tall-1080.webp 1080w" sizes="100vw" />
          <img src="/assets/backgrounds/valley-hamlet-dawn-wide-1920.webp" srcSet="/assets/backgrounds/valley-hamlet-dawn-wide-1280.webp 1280w, /assets/backgrounds/valley-hamlet-dawn-wide-1920.webp 1920w" sizes="100vw" alt="" loading="lazy" decoding="async" />
        </picture>
        <div className="lp-finale-veil" aria-hidden="true" />
        <motion.div className="lp-finale-inner" initial={reduce ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}>
          <h2 id="lp-finale-title" className="lp-display lp-display--finale">
            <span>Sa première aventure</span>
            <span className="lp-display-soft">avec l'argent peut commencer ici.</span>
          </h2>
          <p>Il suffit d'un e-mail et du nom de votre famille, puis d'un profil par enfant. Le reste se règle plus tard.</p>
          <div className="lp-hero-actions">
            <Link to={ctas.primary.to} className="lp-btn lp-btn--gold">
              {ctas.primary.label}
            </Link>
            <Link to={ctas.secondary.to} className="lp-btn lp-btn--ghost">
              {ctas.secondary.label}
            </Link>
          </div>
        </motion.div>
      </section>
      <footer className="lp-footer">
        <Logo sizes="120px" alt="Okodukai" className="lp-footer-logo" />
        <p>Okodukai n'est pas une banque. Les pièces sont virtuelles : elles ne s'achètent pas et ne se convertissent pas en euros. Les placements sont une simulation pédagogique.</p>
      </footer>
    </>
  );
}
