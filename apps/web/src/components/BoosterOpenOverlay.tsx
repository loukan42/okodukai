import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RARITY_ICONS, RARITY_LABELS, type CardRarity } from "@okodukai/shared";

interface RevealedCard {
  id: string;
  name: string;
  rarity: CardRarity;
  artworkUrl: string | null;
}

const RARITY_GLOW: Record<CardRarity, string> = {
  COMMUNE: "rgba(154,163,174,0.5)",
  PEU_COMMUNE: "rgba(62,124,177,0.55)",
  RARE: "rgba(123,79,160,0.6)",
  EPIQUE: "rgba(217,162,43,0.65)",
  LEGENDAIRE: "rgba(233,120,180,0.75)",
};

export function BoosterOpenOverlay({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => Promise<RevealedCard[]>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "shake" | "reveal">("idle");
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
      setPhase("shake");
      await new Promise((r) => setTimeout(r, 900));
      const result = await onOpenRef.current();
      setCards(result);
      setPhase("reveal");
    })();
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,26,38,0.92)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => phase === "reveal" && onClose()}
      >
        {phase === "shake" && (
          <motion.div
            animate={{ rotate: [0, -4, 4, -4, 4, -2, 2, 0], scale: [1, 1.05, 1.05, 1.08, 1.08, 1.1, 1.1, 1.15] }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            style={{ fontSize: 90 }}
          >
            🎁
          </motion.div>
        )}

        {phase === "reveal" && (
          <div style={{ width: "100%", maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display"
              style={{ textAlign: "center", color: "#fff", fontSize: 26, marginBottom: 24 }}
            >
              🎉 Nouvelles cartes !
            </motion.h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(cards.length, 5)}, 1fr)`,
                gap: 14,
              }}
            >
              {cards.map((card, i) => (
                <motion.div
                  key={card.id + i}
                  initial={{ rotateY: 180, opacity: 0, y: 30 }}
                  animate={{ rotateY: 0, opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, type: "spring", damping: 14 }}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: 8,
                    boxShadow: `0 0 24px ${RARITY_GLOW[card.rarity]}`,
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "3 / 4",
                      borderRadius: 10,
                      background: "linear-gradient(160deg, var(--parchment), var(--parchment-dim))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 34,
                      marginBottom: 6,
                    }}
                  >
                    {card.artworkUrl ? (
                      <img src={card.artworkUrl} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                    ) : (
                      RARITY_ICONS[card.rarity]
                    )}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, textAlign: "center", margin: "4px 0 2px" }}>{card.name}</p>
                  <p style={{ fontSize: 10, textAlign: "center", color: "var(--ink-faint)", margin: 0 }}>
                    {RARITY_LABELS[card.rarity]}
                  </p>
                </motion.div>
              ))}
            </div>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", marginTop: 24, fontSize: 13 }}>
              Touche l'écran pour continuer
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
