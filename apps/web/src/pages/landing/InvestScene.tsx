import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LANDING } from "./copy";
import { useCopy } from "../../i18n";

/** Une partie de démonstration : dix ans de marché simulé, un point par année (valeurs illustratives). */
const YEARS = [100, 104, 101, 109, 106, 114, 121, 117, 126, 133, 138];
const W = 560;
const H = 220;
const points = YEARS.map((v, i) => [24 + (i * (W - 48)) / (YEARS.length - 1), H - 24 - ((v - 95) / 48) * (H - 60)] as const);
const LINE = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const AREA = `${LINE} L${points.at(-1)![0].toFixed(1)} ${H} L${points[0][0].toFixed(1)} ${H} Z`;


/**
 * Investir, c'est voir le temps passer : en défilant, le jour tombe sur la vallée (heure dorée,
 * puis crépuscule), la courbe se trace année après année. La vraie interface reste lisible.
 */
export function InvestScene() {
  const t = useCopy(LANDING).invest;
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const still = useMotionValue(1);
  const p = reduce ? still : scrollYProgress;
  const dusk = useTransform(p, [0.1, 0.8], [0, 1]);
  const stars = useTransform(p, [0.55, 0.95], [0, 1]);
  const draw = useTransform(p, [0.12, 0.85], [0.02, 1]);
  // La zone sous la courbe se dévoile avec la ligne : jamais d'année révélée en avance.
  const reveal = useTransform(draw, (v) => Math.max(0, Math.min(1, v)) * W);
  const [year, setYear] = useState(reduce ? 10 : 0);
  useMotionValueEvent(draw, "change", (v) => {
    const next = Math.round(Math.max(0, Math.min(1, v)) * 10);
    if (next !== year) setYear(next);
  });
  const value = YEARS[year];

  return (
    <section id="placements" className="lp-invest" ref={ref} aria-labelledby="lp-invest-title">
      <div className="lp-invest-sticky">
        <div className="lp-invest-sky" aria-hidden="true">
          <picture>
            <source media="(max-width: 767px)" srcSet="/assets/backgrounds/valley-golden-tall-720.webp 720w, /assets/backgrounds/valley-golden-tall-1080.webp 1080w" sizes="100vw" />
            <img src="/assets/backgrounds/valley-golden-wide-1920.webp" srcSet="/assets/backgrounds/valley-golden-wide-1280.webp 1280w, /assets/backgrounds/valley-golden-wide-1920.webp 1920w" sizes="100vw" alt="" loading="lazy" decoding="async" />
          </picture>
          <motion.picture style={{ opacity: dusk }}>
            <source media="(max-width: 767px)" srcSet="/assets/backgrounds/valley-dusk-tall-720.webp 720w, /assets/backgrounds/valley-dusk-tall-1080.webp 1080w" sizes="100vw" />
            <img src="/assets/backgrounds/valley-dusk-wide-1920.webp" srcSet="/assets/backgrounds/valley-dusk-wide-1280.webp 1280w, /assets/backgrounds/valley-dusk-wide-1920.webp 1920w" sizes="100vw" alt="" loading="lazy" decoding="async" />
          </motion.picture>
          <motion.div className="lp-invest-stars" style={{ opacity: stars }} />
          <div className="lp-invest-veil" />
        </div>

        <div className="lp-invest-inner">
          <div className="lp-invest-copy">
            <h2 id="lp-invest-title" className="lp-h2 lp-h2--light">
              {t.title} <em>{t.titleEm}</em>
            </h2>
            <p>{t.text}</p>
            <p className="lp-invest-note">{t.note}</p>
          </div>

          <figure className="lp-invest-panel">
            <img className="lp-invest-telescope" src="/assets/objects/telescope-256.webp" srcSet="/assets/objects/telescope-256.webp 256w, /assets/objects/telescope-512.webp 512w" sizes="140px" alt="" width={140} height={140} loading="lazy" />
            <div className="lp-invest-head">
              <span>{t.game}</span>
              <strong>
                {value} <small>{t.coins}</small>
              </strong>
              <em>{t.year(year)}</em>
            </div>
            <svg className="lp-invest-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.chart}>
              <defs>
                <linearGradient id="lp-invest-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f1d389" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#f1d389" stopOpacity="0" />
                </linearGradient>
                <clipPath id="lp-invest-reveal">
                  <motion.rect x="0" y="0" height={H} width={reveal} />
                </clipPath>
              </defs>
              {[0.25, 0.5, 0.75].map((k) => (
                <line key={k} x1="24" x2={W - 24} y1={H * k} y2={H * k} className="lp-invest-grid" />
              ))}
              <path d={AREA} fill="url(#lp-invest-fill)" clipPath="url(#lp-invest-reveal)" />
              <motion.path d={LINE} className="lp-invest-line" style={{ pathLength: draw }} />
            </svg>
            <ul className="lp-invest-supports">
              {t.supports.map((s) => (
                <li key={s.name}>
                  <strong>{s.name}</strong>
                  <span>{s.move}</span>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}
