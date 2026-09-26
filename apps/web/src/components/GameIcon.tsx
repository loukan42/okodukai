import type { SVGProps } from "react";
import {
  ArrowRight,
  BookOpenText,
  Cards,
  Check,
  Coins,
  Flag,
  Gift,
  House,
  LockSimple,
  Scroll,
  Sparkle,
  Star,
  Storefront,
  Ticket,
  User,
  Vault,
  X,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

export type GameIconName = "home" | "quest" | "shop" | "collection" | "vault" | "learn" | "lock" | "gift" | "xp" | "flag" | "arrow" | "check" | "ticket" | "spark" | "user" | "close" | "coin";

/** Pictogrammes Phosphor (bibliothèque dessinée d'un seul trait), plutôt que des tracés faits main. */
const ICONS: Record<GameIconName, Icon> = {
  home: House,
  quest: Scroll,
  shop: Storefront,
  collection: Cards,
  vault: Vault,
  learn: BookOpenText,
  lock: LockSimple,
  gift: Gift,
  xp: Star,
  flag: Flag,
  arrow: ArrowRight,
  check: Check,
  ticket: Ticket,
  spark: Sparkle,
  user: User,
  close: X,
  coin: Coins,
};

/** Les signes d'action (flèche, validation, fermeture) restent pleins ; les objets ont un fond teinté (duotone). */
const SIGNS = new Set<GameIconName>(["arrow", "check", "close"]);

export function GameIcon({ name, size = 24, weight, ...props }: Omit<SVGProps<SVGSVGElement>, "ref"> & { name: GameIconName; size?: number; weight?: IconWeight }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} weight={weight ?? (SIGNS.has(name) ? "bold" : "duotone")} aria-hidden="true" focusable="false" {...props} />;
}
