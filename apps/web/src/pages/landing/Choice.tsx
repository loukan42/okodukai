import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChestArt } from "../../art/ChestArt";
import { CoinArt } from "../../art/CoinArt";

const CHOICES = [
  { verb: "Dépenser", where: "à la boutique familiale", text: "Un film à choisir, une sortie vélo : vous décidez des récompenses et de leur prix.", art: "shop" },
  { verb: "Garder", where: "dans son Coffre magique", text: "Pour s'offrir plus tard quelque chose de plus grand. Chaque lundi, le coffre lui donne une petite prime.", art: "chest" },
  { verb: "Placer", where: "dans une partie simulée", text: "Pour voir, relevé après relevé, ce que deviennent ses pièces.", art: "sprout" },
] as const;

function ChoiceArt({ art }: { art: (typeof CHOICES)[number]["art"] }) {
  if (art === "chest") return <ChestArt state="full" size={220} className="lp-choice-art" />;
  const src = art === "shop" ? "/assets/shop/shop-stall" : "/assets/objects/coin-sprout";
  const widths = art === "shop" ? [180, 360, 540] : [128, 256, 512];
  return <img className="lp-choice-art" src={`${src}-${widths[1]}.webp`} srcSet={widths.map((w) => `${src}-${w}.webp ${w}w`).join(", ")} sizes="220px" alt="" width={220} height={220} loading="lazy" decoding="async" />;
}

/** La boucle du produit en une phrase : il gagne, puis il choisit. Trois chemins partent de la même pièce. */
export function Choice() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const still = useMotionValue(1);
  const p = reduce ? still : scrollYProgress;
  const leftX = useTransform(p, [0, 1], ["-8vw", "0vw"]);
  const rightX = useTransform(p, [0, 1], ["10vw", "0vw"]);
  const draw = useTransform(p, [0.35, 1], [0, 1]);

  return (
    <section id="comment" className="lp-choice" ref={ref} aria-labelledby="lp-choice-title">
      <h2 id="lp-choice-title" className="lp-choice-title">
        <motion.span className="lp-choice-line" style={{ x: leftX }}>
          Il gagne <span className="lp-choice-coin" aria-hidden="true"><CoinArt size={96} /></span> 10.
        </motion.span>
        <motion.span className="lp-choice-line lp-choice-line--right" style={{ x: rightX }}>
          À lui de décider <em>quoi en faire.</em>
        </motion.span>
      </h2>

      <div className="lp-choice-map">
        <svg className="lp-choice-trail" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true">
          <path className="lp-choice-trail-base" d="M40 40 C 260 40, 240 150, 200 190 M40 40 C 520 40, 560 150, 600 230 M40 40 C 780 40, 960 110, 1000 170" />
          <motion.path className="lp-choice-trail-ink" style={{ pathLength: draw }} d="M40 40 C 260 40, 240 150, 200 190 M40 40 C 520 40, 560 150, 600 230 M40 40 C 780 40, 960 110, 1000 170" />
        </svg>
        <ol className="lp-choice-list">
          {CHOICES.map((c, i) => (
            <motion.li
              key={c.verb}
              className={`lp-choice-item lp-choice-item--${i + 1}`}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            >
              <ChoiceArt art={c.art} />
              <h3>
                {c.verb} <span>{c.where}</span>
              </h3>
              <p>{c.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>

      <p className="lp-choice-coda">
        Dépenser maintenant ou garder pour samedi ?<br />
        <strong>C'est déjà une décision financière.</strong>
      </p>
    </section>
  );
}
