import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { RARITY_ICONS, type CardRarity, type MasteryTier } from "@okodukai/shared";

interface CardRow {
  id: string;
  name: string;
  rarity: CardRarity;
  cardNumber: number;
  owned: boolean;
  quantity: number;
  masteryTier: MasteryTier;
}

const MASTERY_LABEL: Record<string, string> = {
  DECOUVERTE: "Découverte",
  CONNAISSEUR: "Connaisseur",
  EXPERT: "Expert",
  MAITRE: "Maître",
};

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
          <div
            key={card.id}
            className="card card--tight"
            style={{
              textAlign: "center",
              opacity: card.owned ? 1 : 0.45,
              filter: card.owned ? "none" : "grayscale(1)",
            }}
          >
            <div
              style={{
                aspectRatio: "3 / 4",
                borderRadius: 10,
                background: "var(--parchment-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                marginBottom: 6,
              }}
            >
              {card.owned ? RARITY_ICONS[card.rarity] : "❔"}
            </div>
            <p className="text-sm" style={{ fontWeight: 700, margin: 0 }}>
              {card.owned ? card.name : `#${card.cardNumber}`}
            </p>
            {card.owned && card.masteryTier && (
              <p style={{ fontSize: 10, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                {MASTERY_LABEL[card.masteryTier]} ×{card.quantity}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
