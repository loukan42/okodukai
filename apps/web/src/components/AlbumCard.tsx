import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CardRarity } from "@okodukai/shared";
import { GameIcon } from "./GameIcon";
import { RarityBadge } from "./RarityBadge";
import { useDialogFocus } from "../lib/useDialogFocus";
import { tiltCard, resetCardTilt } from "../lib/cardTilt";

interface AlbumCardProps { imageUrl: string | null; title: string; unlocked: boolean; cardNumber: number; rarity: CardRarity; quantity: number }

/** Existing collection art, with the reference's stage lighting and clear rarity treatment. */
export function AlbumCard({ imageUrl, title, unlocked, cardNumber, rarity, quantity }: AlbumCardProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const dialogRef = useDialogFocus<HTMLDivElement>(open);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [open]);

  const visual = <><span className={`album-card-frame rarity-${rarity.toLowerCase().replace("_", "-")} ${unlocked ? "" : "album-card-frame--locked"}`}><span className="gilded-inner"><span className="gilded-aspect">
    {imageUrl && <img src={imageUrl} alt="" className="gilded-image" loading="lazy"/>}{unlocked && <span className="card-pointer-glint" aria-hidden="true"/>}{!unlocked && <span className="album-card-locked-overlay"><span className="album-card-locked-icon"><GameIcon name="lock" size={21}/></span></span>}
  </span></span></span><span className="album-card-caption"><span className="album-card-name">{unlocked ? title : `Carte ${String(cardNumber).padStart(2,"0")}`}</span>{unlocked && <RarityBadge rarity={rarity}/>}</span></>;

  return <>
    {unlocked ? <button type="button" className="album-card" onClick={() => setOpen(true)} onPointerMove={tiltCard} onPointerLeave={resetCardTilt} aria-label={`Voir ${title}, ${quantity} exemplaire${quantity > 1 ? "s" : ""}`}>
      {visual}{quantity > 1 && <span className="album-card-quantity">×{quantity}</span>}
    </button> : <div className="album-card album-card--locked" aria-label={`Carte ${cardNumber} non trouvée`}>{visual}</div>}

    <AnimatePresence>{open && <motion.div className="card-modal-backdrop album-theatre" role="dialog" aria-modal="true" aria-label={`Carte ${title}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setOpen(false)}>
      <div ref={dialogRef} className={`album-theatre-inner rarity-stage-${rarity.toLowerCase()}`} onClick={(e) => e.stopPropagation()}>
        <button className="card-modal-close" onClick={() => setOpen(false)} aria-label="Fermer la carte"><GameIcon name="close" size={21}/></button>
        <p className="album-theatre-kicker">Carte #{String(cardNumber).padStart(2,"0")}</p>
        <motion.div className="album-theatre-card" initial={reduceMotion ? false : {rotateY:90,scale:.82}} animate={{rotateY:0,scale:1}} transition={{duration:reduceMotion ? 0 : .55,ease:[.23,1,.32,1]}}>
          {imageUrl && <img src={imageUrl} alt={title}/>}<span className="album-theatre-shine" aria-hidden="true"/>
        </motion.div>
        <h2>{title}</h2><div className="album-theatre-details"><RarityBadge rarity={rarity}/><span>{quantity} exemplaire{quantity > 1 ? "s" : ""}</span></div>
      </div>
    </motion.div>}</AnimatePresence>
  </>;
}
