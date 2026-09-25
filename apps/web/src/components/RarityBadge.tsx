import { RARITY_LABELS, type CardRarity } from "@okodukai/shared";

export function RarityBadge({ rarity }: { rarity: CardRarity }) {
  return (
    <span className={`rarity-badge rarity-${rarity.toLowerCase().replace("_", "-")}`}>
      <span className="rarity-gem" aria-hidden="true" />{RARITY_LABELS[rarity]}
    </span>
  );
}
