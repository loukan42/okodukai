import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { Phone } from "./Phone";
import { HomeScreen } from "./AppDemo";
import { SignatureCoin } from "./SignatureCoin";
import type { Ctas } from "./ctas";

const PATH: { label: string; href: string; icon: GameIconName }[] = [
  { label: "Gagner", href: "#quetes", icon: "quest" },
  { label: "Gérer", href: "#compte", icon: "coin" },
  { label: "Économiser", href: "#coffre", icon: "vault" },
  { label: "Décider", href: "#comment", icon: "shop" },
  { label: "Comprendre", href: "#placements", icon: "learn" },
];

const EASE = [0.23, 1, 0.32, 1] as const;

/** Largeurs servies pour les plans du monde (voir scripts/art/studio/build.mjs). */
const plate = (base: string, frame: "wide" | "tall") =>
  frame === "wide" ? `/assets/${base}-wide-1280.webp 1280w, /assets/${base}-wide-1920.webp 1920w` : `/assets/${base}-tall-720.webp 720w, /assets/${base}-tall-1080.webp 1080w`;

/** Le premier écran : on entre dans la vallée, le produit est posé dans l'herbe, la pièce flotte. */
export function Hero({ ctas }: { ctas: Ctas }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const still = useMotionValue(0);
  const p = reduce ? still : scrollYProgress;

  // La caméra avance : le fond recule doucement, l'avant-plan grandit et sort du cadre en premier.
  const bgY = useTransform(p, [0, 1], ["0%", "12%"]);
  const bgScale = useTransform(p, [0, 1], [1.02, 1.12]);
  const fgY = useTransform(p, [0, 1], ["0%", "10%"]);
  const fgScale = useTransform(p, [0, 1], [1, 1.3]);
  const copyY = useTransform(p, [0, 1], [0, -110]);
  const copyOpacity = useTransform(p, [0, 0.55], [1, 0]);
  const productY = useTransform(p, [0, 1], [0, -70]);
  const coinY = useTransform(p, [0, 1], ["0vh", "-18vh"]);

  const enter = (delay: number, y = 18) => (reduce ? {} : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7, ease: EASE } });

  return (
    <section className="lp-hero" ref={ref} aria-labelledby="lp-hero-title">
      <motion.div className="lp-hero-plane lp-hero-bg" style={{ y: bgY, scale: bgScale }}>
        <motion.picture initial={reduce ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.6, ease: EASE }}>
          <source media="(max-width: 767px)" srcSet={plate("backgrounds/valley-path-golden", "tall")} sizes="100vw" />
          <img src="/assets/backgrounds/valley-path-golden-wide-1920.webp" srcSet={plate("backgrounds/valley-path-golden", "wide")} sizes="100vw" alt="" decoding="async" {...{ fetchpriority: "high" }} />
        </motion.picture>
      </motion.div>
      <div className="lp-hero-veil" aria-hidden="true" />

      <div className="lp-hero-inner">
        <motion.div className="lp-hero-copy" style={{ y: copyY, opacity: copyOpacity }}>
          <motion.h1 id="lp-hero-title" className="lp-display" {...enter(0.2, 24)}>
            <span>Le premier compte</span>
            <span className="lp-display-soft">de votre enfant.</span>
          </motion.h1>
          <motion.p className="lp-hero-lead" {...enter(0.38)}>
            Il gagne des pièces virtuelles avec les quêtes que vous lui proposez, puis apprend à les dépenser, les garder ou les placer.
          </motion.p>
          <motion.div className="lp-hero-actions" {...enter(0.5)}>
            <Link to={ctas.primary.to} className="lp-btn lp-btn--tint">
              {ctas.primary.label}
            </Link>
            <a href="#comment" className="lp-btn lp-btn--clear">
              Comment ça marche
            </a>
          </motion.div>
        </motion.div>
      </div>

      <motion.div className="lp-hero-product" style={{ y: productY }}>
        <motion.div className="lp-hero-product-rise" initial={reduce ? false : { opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 1.1, ease: EASE }}>
          <Phone className="lp-hero-phone" label="Démonstration de l'écran d'accueil d'Emma : 32 pièces sur son compte, 70 dans son Coffre magique et une quête à faire.">
            <HomeScreen />
          </Phone>
          <img className="lp-hero-plinth" src="/assets/objects/stone-plinth-900.webp" srcSet="/assets/objects/stone-plinth-450.webp 450w, /assets/objects/stone-plinth-900.webp 900w" sizes="(max-width: 767px) 300px, 520px" alt="" width={900} height={520} decoding="async" />
        </motion.div>
      </motion.div>

      <motion.div className="lp-hero-coin" style={{ y: coinY }}>
        <motion.div initial={reduce ? false : { opacity: 0, y: -40, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.8, type: "spring", stiffness: 70, damping: 14 }}>
          <SignatureCoin progress={scrollYProgress} />
        </motion.div>
      </motion.div>

      <motion.div className="lp-hero-plane lp-hero-fg" style={{ y: fgY, scale: fgScale }} aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={plate("decorations/valley-foreground-golden", "tall")} sizes="100vw" />
          <img src="/assets/decorations/valley-foreground-golden-wide-1920.webp" srcSet={plate("decorations/valley-foreground-golden", "wide")} sizes="100vw" alt="" decoding="async" />
        </picture>
      </motion.div>

      <motion.nav className="lp-hero-path" aria-label="Son parcours dans Okodukai" {...enter(0.9, 12)}>
        <ol>
          {PATH.map((step) => (
            <li key={step.label}>
              <a href={step.href}>
                <GameIcon name={step.icon} size={18} />
                {step.label}
              </a>
            </li>
          ))}
        </ol>
      </motion.nav>
    </section>
  );
}
