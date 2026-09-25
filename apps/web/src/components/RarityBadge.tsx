import { RARITY_ICONS, RARITY_LABELS, type CardRarity } from "@okodukai/shared";

export function RarityBadge({ rarity }: { rarity: CardRarity }) {
  return (
    <span className="pill" style={{ background: "var(--parchment-dim)", color: "var(--ink-soft)" }}>
      {RARITY_ICONS[rarity]} {RARITY_LABELS[rarity]}
    </span>
  );
}
