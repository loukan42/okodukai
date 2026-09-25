import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AlbumCardProps {
  imageUrl: string | null;
  title: string;
  unlocked: boolean;
  cardNumber: number;
}

/** Carte d'album avec flip 3D en plein écran au clic — reprend CollectionCard.tsx de kidsgamebook. */
export function AlbumCard({ imageUrl, title, unlocked, cardNumber }: AlbumCardProps) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  function handleClick() {
    if (!unlocked) return;
    setOpen(true);
    setFlipped(false);
    setTimeout(() => setFlipped(true), 100);
  }

  return (
    <>
      <button type="button" className="album-card" disabled={!unlocked} onClick={handleClick}>
        <div className={`album-card-frame ${unlocked ? "" : "album-card-frame--locked"}`}>
          <div className="gilded-inner">
            <div className="gilded-aspect">
              {unlocked && imageUrl ? (
                <img src={imageUrl} alt={title} className="gilded-image" loading="lazy" />
              ) : (
                <div className="album-card-locked-overlay">
                  <span className="album-card-locked-icon" aria-hidden>
                    🔒
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className={`album-card-name ${unlocked ? "" : "album-card-name--locked"}`}>
          {unlocked ? title : `#${cardNumber}`}
        </p>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card-modal-backdrop"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className="card-modal-close" onClick={() => setOpen(false)} aria-label="Fermer">
                ✕
              </button>

              <motion.div
                className="card-modal-flip"
                style={{ transformStyle: "preserve-3d" }}
                initial={{ rotateY: 180 }}
                animate={{ rotateY: flipped ? 0 : 180 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
              >
                <div
                  className="card-modal-face card-modal-face--back"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", aspectRatio: "3 / 4" }}
                >
                  <span style={{ fontSize: 64, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>?</span>
                </div>

                <div className="card-modal-face card-modal-face--front" style={{ backfaceVisibility: "hidden" }}>
                  <div className="gilded-inner">
                    <div className="gilded-aspect">
                      {imageUrl && <img src={imageUrl} alt={title} className="gilded-image" />}
                      <motion.div
                        className="gilded-shine"
                        initial={{ x: "-100%" }}
                        animate={{ x: flipped ? "200%" : "-100%" }}
                        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: flipped ? 1 : 0, y: flipped ? 0 : 10 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="font-display card-modal-title"
                style={{ fontSize: 22 }}
              >
                {title}
              </motion.h3>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
