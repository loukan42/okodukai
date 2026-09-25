import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RARITY_LABELS, type CardRarity } from "@okodukai/shared";
import cardSingleImage from "../assets/cards/card-single.png";
import cardBoosterImage from "../assets/cards/card-booster.png";
import { GameIcon } from "./GameIcon";
import { RarityBadge } from "./RarityBadge";
import { useDialogFocus } from "../lib/useDialogFocus";
import { tiltCard, resetCardTilt } from "../lib/cardTilt";

interface RevealedCard { id: string; name: string; rarity: CardRarity; artworkUrl: string | null }
type Phase = "loading" | "orb" | "shatter" | "featured" | "results" | "error";
const RANK: Record<CardRarity, number> = { COMMUNE: 0, PEU_COMMUNE: 1, RARE: 2, EPIQUE: 3, LEGENDAIRE: 4 };
const REQUIRED_HITS = 3;

/** Cards are drawn and credited by the server. The child controls only their reveal. */
export function BoosterOpenOverlay({ open, onOpen, onClose }: { open: boolean; onOpen: () => Promise<RevealedCard[]>; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [hits, setHits] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const hitsRef = useRef(0);
  const skipRequested = useRef(false);
  const ready = useRef(false);
  const onOpenRef = useRef(onOpen);
  const sceneRef = useDialogFocus<HTMLDivElement>(open);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open) { setPhase("loading"); setCards([]); setHits(0); hitsRef.current = 0; skipRequested.current = false; ready.current = false; return; }
    let cancelled = false;
    setPhase("loading");
    setHits(0);
    hitsRef.current = 0;
    ready.current = false;
    onOpenRef.current().then((result) => {
      if (cancelled) return;
      setCards(result);
      ready.current = true;
      setPhase(skipRequested.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "results" : "orb");
    }).catch(() => { if (!cancelled) setPhase("error"); });
    return () => { cancelled = true; };
  }, [open, attempt]);

  useEffect(() => {
    if (phase !== "shatter") return;
    const timer = window.setTimeout(() => setPhase("featured"), 780);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (phase === "results" || phase === "error") onClose();
      else { skipRequested.current = true; if (ready.current) setPhase("results"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  useEffect(() => {
    if (!open) return;
    if (phase === "featured" || phase === "results") sceneRef.current?.scrollTo({ top: 0 });
    const selector = phase === "orb" ? ".crystal-button" : phase === "featured" ? ".featured-reveal h2" : phase === "results" ? ".booster-results h2" : "button";
    sceneRef.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [open, phase, sceneRef]);

  function strikeCrystal() {
    if (phase !== "orb" || !ready.current) return;
    const next = Math.min(REQUIRED_HITS, hitsRef.current + 1);
    hitsRef.current = next;
    setHits(next);
    if (next === REQUIRED_HITS) setPhase("shatter");
  }

  function skip() {
    skipRequested.current = true;
    if (ready.current) setPhase("results");
  }

  if (!open) return null;
  const featured = [...cards].sort((a, b) => RANK[b.rarity] - RANK[a.rarity])[0];
  const counts = cards.reduce((acc, card) => { acc[card.rarity] = (acc[card.rarity] ?? 0) + 1; return acc; }, {} as Partial<Record<CardRarity, number>>);

  return <div ref={sceneRef} className={`booster-scene booster-scene--${phase}`} role="dialog" aria-modal="true" aria-label="Ouverture du booster">
    <div className="booster-stars" aria-hidden="true" />
    <div className="booster-speedlines" aria-hidden="true" />
    {phase !== "results" && phase !== "error" && <button className="booster-skip" onClick={skip}>Passer l'animation <GameIcon name="arrow" size={18}/></button>}

    {phase === "loading" && <div className="booster-summon" role="status" aria-live="polite">
      <div className="summon-ring"><span className="summon-ring-inner"><img src={cardBoosterImage} alt="Booster en cours d'ouverture" /></span></div>
      <h2>Le booster s'éveille</h2><p>Préparation de tes cartes…</p>
    </div>}

    {(phase === "orb" || phase === "shatter") && <div className={`crystal-stage crystal-stage--hits-${hits} ${phase === "shatter" ? "crystal-stage--shatter" : ""}`}>
      <p className="crystal-kicker">Ton booster est prêt</p>
      <div className="crystal-sigil">
        <span className="crystal-sigil-ring crystal-sigil-ring--outer" aria-hidden="true" />
        <span className="crystal-sigil-ring crystal-sigil-ring--inner" aria-hidden="true" />
        <span className="crystal-sigil-lines" aria-hidden="true" />
        <button type="button" className="crystal-button" onClick={strikeCrystal} disabled={phase === "shatter"} aria-label={`Briser le cristal : ${REQUIRED_HITS - hits} impact${REQUIRED_HITS - hits > 1 ? "s" : ""} restant${REQUIRED_HITS - hits > 1 ? "s" : ""}`}>
          <span className="crystal-core"><span className="crystal-highlight"/><span className="crystal-facets"/>
            <svg className="crystal-cracks" viewBox="0 0 240 240" aria-hidden="true"><path className="crystal-crack crystal-crack--one" d="M119 116 101 91 89 74 67 69M119 116 128 143 121 173 133 193"/><path className="crystal-crack crystal-crack--two" d="M119 116 150 105 177 111 197 97M119 116 84 131 56 127 38 143"/><path className="crystal-crack crystal-crack--three" d="M119 116 134 82 158 55M119 116 156 145 179 167M119 116 97 104 73 92"/></svg>
          </span>
        </button>
        <div className="crystal-shards" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <span key={index} style={{ "--shard-angle": `${index * (360 / 14)}deg`, "--shard-distance": `${140 + index % 3 * 42}px`, "--shard-delay": `${index % 4 * 25}ms` } as CSSProperties}/>)}</div>
      </div>
      <div className="crystal-progress" role="status" aria-live="polite"><span>{phase === "shatter" ? "Le cristal se brise" : hits === 0 ? "Clique ou touche le cristal" : `${hits} impact${hits > 1 ? "s" : ""} sur ${REQUIRED_HITS}`}</span><span className="crystal-progress-marks" aria-hidden="true">{Array.from({ length: REQUIRED_HITS }, (_, index) => <i className={index < hits ? "active" : ""} key={index}/>)}</span></div>
      <h2>{phase === "shatter" ? "La lumière se libère" : "Brise le cristal"}</h2>
      <p>{phase === "shatter" ? "Tes cartes apparaissent…" : "Trois impacts pour découvrir les cartes de ton booster."}</p>
    </div>}

    {phase === "featured" && featured && <div className={`featured-reveal rarity-scene-${featured.rarity.toLowerCase()}`}>
      <p className="featured-reveal-kicker">La première révélation</p>
      <div className="featured-reveal-aura" aria-hidden="true" />
      <div className="featured-reveal-card" onPointerMove={tiltCard} onPointerLeave={resetCardTilt}><img src={featured.artworkUrl ?? cardSingleImage} alt={featured.name}/><span className="card-pointer-glint" aria-hidden="true"/></div>
      <RarityBadge rarity={featured.rarity}/><h2 tabIndex={-1}>{featured.name}</h2><p>Cette carte rejoint ta collection.</p>
      <button className="btn btn-gold featured-reveal-action" onClick={() => setPhase("results")}>Découvrir mes {cards.length} cartes <GameIcon name="arrow" size={18}/></button>
    </div>}

    {phase === "results" && <div className="booster-results">
      <p className="booster-results-kicker">Booster ouvert</p><h2 tabIndex={-1}>Les cartes de ton booster</h2>
      <div className="booster-results-grid">{cards.map((card, index) => <div className={`booster-result-card rarity-frame-${card.rarity.toLowerCase()}`} key={`${card.id}-${index}`} onPointerMove={tiltCard} onPointerLeave={resetCardTilt}>
        <div className="booster-result-art"><img src={card.artworkUrl ?? cardSingleImage} alt={card.name}/><span className="card-pointer-glint" aria-hidden="true"/><span className="booster-result-number">{String(index + 1).padStart(2,"0")}</span></div>
        <div className="booster-result-meta"><strong>{card.name}</strong><RarityBadge rarity={card.rarity}/></div>
      </div>)}</div>
      <div className="booster-results-footer"><div className="booster-summary" aria-label="Résumé des raretés">{Object.entries(counts).map(([rarity, count]) => <span key={rarity}>{RARITY_LABELS[rarity as CardRarity]} ×{count}</span>)}</div><button className="btn btn-gold" onClick={onClose}>Retour à ma collection</button></div>
    </div>}

    {phase === "error" && <div className="booster-error"><GameIcon name="gift" size={42}/><h2>Le booster n'a pas pu s'ouvrir.</h2><p>Vérifie ta connexion, puis réessaie.</p><div className="row"><button className="btn btn-gold" onClick={() => setAttempt((n) => n + 1)}>Réessayer</button><button className="btn btn-ghost" onClick={onClose}>Fermer</button></div></div>}
  </div>;
}
