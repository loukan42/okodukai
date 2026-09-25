import { GameIcon, type GameIconName } from "./GameIcon";

export function EmptyState({ icon = "spark", title, subtitle }: { icon?: GameIconName; title: string; subtitle: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><GameIcon name={icon} size={28} /></span>
      <strong>{title}</strong>
      <p>{subtitle}</p>
    </div>
  );
}
