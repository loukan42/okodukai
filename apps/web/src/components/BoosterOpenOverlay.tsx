import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import cardSingleImage from "../assets/cards/card-single.png";
import cardBoosterImage from "../assets/cards/card-booster.png";

interface RevealedCard {
  id: string;
  name: string;
  artworkUrl: string | null;
}

type Phase = "idle" | "zoom" | "shake" | "open" | "reveal";

/**
 * Reprend le design/animation du système de boosters "Heros de la classe"
 * (github.com/loukan42/kidsgamebook, CardOpenAnimation.tsx) : zoom → secousse
 * dorée → éclat d'ouverture → révélation des cartes en flip. Adapté ici sans
 * Tailwind (le projet utilise des tokens CSS custom) et sans le système de
 * points/achat de cet ancien produit — les boosters d'Okodukai se gagnent via
 * les quêtes, jamais en s'achetant (spec §90).
 */
export function BoosterOpenOverlay({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => Promise<RevealedCard[]>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const runningRef = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setCards([]);
      runningRef.current = false;
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;

    (async () => {
      setPhase("zoom");
      await new Promise((r) => setTimeout(r, 600));
      setPhase("shake");
      await new Promise((r) => setTimeout(r, 800));
      setPhase("open");
      const result = await onOpenRef.current();
      setCards(result);
      await new Promise((r) => setTimeout(r, 400));
      setPhase("reveal");
    })();
  }, [open]);

  if (!open || phase === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="booster-overlay"
        onClick={() => phase === "reveal" && onClose()}
      >
        {phase !== "reveal" && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              phase === "zoom"
                ? { scale: 1.2, opacity: 1, rotate: 0 }
                : phase === "shake"
                ? {
                    scale: 1.3,
                    opacity: 1,
                    rotate: [0, -3, 3, -3, 3, -2, 2, 0],
                    x: [0, -5, 5, -5, 5, -3, 3, 0],
                  }
                : { scale: 1.5, opacity: 1, rotate: 0 }
            }
            transition={
              phase === "zoom"
                ? { duration: 0.6, ease: "easeOut" }
                : phase === "shake"
                ? { duration: 0.8, ease: "easeInOut", times: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1] }
                : { duration: 0.3, ease: "easeOut" }
            }
            className="booster-pack"
          >
            <img src={cardBoosterImage} alt="Booster" className="booster-pack-img" />
            {phase === "shake" && (
              <motion.div
                className="booster-pack-glow"
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(251, 191, 36, 0.5)",
                    "0 0 60px rgba(251, 191, 36, 0.8)",
                    "0 0 30px rgba(251, 191, 36, 0.5)",
                  ],
                }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
            )}
            {phase === "open" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 3, opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.5 }}
                className="booster-pack-burst"
              />
            )}
          </motion.div>
        )}

        {phase === "reveal" && (
          <div className="booster-reveal" onClick={(e) => e.stopPropagation()}>
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display booster-reveal-title"
            >
              🎉 Nouvelles cartes !
            </motion.h2>

            <div className="booster-reveal-grid">
              {cards.map((card, index) => (
                <motion.div
                  key={card.id + index}
                  initial={{ rotateY: 180, opacity: 0, scale: 0.5, y: 50 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.5, type: "spring" }}
                  className="booster-reveal-item"
                >
                  <div className="gilded-frame">
                    <div className="gilded-inner">
                      <div className="gilded-aspect">
                        {card.artworkUrl ? (
                          <img src={card.artworkUrl} alt={card.name} className="gilded-image" />
                        ) : (
                          <img src={cardSingleImage} alt="" className="gilded-image" />
                        )}
                        <motion.div
                          className="gilded-shine"
                          initial={{ x: "-100%" }}
                          animate={{ x: "200%" }}
                          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 + index * 0.15 }}
                        />
                      </div>
                    </div>
                    <motion.div
                      className="gilded-glow"
                      animate={{
                        boxShadow: [
                          "0 0 15px rgba(251, 191, 36, 0.4)",
                          "0 0 25px rgba(251, 191, 36, 0.7)",
                          "0 0 15px rgba(251, 191, 36, 0.4)",
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
                    />
                  </div>
                  <p className="booster-reveal-name">{card.name}</p>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="booster-reveal-hint"
            >
              Touche l'écran pour continuer
            </motion.p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
