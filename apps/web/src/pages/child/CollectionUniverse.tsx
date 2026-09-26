import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { AlbumCard } from "../../components/AlbumCard";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";
import type { CardRarity, MasteryTier } from "@okodukai/shared";

interface CardRow { id: string; name: string; rarity: CardRarity; cardNumber: number; artworkUrl: string | null; owned: boolean; quantity: number; masteryTier: MasteryTier }
type Filter = "all" | "owned" | "missing";

export function CollectionUniverse() {
  const { universeId } = useParams();
  const [cards, setCards] = useState<CardRow[]>([]);
  const [universeTitle, setUniverseTitle] = useState("Mon univers");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!universeId) return;
    Promise.all([
      api.get<{ cards: CardRow[] }>(`/child/collection/${universeId}`),
      api.get<{ universes: { id: string; title: string }[] }>("/child/universes"),
    ]).then(([detail, list]) => { setCards(detail.cards); setUniverseTitle(list.universes.find((u) => u.id === universeId)?.title ?? "Mon univers"); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [universeId]);

  const owned = cards.filter((card) => card.owned).length;
  const visibleCards = cards.filter((card) => filter === "all" || (filter === "owned" ? card.owned : !card.owned));

  return <div className="album-page">
    <Link to="/enfant/collection" className="album-back"><GameIcon name="arrow" size={16}/> Tous les univers</Link>
    <header className="album-header"><div><p className="scene-kicker">Album de collection</p><h1>{universeTitle}</h1><p>Les cartes que tu as gagnées dans cet univers sont ici.</p></div><div className="album-count"><strong>{owned} / {cards.length}</strong><span>cartes trouvées</span></div></header>
    <ProgressBar value={owned} max={cards.length}/>
    <div className="album-filter" role="group" aria-label="Filtrer les cartes">
      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} aria-pressed={filter === "all"}>Toutes <span>{cards.length}</span></button>
      <button className={filter === "owned" ? "active" : ""} onClick={() => setFilter("owned")} aria-pressed={filter === "owned"}>Trouvées <span>{owned}</span></button>
      <button className={filter === "missing" ? "active" : ""} onClick={() => setFilter("missing")} aria-pressed={filter === "missing"}>À trouver <span>{cards.length - owned}</span></button>
    </div>
    {loading ? <p className="loading-message" role="status">Les cartes arrivent…</p> : error ? <p className="form-error">Impossible de charger cet univers. Reviens dans un instant.</p> : <div className="grid-cards album-grid">{visibleCards.map((card) => <AlbumCard key={card.id} title={card.name} imageUrl={card.artworkUrl} unlocked={card.owned} cardNumber={card.cardNumber} rarity={card.rarity} quantity={card.quantity}/>)}</div>}
    {!loading && !error && visibleCards.length === 0 && <p className="album-none">Aucune carte dans cette vue.</p>}
  </div>;
}
