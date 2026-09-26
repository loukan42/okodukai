import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { RARITY_LABELS, type CardRarity } from "@okodukai/shared";
import { useDialogFocus } from "../../lib/useDialogFocus";
import { COPY } from "./copy";
import { RuneCircle } from "./RuneCircle";
import { createSkyEngine, type SkyEngine } from "./skyEngine";
import { setSoundEnabled, sfx, soundEnabled } from "./sfx";

export interface RevealedCard {
  id: string;
  name: string;
  rarity: CardRarity;
  artworkUrl: string | null;
  isNew?: boolean;
  description?: string | null;
}

type Phase = "summon" | "crystal" | "shatter" | "announce" | "reveal" | "summary" | "error";

const RANK: Record<CardRarity, number> = { COMMUNE: 0, PEU_COMMUNE: 1, RARE: 2, EPIQUE: 3, LEGENDAIRE: 4 };
const REQUIRED_HITS = 3;
const NEUTRAL = ["#dff1ff", "#8fc8ff", "#ffffff"];
/** Couleurs des éclats par rareté (hexadécimal : le moteur en dérive les halos). */
const FX: Record<CardRarity, string[]> = {
  COMMUNE: ["#f2f6ff", "#c9d6ea", "#ffffff"],
  PEU_COMMUNE: ["#8fd0ff", "#4aa3ec", "#e6f6ff"],
  RARE: ["#cfaaff", "#9a68e6", "#f3e9ff"],
  EPIQUE: ["#ffe08a", "#f2b53c", "#fff4d1"],
  LEGENDAIRE: ["#ffd36e", "#ff8a5c", "#ff6fb5", "#b58cff", "#6fd3ff", "#8fffc1"],
};

const slug = (rarity: CardRarity) => rarity.toLowerCase().replace("_", "-");
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* pas de vibreur */
  }
};
function centerOf(element: Element | null | undefined) {
  if (!element) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
/** Du plus courant au plus rare : la meilleure carte arrive en dernier. */
function revealOrder(cards: RevealedCard[]) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => RANK[a.card.rarity] - RANK[b.card.rarity] || a.index - b.index)
    .map(({ card }) => card);
}
function Stars({ rarity }: { rarity: CardRarity }) {
  return (
    <span className="summon-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i <= RANK[rarity] ? "on" : ""} />
      ))}
    </span>
  );
}
function CardBack() {
  return (
    <span className="summon-back">
      <svg viewBox="0 0 200 300" aria-hidden="true">
        <rect className="summon-back-frame" x="9" y="9" width="182" height="282" rx="12" />
        <rect className="summon-back-frame summon-back-frame--thin" x="18" y="18" width="164" height="264" rx="8" />
        <circle className="summon-back-frame summon-back-frame--thin" cx="100" cy="150" r="54" />
        <circle className="summon-back-frame summon-back-frame--thin" cx="100" cy="150" r="42" />
        <path className="summon-back-star" d="M100 104 L108 142 L146 150 L108 158 L100 196 L92 158 L54 150 L92 142 Z" />
        <path className="summon-back-star summon-back-star--small" d="M100 126 L104 146 L124 150 L104 154 L100 174 L96 154 L76 150 L96 146 Z" />
        {[[40, 44], [160, 44], [40, 256], [160, 256]].map(([x, y]) => (
          <path key={`${x}-${y}`} className="summon-back-star summon-back-star--corner" d={`M${x} ${y - 9} L${x + 2.5} ${y - 2.5} L${x + 9} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 9} L${x - 2.5} ${y + 2.5} L${x - 9} ${y} L${x - 2.5} ${y - 2.5} Z`} />
        ))}
      </svg>
    </span>
  );
}
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
    </svg>
  );
}

interface Props {
  open: boolean;
  /** Le tirage est fait et crédité par le serveur ; l'enfant ne contrôle que la mise en scène. */
  onOpen: () => Promise<RevealedCard[]>;
  onClose: () => void;
  universeTitle?: string;
  /** Autres boosters non ouverts, pour enchaîner sans repasser par la collection. */
  remaining?: number;
  onOpenNext?: () => void;
}

