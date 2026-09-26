import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import type { CardRarity } from "@okodukai/shared";
import { RarityBadge } from "../../components/RarityBadge";
import { BoosterPack } from "../../components/booster/BoosterPack";

/** Vraies cartes du contenu Okodukai, avec leur vraie rareté (base de contenu). */
const CARDS: { title: string; src: string; rarity: CardRarity }[] = [
  { title: "Dragon", src: "/cards/Créatures fantastiques/Dragon.webp", rarity: "COMMUNE" },
  { title: "Marco Polo", src: "/cards/Les grands explorateurs/Marco Polo.webp", rarity: "PEU_COMMUNE" },
  { title: "Neptune", src: "/cards/Les planètes du système solaire/Neptune.webp", rarity: "RARE" },
  { title: "Le feu", src: "/cards/Les Grandes inventions/Le feu.webp", rarity: "LEGENDAIRE" },
  { title: "Athéna", src: "/cards/Dieux Grecs/Athéna.webp", rarity: "EPIQUE" },
  { title: "Golem de pierre", src: "/cards/Créatures fantastiques/Golem de pierre.webp", rarity: "RARE" },
  { title: "Tokyo", src: "/cards/Les grandes capitales/Tokyo.webp", rarity: "PEU_COMMUNE" },
];

const MID = (CARDS.length - 1) / 2;

function FanCard({ card, index, open }: { card: (typeof CARDS)[number]; index: number; open: MotionValue<number> }) {
  const offset = index - MID;
  // Éventail ouvert autour d'un pivot sous le paquet : rotation, arc et profondeur viennent d'un seul angle.
  const rotate = useTransform(open, [0, 1], [offset * 2, offset * 11]);
  const x = useTransform(open, [0, 1], [offset * 6, offset * 128]);
  const y = useTransform(open, [0, 1], [30, Math.abs(offset) * Math.abs(offset) * 9 - 40]);
  const z = useTransform(open, [0, 1], [-40, index === MID ? 90 : -Math.abs(offset) * 22]);
  const scale = useTransform(open, [0, 1], [0.7, index === MID ? 1.08 : 1]);
  return (
    <motion.figure className={`lp-fan-card${index === MID ? " lp-fan-card--lead" : ""}`} style={{ rotate, x, y, z, scale, zIndex: 10 - Math.abs(offset) }}>
      <span className={`album-card-frame rarity-${card.rarity.toLowerCase().replace("_", "-")}`}>
        <span className="gilded-inner">
          <span className="gilded-aspect">
            <img src={encodeURI(card.src)} alt="" className="gilded-image" loading="lazy" decoding="async" />
          </span>
        </span>
      </span>
      <figcaption>
        <span>{card.title}</span>
        <RarityBadge rarity={card.rarity} />
      </figcaption>
    </motion.figure>
  );
}

/** Rupture de ton, plus « jeu » : la nuit tombe, le booster s'ouvre et les cartes se déploient en éventail. */
export function CollectionScene() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const still = useMotionValue(1);
  const p = reduce ? still : scrollYProgress;
  const open = useTransform(p, [0.08, 0.6], [0, 1]);
  const packY = useTransform(p, [0.05, 0.6], [0, 150]);
  const packScale = useTransform(p, [0.05, 0.6], [1, 0.72]);
  const glow = useTransform(p, [0.05, 0.5], [0.35, 1]);

  return (
    <section id="collection" className="lp-collection" ref={ref} aria-labelledby="lp-collection-title">
      <div className="lp-collection-sticky">
        <div className="lp-collection-copy">
          <h2 id="lp-collection-title" className="lp-h2 lp-h2--light">
            Les bonnes habitudes méritent aussi <em>leurs trésors.</em>
          </h2>
          <p>Des boosters gagnés avec les quêtes, jamais achetés. 14 univers, 105 cartes, cinq raretés. Vous choisissez les univers ouverts à votre enfant.</p>
        </div>
        <div className="lp-fan" aria-label="Sept cartes de la collection, de Commune à Légendaire" role="img">
          <motion.div className="lp-fan-glow" style={{ opacity: glow }} aria-hidden="true" />
          <div className="lp-fan-cards" aria-hidden="true">
            {CARDS.map((card, i) => (
              <FanCard key={card.title} card={card} index={i} open={open} />
            ))}
          </div>
          <motion.div className="lp-fan-pack" style={{ y: packY, scale: packScale }} aria-hidden="true">
            <BoosterPack universe="Créatures fantastiques" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
