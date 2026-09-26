import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useDialogFocus } from "../lib/useDialogFocus";
import { CoinFlight, type Flight } from "../art/CoinFlight";
import { BoosterPack } from "./booster/BoosterPack";
import { GameIcon } from "./GameIcon";

interface Notification {
  id: string;
  type: string;
  readAt: string | null;
  payload: { questTitle?: string; rewardCoins?: number; rewardXp?: number; boosters?: number };
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/**
 * Fête des quêtes validées : à l'ouverture de l'espace enfant, les validations pas encore vues
 * sont réunies en un seul moment (pièces qui volent vers « Mon argent », XP, booster gagné).
 * Les montants viennent de la notification écrite par le serveur au moment du crédit.
 */
export function QuestRewardCelebration() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const open = items.length > 0;
  const dialogRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ notifications: Notification[] }>("/notifications")
      .then(({ notifications }) => {
        // Seules les notifications qui portent leurs montants (écrites au crédit) sont fêtées.
        if (!cancelled) setItems(notifications.filter((n) => n.type === "quest_validee" && !n.readAt && typeof n.payload.rewardCoins === "number"));
      })
      .catch(() => {
        /* la fête attendra la prochaine visite */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const coins = items.reduce((sum, n) => sum + (n.payload.rewardCoins ?? 0), 0);
  const xp = items.reduce((sum, n) => sum + (n.payload.rewardXp ?? 0), 0);
  const boosters = items.reduce((sum, n) => sum + (n.payload.boosters ?? 0), 0);

  // Les pièces s'envolent vers « Mon argent » dans la barre de navigation, une fois l'écran posé.
  useEffect(() => {
    if (!open || coins <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      const from = coinsRef.current?.getBoundingClientRect();
      const target = document.querySelector('a[href="/enfant/argent"]')?.getBoundingClientRect();
      if (!from || !target) return;
      setFlight({
        id: Date.now(),
        from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
        to: { x: target.left + target.width / 2, y: target.top + target.height / 2 },
        count: Math.min(8, Math.max(3, Math.round(coins / 5))),
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [open, coins]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function close(then?: string) {
    const seen = items;
    setItems([]);
    await Promise.all(seen.map((n) => api.post(`/notifications/${n.id}/read`).catch(() => undefined)));
    if (then) navigate(then);
  }

  if (!open) return null;
  const titles = items.map((n) => n.payload.questTitle).filter(Boolean) as string[];

  return createPortal(
    <div className="celebration-backdrop">
      <div ref={dialogRef} className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <span className="celebration-rays" aria-hidden="true" />
        <ObjectBadge />
        <h2 id="celebration-title" className="celebration-title">
          {items.length === 1 ? "Quête validée !" : `${items.length} quêtes validées !`}
        </h2>
        <p className="celebration-quests">
          {titles.slice(0, 3).join(" · ")}
          {titles.length > 3 ? ` et ${titles.length - 3} ${plural(titles.length - 3, "autre", "autres")}` : ""}
        </p>
        <ul className="celebration-rewards">
          {coins > 0 && (
            <li style={{ "--i": 0 } as React.CSSProperties}>
              <span ref={coinsRef} className="celebration-coin" aria-hidden="true">
                <GameIcon name="coin" size={26} />
              </span>
              <strong>+{coins}</strong> {plural(coins, "pièce", "pièces")}
            </li>
          )}
          {xp > 0 && (
            <li style={{ "--i": 1 } as React.CSSProperties}>
              <span className="celebration-xp" aria-hidden="true">
                <GameIcon name="xp" size={24} />
              </span>
              <strong>+{xp}</strong> XP
            </li>
          )}
          {boosters > 0 && (
            <li style={{ "--i": 2 } as React.CSSProperties}>
              <BoosterPack className="celebration-pack" />
              <strong>+{boosters}</strong> {plural(boosters, "booster", "boosters")}
            </li>
          )}
        </ul>
        <div className="celebration-actions">
          {boosters > 0 && (
            <button type="button" className="btn btn-gold" onClick={() => void close("/enfant/collection")}>
              Ouvrir {plural(boosters, "mon booster", "mes boosters")}
            </button>
          )}
          <button type="button" className={boosters > 0 ? "btn btn-ghost" : "btn btn-gold"} onClick={() => void close()}>
            Super !
          </button>
        </div>
      </div>
      {flight && <CoinFlight flight={flight} onDone={() => setFlight(null)} />}
    </div>,
    document.body
  );
}

function ObjectBadge() {
  return (
    <span className="celebration-badge" aria-hidden="true">
      <img src="/assets/objects/quest-scroll-256.webp" alt="" width={96} height={96} />
    </span>
  );
}