export function BoosterOpenOverlay({ open, onOpen, onClose, universeTitle, remaining = 0, onOpenNext }: Props) {
  const [phase, setPhase] = useState<Phase>("summon");
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hits, setHits] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [sound, setSound] = useState(soundEnabled);
  const sceneRef = useDialogFocus<HTMLDivElement>(open);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<RevealedCard[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SkyEngine | null>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const phaseRef = useRef<Phase>(phase);
  const hitsRef = useRef(0);
  const holdRef = useRef<number>();
  const skipRef = useRef(false);
  const announcedRef = useRef(new Set<number>());
  const timersRef = useRef<number[]>([]);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  phaseRef.current = phase;
  cardsRef.current = cards;

  /** Secousse de l'écran (Web Animations : ne remonte aucun élément, ne vole pas le focus). */
  function shakeScreen(strength: number) {
    if (prefersReducedMotion()) return;
    const s = strength;
    stageRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${-s}px,${s * 0.6}px)` },
        { transform: `translate(${s * 0.8}px,${-s * 0.5}px)` },
        { transform: `translate(${-s * 0.5}px,${-s * 0.3}px)` },
        { transform: `translate(${s * 0.3}px,${s * 0.2}px)` },
        { transform: "translate(0,0)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }

  const card = cards[index];
  const best = cards[cards.length - 1];
  const hint = best && RANK[best.rarity] >= RANK.RARE ? best.rarity : null;
  const later = (ms: number, fn: () => void) => timersRef.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Ciel animé (absent si l'enfant a demandé moins d'animations).
  useEffect(() => {
    if (!open || !canvasRef.current || prefersReducedMotion()) return;
    const engine = createSkyEngine(canvasRef.current);
    engineRef.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const warp: Record<Phase, number> = { summon: 0.7, crystal: 0.1, shatter: 1, announce: 0.45, reveal: 0.05, summary: 0.03, error: 0 };
    engineRef.current?.setWarp(warp[phase]);
  }, [phase]);

  // Tirage : la requête part pendant l'éveil ; on attend au moins la fin de l'éveil.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    clearTimers();
    setPhase("summon");
    setCards([]);
    setIndex(0);
    setFlipped(false);
    setHits(0);
    hitsRef.current = 0;
    skipRef.current = false;
    announcedRef.current = new Set();
    const started = performance.now();
    sfx.summon();
    onOpenRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setCards(revealOrder(result));
        if (skipRef.current || prefersReducedMotion()) return setPhase("summary");
        later(Math.max(0, 1600 - (performance.now() - started)), () => {
          if (!cancelled && phaseRef.current === "summon") setPhase(skipRef.current ? "summary" : "crystal");
        });
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
      clearTimers();
      window.clearInterval(holdRef.current);
    };
  }, [open, attempt]);

  // Focus : l'élément à actionner à chaque étape.
  useEffect(() => {
    if (!open) return;
    if (phase === "crystal") orbRef.current?.focus({ preventScroll: true });
    if (phase === "reveal") sceneRef.current?.querySelector<HTMLElement>(".summon-btn--primary")?.focus({ preventScroll: true });
    if (phase === "summary" || phase === "error") titleRef.current?.focus({ preventScroll: true });
  }, [open, phase, index, sceneRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (phaseRef.current === "summary" || phaseRef.current === "error") onClose();
      else skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  function skip() {
    skipRef.current = true;
    clearTimers();
    window.clearInterval(holdRef.current);
    // Tirage encore en route : la réponse mènera directement au récapitulatif.
    if (cardsRef.current.length > 0) setPhase("summary");
  }

  function hit() {
    if (phaseRef.current !== "crystal" || hitsRef.current >= REQUIRED_HITS) return;
    const n = hitsRef.current + 1;
    hitsRef.current = n;
    setHits(n);
    sfx.hit(n - 1);
    vibrate(10 + n * 8);
    const { x, y } = centerOf(orbRef.current);
    engineRef.current?.burst({ x, y, colors: n >= 2 && hint ? FX[hint] : NEUTRAL, count: 18 + n * 12, speed: 340 + n * 90, life: 0.8, size: 6 });
    if (n === REQUIRED_HITS) {
      window.clearInterval(holdRef.current);
      later(260, shatter);
    }
  }

  function shatter() {
    setPhase("shatter");
    shakeScreen(9);
    sfx.shatter();
    vibrate([25, 40, 35]);
    const { x, y } = centerOf(orbRef.current);
    const colors = hint ? FX[hint] : NEUTRAL;
    const engine = engineRef.current;
    engine?.burst({ x, y, colors, count: 60, speed: 1100, life: 1.3, size: 9, kind: "shard" });
    engine?.burst({ x, y, colors, count: 70, speed: 760, life: 1.5, size: 8 });
    engine?.burst({ x, y, colors: ["#ffffff"], count: 40, speed: 420, life: 0.9, size: 5, kind: "dot" });
    later(1050, () => goTo(0));
  }

  function goTo(next: number) {
    clearTimers();
    if (next >= cards.length) return setPhase("summary");
    setIndex(next);
    setFlipped(false);
    const rarity = cards[next].rarity;
    if (RANK[rarity] >= RANK.EPIQUE && !announcedRef.current.has(next)) {
      announcedRef.current.add(next);
      setPhase("announce");
      sfx.announce(rarity);
      vibrate(rarity === "LEGENDAIRE" ? [30, 60, 30, 60, 60] : [30, 60, 40]);
      const { x, y } = centerOf(titleRef.current);
      later(250, () => engineRef.current?.burst({ x, y, colors: FX[rarity], count: 80, speed: 900, life: 1.6, size: 8 }));
      later(rarity === "LEGENDAIRE" ? 3300 : 1900, () => setPhase("reveal"));
      return;
    }
    setPhase("reveal");
    if (RANK[rarity] <= RANK.PEU_COMMUNE) later(520, () => flip(next));
  }

  function flip(at = index) {
    if (phaseRef.current !== "reveal" && phaseRef.current !== "announce") return;
    setPhase("reveal");
    setFlipped(true);
    const rarity = cards[at].rarity;
    const rank = RANK[rarity];
    sfx.flip(rarity);
    if (rank >= RANK.EPIQUE) {
      later(200, () => shakeScreen(rank === RANK.LEGENDAIRE ? 12 : 7));
      vibrate(rank === RANK.LEGENDAIRE ? [40, 50, 80] : 35);
    }
    // Laisser la carte se retourner avant la gerbe, centrée sur la carte.
    later(260, () => {
      // Centre du support (non animé) : la carte peut encore finir son arrivée.
      const { x, y } = centerOf(cardWrapRef.current);
      const engine = engineRef.current;
      engine?.burst({ x, y, colors: FX[rarity], count: 24 + rank * 26, speed: 380 + rank * 170, life: 1 + rank * 0.25, size: 6 + rank });
      if (rank >= RANK.RARE) {
        // Pluie d'étoiles qui retombe : plus longue pour les plus rares.
        for (let wave = 0; wave < rank - 1; wave++) {
          later(220 + wave * 380, () =>
            engine?.burst({ x, y: y - 40, colors: FX[rarity], count: 26, speed: 620, gravity: 520, life: 2, size: 7, angle: -Math.PI / 2, spread: 1.6 })
          );
        }
      }
    });
  }

  function primaryAction() {
    if (!flipped) return flip();
    goTo(index + 1);
  }

  function toggleSound() {
    setSoundEnabled(!sound);
    setSound(!sound);
  }

  function startHold() {
    hit();
    window.clearInterval(holdRef.current);
    holdRef.current = window.setInterval(hit, 320);
  }
  const stopHold = () => window.clearInterval(holdRef.current);

  if (!open) return null;
  const left = REQUIRED_HITS - hits;
  const newCount = cards.filter((c) => c.isNew).length;
  const showSkip = phase !== "summary" && phase !== "error";
  const orbTone = hits >= 2 && hint ? slug(hint) : "neutral";
  /** La fêlure du dernier coup se dessine ; les précédentes restent tracées. */
  const crackClass = (k: number) => (hits > k ? "on" : hits === k ? "on new" : "");

  // Portail sur <body> : un parent transformé ne doit pas enfermer la scène plein écran.
  return createPortal(
    <div
      ref={sceneRef}
      className={`summon summon--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={COPY.dialogLabel}
      onClick={(event) => {
        // Toucher le ciel fait avancer, comme le bouton principal (jamais sur un bouton ou la carte).
        if ((event.target as HTMLElement).closest("button, a")) return;
        if (phase === "announce") setPhase("reveal");
        else if (phase === "reveal" && flipped) goTo(index + 1);
      }}
    >
      <div className="summon-backdrop" aria-hidden="true" />
      <canvas ref={canvasRef} className="summon-sky" aria-hidden="true" />
      <div className="summon-stage" ref={stageRef}>
        <div className="summon-topbar">
          <button type="button" className="summon-icon-btn" onClick={toggleSound} aria-label={sound ? COPY.soundOn : COPY.soundOff} aria-pressed={!sound}>
            <SpeakerIcon on={sound} />
          </button>
          {showSkip && (
            <button type="button" className="summon-skip" onClick={skip}>
              {COPY.skip}
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                <path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" />
              </svg>
            </button>
          )}
        </div>

        {(phase === "summon" || phase === "crystal" || phase === "shatter") && (
          <div className={`summon-altar summon-altar--hits-${hits} summon-altar--${orbTone}`}>
            <p className="summon-kicker">{universeTitle ? COPY.boosterOf(universeTitle) : COPY.summonTitle}</p>
            <div className="summon-circle">
              <RuneCircle />
              <span className="summon-circle-glow" aria-hidden="true" />
              {phase === "summon" ? (
                <span className="summon-orb summon-orb--forming" aria-hidden="true">
                  <span className="summon-orb-core" />
                </span>
              ) : (
                <button
                  ref={orbRef}
                  type="button"
                  className="summon-orb"
                  aria-label={COPY.crystalLabel(left)}
                  disabled={phase === "shatter"}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    startHold();
                  }}
                  onPointerUp={stopHold}
                  onPointerCancel={stopHold}
                  onLostPointerCapture={stopHold}
                  onClick={(e) => {
                    if (e.detail === 0) hit(); // clavier et lecteurs d'écran
                  }}
                >
                  <span className="summon-orb-wobble" key={hits}>
                    <span className="summon-orb-core" />
                    <span className="summon-orb-nebula" />
                    <span className="summon-orb-shine" />
                    <svg className="summon-orb-cracks" viewBox="0 0 100 100" aria-hidden="true">
                      <path className={crackClass(1)} pathLength={1} d="M50 50 L41 38 L37 27 L28 22 M41 38 L33 41" />
                      <path className={crackClass(2)} pathLength={1} d="M50 50 L63 46 L72 50 L83 43 M63 46 L66 36 M50 50 L46 64 L38 71 L35 82" />
                      <path className={crackClass(3)} pathLength={1} d="M50 50 L57 63 L66 70 L69 81 M50 50 L37 52 L25 60 M50 50 L55 36 L60 24" />
                    </svg>
                  </span>
                  <svg className="summon-progress" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="56" />
                    <circle className="summon-progress-fill" cx="60" cy="60" r="56" pathLength={1} style={{ strokeDashoffset: 1 - hits / REQUIRED_HITS } as CSSProperties} />
                  </svg>
                </button>
              )}
              {phase === "shatter" && <span className="summon-shockwave" aria-hidden="true" />}
            </div>
            <div className="summon-prompt" role="status" aria-live="polite">
              {phase === "summon" && (
                <>
                  <h2 className="summon-prompt-title summon-prompt-title--calm">{COPY.summonTitle}</h2>
                  <p>{COPY.summonWaiting}</p>
                </>
              )}
              {phase === "crystal" && (
                <>
                  <h2 className="summon-prompt-title">{COPY.crystalPrompt}</h2>
                  <p>{hits === 2 && hint ? COPY.crystalHint : hits === 0 ? COPY.crystalHold : COPY.crystalLeft(left)}</p>
                </>
              )}
              {phase === "shatter" && <h2 className="summon-prompt-title">{COPY.crystalBreaking}</h2>}
            </div>
          </div>
        )}

        {phase === "announce" && card && (
          <div className={`summon-announce summon-announce--${slug(card.rarity)}`}>
            <h2 ref={titleRef} className="summon-announce-title" data-text={RARITY_LABELS[card.rarity]}>
              {RARITY_LABELS[card.rarity]}
            </h2>
            <Stars rarity={card.rarity} />
            <p className="summon-announce-sub">{COPY.announce[card.rarity]}</p>
            {card.rarity === "LEGENDAIRE" && (
              <div className="summon-cutin" aria-hidden="true">
                <div className="summon-cutin-band">
                  {card.artworkUrl && <img src={card.artworkUrl} alt="" />}
                  <strong>{card.name}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "reveal" && card && (
          <div className={`summon-reveal summon-fx--${slug(card.rarity)} ${flipped ? "is-flipped" : ""}`} key={index}>
            <p className="summon-counter">{COPY.counter(index + 1, cards.length)}</p>
            <div className="summon-card-wrap" ref={cardWrapRef}>
            <span className="summon-rays" aria-hidden="true" />
            {flipped && <span className="summon-shockwave summon-shockwave--card" aria-hidden="true" />}
            <button
              ref={cardRef}
              type="button"
              className="summon-card"
              onClick={() => !flipped && flip()}
              aria-label={flipped ? card.name : COPY.flipLabel}
              aria-disabled={flipped}
            >
              <span className="summon-card-inner">
                <span className="summon-card-face summon-card-face--back">
                  <CardBack />
                </span>
                <span className="summon-card-face summon-card-face--front">
                  {card.artworkUrl ? <img src={card.artworkUrl} alt="" /> : <CardBack />}
                  <span className="summon-card-holo" />
                </span>
              </span>
            </button>
            </div>
            <div className="summon-card-info" aria-live="polite">
              {flipped ? (
                <>
                  <p className="summon-rarity">
                    <Stars rarity={card.rarity} />
                    {RARITY_LABELS[card.rarity]}
                  </p>
                  <h2>{card.name}</h2>
                  {card.isNew ? <span className="summon-new">{COPY.newBadge}</span> : <span className="summon-owned">{COPY.owned}</span>}
                  {card.description && <p className="summon-quote">{card.description}</p>}
                </>
              ) : (
                <p className="summon-flip-hint">{RANK[card.rarity] >= RANK.RARE ? COPY.flipHint : " "}</p>
              )}
            </div>
            <div className="summon-actions">
              <button type="button" className="summon-btn summon-btn--ghost" onClick={skip}>
                {COPY.revealAll}
              </button>
              <button type="button" className="summon-btn summon-btn--primary" onClick={primaryAction}>
                {!flipped ? COPY.flip : index === cards.length - 1 ? COPY.seeAll : COPY.next}
              </button>
            </div>
          </div>
        )}

        {phase === "summary" && (
          <div className="summon-summary">
            <h2 ref={titleRef} tabIndex={-1}>
              {COPY.summaryTitle}
            </h2>
            <p className="summon-summary-lead">{newCount > 0 ? COPY.summaryNew(newCount) : COPY.summaryNoNew}</p>
            <ul className="summon-grid" style={{ "--count": cards.length } as CSSProperties}>
              {cards.map((c, i) => (
                <li key={`${c.id}-${i}`} className={`summon-mini summon-fx--${slug(c.rarity)}`} style={{ "--i": i } as CSSProperties}>
                  <span className="summon-mini-art">
                    {c.artworkUrl ? <img src={c.artworkUrl} alt="" loading="lazy" /> : <CardBack />}
                    {c.isNew && <span className="summon-mini-new">{COPY.newBadge}</span>}
                  </span>
                  <strong>{c.name}</strong>
                  <span className="summon-mini-rarity">
                    <Stars rarity={c.rarity} />
                    {RARITY_LABELS[c.rarity]}
                  </span>
                </li>
              ))}
            </ul>
            <div className="summon-summary-actions">
              {remaining > 0 && onOpenNext && (
                <button type="button" className="summon-btn summon-btn--primary" onClick={onOpenNext}>
                  {COPY.openNext(remaining)}
                </button>
              )}
              <button type="button" className={`summon-btn ${remaining > 0 && onOpenNext ? "summon-btn--ghost" : "summon-btn--primary"}`} onClick={onClose}>
                {COPY.back}
              </button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="summon-error">
            <h2 ref={titleRef} tabIndex={-1}>
              {COPY.errorTitle}
            </h2>
            <p>{COPY.errorBody}</p>
            <div className="summon-summary-actions">
              <button type="button" className="summon-btn summon-btn--primary" onClick={() => setAttempt((n) => n + 1)}>
                {COPY.retry}
              </button>
              <button type="button" className="summon-btn summon-btn--ghost" onClick={onClose}>
                {COPY.close}
              </button>
            </div>
          </div>
        )}
      </div>
      {phase === "shatter" && <span className="summon-flash" aria-hidden="true" />}
    </div>,
    document.body
  );
}
