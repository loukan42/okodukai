import type { CardRarity } from "@okodukai/shared";
import { RARITY_LABELS } from "../lib/rarity";

export function RarityBadge({ rarity }: { rarity: CardRarity }) {
  return (
    <span className={`rarity-badge rarity-${rarity.toLowerCase().replace("_", "-")}`}>
      <span className="rarity-gem" aria-hidden="true" />{RARITY_LABELS[rarity]}
    </span>
  );
}
