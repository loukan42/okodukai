import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useDialogFocus } from "../lib/useDialogFocus";
import { CoinFlight, type Flight } from "../art/CoinFlight";
import { BoosterPack } from "./booster/BoosterPack";
import { GameIcon } from "./GameIcon";
import { ChildCharacter, hasFullBodyCharacter } from "./ChildCharacter";
import { useAuth } from "../lib/AuthContext";
import { defineCopy, useCopy } from "../i18n";
import { LEVEL_TITLE } from "../lib/levels";

interface Notification {
  id: string;
  type: string;
  readAt: string | null;
  payload: { questTitle?: string; rewardCoins?: number; rewardXp?: number; boosters?: number; amount?: number; reason?: string; level?: number; title?: string | null };
}

const COPY = defineCopy({
  fr: {
    oneGift: "Un cadeau pour toi !",
    gifts: (n: number) => `${n} cadeaux pour toi !`,
    oneQuest: "Quête validée !",
    quests: (n: number) => `${n} quêtes validées !`,
    levelUp: (level: number) => `Niveau ${level} !`,
    others: (n: number) => ` et ${n} ${n > 1 ? "autres" : "autre"}`,
    gift: (reason: string) => `Cadeau : ${reason}`,
    newLevel: (level: number) => `Tu passes au niveau ${level}.`,
    newTitle: (title: string) => `Nouveau titre : ${title}`,
    coins: (n: number) => (n > 1 ? "pièces" : "pièce"),
    boosters: (n: number) => (n > 1 ? "boosters" : "booster"),
    open: (n: number) => (n > 1 ? "Ouvrir mes boosters" : "Ouvrir mon booster"),
    ok: "Super !",
  },
  en: {
    oneGift: "A gift for you!",
    gifts: (n: number) => `${n} gifts for you!`,
    oneQuest: "Quest approved!",
    quests: (n: number) => `${n} quests approved!`,
    levelUp: (level: number) => `Level ${level}!`,
    others: (n: number) => ` and ${n} more`,
    gift: (reason: string) => `Gift: ${reason}`,
    newLevel: (level: number) => `You've reached level ${level}.`,
    newTitle: (title: string) => `New title: ${title}`,
    coins: (n: number) => (n === 1 ? "coin" : "coins"),
    boosters: (n: number) => (n === 1 ? "booster" : "boosters"),
    open: (n: number) => (n === 1 ? "Open my booster" : "Open my boosters"),
    ok: "Great!",
  },
});

/**
 * Fête des quêtes validées : à l'ouverture de l'espace enfant, les validations pas encore vues
 * sont réunies en un seul moment (pièces qui volent vers « Mon trésor », XP, booster gagné).
 * Les montants viennent de la notification écrite par le serveur au moment du crédit.
 */
export function QuestRewardCelebration() {
  const t = useCopy(COPY);
  const { session } = useAuth();
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
        if (!cancelled) setItems(notifications.filter((n) => !n.readAt && ((n.type === "quest_validee" && typeof n.payload.rewardCoins === "number") || n.type === "gift" || n.type === "level_up")));
      })
      .catch(() => {
        /* la fête attendra la prochaine visite */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quests = items.filter((n) => n.type === "quest_validee");
  const gifts = items.filter((n) => n.type === "gift");
  const levelUps = items.filter((n) => n.type === "level_up").sort((a, b) => (a.payload.level ?? 0) - (b.payload.level ?? 0));
  const topLevel = levelUps.at(-1)?.payload.level ?? null;
  const newTitles = levelUps.map((n) => n.payload.title).filter((code): code is string => Boolean(code && LEVEL_TITLE[code]));
  const coins = items.reduce((sum, n) => sum + (n.payload.rewardCoins ?? n.payload.amount ?? 0), 0);
  const xp = items.reduce((sum, n) => sum + (n.payload.rewardXp ?? 0), 0);
  const boosters = items.reduce((sum, n) => sum + (n.payload.boosters ?? 0), 0);

  // Les pièces s'envolent vers « Mon trésor » dans la barre de navigation, une fois l'écran posé.
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
  const titles = quests.map((n) => n.payload.questTitle).filter(Boolean) as string[];
  const heading =
    quests.length === 0
      ? gifts.length === 0 && topLevel
        ? t.levelUp(topLevel)
        : gifts.length === 1
          ? t.oneGift
          : t.gifts(gifts.length)
      : quests.length === 1
        ? t.oneQuest
        : t.quests(quests.length);

  return createPortal(
    <div className="celebration-backdrop">
      <div ref={dialogRef} className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <span className="celebration-rays" aria-hidden="true" />
        {session?.kind === "child" && hasFullBodyCharacter(session.child.avatarId) ? <ChildCharacter avatarId={session.child.avatarId} pose="victory" className="celebration-character" /> : <ObjectBadge />}
        <h2 id="celebration-title" className="celebration-title">
          {heading}
        </h2>
        <p className="celebration-quests">
          {titles.slice(0, 3).join(" · ")}
          {titles.length > 3 ? t.others(titles.length - 3) : ""}
        </p>
        {topLevel && (quests.length > 0 || gifts.length > 0) && <p className="celebration-level">{t.newLevel(topLevel)}</p>}
        {newTitles.map((code) => (
          <p key={code} className="celebration-gift">
            {t.newTitle(LEVEL_TITLE[code])}
          </p>
        ))}
        {gifts.map((g) => (
          <p key={g.id} className="celebration-gift">
            {t.gift(g.payload.reason ?? "")}
          </p>
        ))}
        <ul className="celebration-rewards">
          {coins > 0 && (
            <li style={{ "--i": 0 } as React.CSSProperties}>
              <span ref={coinsRef} className="celebration-coin" aria-hidden="true">
                <GameIcon name="coin" size={26} />
              </span>
              <strong>+{coins}</strong> {t.coins(coins)}
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
              <strong>+{boosters}</strong> {t.boosters(boosters)}
            </li>
          )}
        </ul>
        <div className="celebration-actions">
          {boosters > 0 && (
            <button type="button" className="btn btn-gold" onClick={() => void close("/enfant/collection")}>
              {t.open(boosters)}
            </button>
          )}
          <button type="button" className={boosters > 0 ? "btn btn-ghost" : "btn btn-gold"} onClick={() => void close()}>
            {t.ok}
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
