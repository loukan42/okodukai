import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { AlbumCard } from "../../components/AlbumCard";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";
import type { CardRarity, MasteryTier } from "@okodukai/shared";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    fallback: "Mon univers",
    back: "Tous les univers",
    kicker: "Album de collection",
    lead: "Les cartes que tu as gagnées dans cet univers sont ici.",
    found: "cartes trouvées",
    filter: "Filtrer les cartes",
    all: "Toutes",
    owned: "Trouvées",
    missing: "À trouver",
    loading: "Les cartes arrivent…",
    error: "Impossible de charger cet univers. Reviens dans un instant.",
    none: "Aucune carte dans cette vue.",
  },
  en: {
    fallback: "My world",
    back: "All worlds",
    kicker: "Collection album",
    lead: "The cards you've won in this world are all here.",
    found: "cards found",
    filter: "Filter the cards",
    all: "All",
    owned: "Found",
    missing: "Still to find",
    loading: "Your cards are coming…",
    error: "This world won't load. Come back in a moment.",
    none: "No cards in this view.",
  },
});

interface CardRow { id: string; name: string; rarity: CardRarity; cardNumber: number; artworkUrl: string | null; owned: boolean; quantity: number; masteryTier: MasteryTier }
type Filter = "all" | "owned" | "missing";

export function CollectionUniverse() {
  const t = useCopy(COPY);
  const { universeId } = useParams();
  const [cards, setCards] = useState<CardRow[]>([]);
  const [universeTitle, setUniverseTitle] = useState(t.fallback);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!universeId) return;
    Promise.all([
      api.get<{ cards: CardRow[] }>(`/child/collection/${universeId}`),
      api.get<{ universes: { id: string; title: string }[] }>("/child/universes"),
    ]).then(([detail, list]) => { setCards(detail.cards); setUniverseTitle(list.universes.find((u) => u.id === universeId)?.title ?? t.fallback); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [universeId]);

  const owned = cards.filter((card) => card.owned).length;
  const visibleCards = cards.filter((card) => filter === "all" || (filter === "owned" ? card.owned : !card.owned));

  return <div className="album-page">
    <Link to="/enfant/collection" className="album-back"><GameIcon name="arrow" size={16}/> {t.back}</Link>
    <header className="album-header"><div><p className="scene-kicker">{t.kicker}</p><h1>{universeTitle}</h1><p>{t.lead}</p></div><div className="album-count"><strong>{owned} / {cards.length}</strong><span>{t.found}</span></div></header>
    <ProgressBar value={owned} max={cards.length}/>
    <div className="album-filter" role="group" aria-label={t.filter}>
      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} aria-pressed={filter === "all"}>{t.all} <span>{cards.length}</span></button>
      <button className={filter === "owned" ? "active" : ""} onClick={() => setFilter("owned")} aria-pressed={filter === "owned"}>{t.owned} <span>{owned}</span></button>
      <button className={filter === "missing" ? "active" : ""} onClick={() => setFilter("missing")} aria-pressed={filter === "missing"}>{t.missing} <span>{cards.length - owned}</span></button>
    </div>
    {loading ? <p className="loading-message" role="status">{t.loading}</p> : error ? <p className="form-error">{t.error}</p> : <div className="grid-cards album-grid">{visibleCards.map((card) => <AlbumCard key={card.id} title={card.name} imageUrl={card.artworkUrl} unlocked={card.owned} cardNumber={card.cardNumber} rarity={card.rarity} quantity={card.quantity}/>)}</div>}
    {!loading && !error && visibleCards.length === 0 && <p className="album-none">{t.none}</p>}
  </div>;
}
