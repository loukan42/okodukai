import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { AlbumCard } from "../../components/AlbumCard";
import type { CardRarity, MasteryTier } from "@okodukai/shared";

interface CardRow {
  id: string;
  name: string;
  rarity: CardRarity;
  cardNumber: number;
  artworkUrl: string | null;
  owned: boolean;
  quantity: number;
  masteryTier: MasteryTier;
}

export function CollectionUniverse() {
  const { universeId } = useParams();
  const [cards, setCards] = useState<CardRow[]>([]);

  useEffect(() => {
    if (!universeId) return;
    api.get<{ cards: CardRow[] }>(`/child/collection/${universeId}`).then((res) => setCards(res.cards));
  }, [universeId]);

  return (
    <div className="stack">
      <Link to="/enfant/collection" className="text-sm">
        ← Retour
      </Link>
      <div className="grid-cards">
        {cards.map((card) => (
          <AlbumCard
            key={card.id}
            title={card.name}
            imageUrl={card.artworkUrl}
            unlocked={card.owned}
            cardNumber={card.cardNumber}
          />
        ))}
      </div>
    </div>
  );
}
