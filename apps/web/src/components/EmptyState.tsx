import type { ReactNode } from "react";
import { ObjectArt } from "../art/ObjectArt";
import { GameIcon, type GameIconName } from "./GameIcon";

/**
 * État vide. Côté enfant, `art` affiche un objet 3D du monde (parchemin, bourse, sablier…) à la
 * place de l'icône ; côté parent, l'icône sobre suffit. `action` : le geste qui remplit l'écran.
 */
export function EmptyState({
  icon = "spark",
  art,
  title,
  subtitle,
  action,
}: {
  icon?: GameIconName;
  art?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className={`empty-state ${art ? "empty-state--art" : ""}`}>
      {art ? <ObjectArt name={art} size={112} className="empty-state-art" /> : <span className="empty-state-icon"><GameIcon name={icon} size={28} /></span>}
      <strong>{title}</strong>
      <p>{subtitle}</p>
      {action}
    </div>
  );
}
