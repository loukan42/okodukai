import type { SVGProps } from "react";

export type GameIconName = "home" | "quest" | "shop" | "collection" | "vault" | "learn" | "lock" | "gift" | "xp" | "flag" | "arrow" | "check" | "ticket" | "spark" | "user" | "close" | "coin";

const drawings: Record<Exclude<GameIconName, "coin">, React.ReactNode> = {
  home: <><path d="m3 11 9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></>,
  quest: <><path d="M5 3h13l2 2v16H5l-2-2V5z"/><path d="M7 8h9M7 12h9M7 16h6"/><path d="m16 3 2 2"/></>,
  shop: <><path d="M3 9h18l-2-5H5zM5 9v11h14V9M9 20v-7h6v7"/><path d="M3 9c0 2 3 2 4 0 1 2 3 2 5 0 2 2 4 2 5 0 1 2 4 2 4 0"/></>,
  collection: <><rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 7h6m-6 4 3-2 3 2-3 3zM18 7h2v14"/></>,
  vault: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M5 7V4h14v3M3 11h18M9 15h6M12 13v4"/></>,
  learn: <><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zM12 5v15"/><path d="M6 8h3m6 0h3"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  gift: <><path d="M3 10h18v10H3zM2 7h20v3H2zM12 7v13"/><path d="M12 7C8 7 6 6 6 4a2 2 0 0 1 4-1c1 1 2 3 2 4Zm0 0c4 0 6-1 6-3a2 2 0 0 0-4-1c-1 1-2 3-2 4Z"/></>,
  xp: <><path d="m12 2 2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/><path d="M19 18h2m-1-1v2"/></>,
  flag: <><path d="M5 21V4m0 1c4-3 7 3 14 0v10c-7 3-10-3-14 0"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  check: <><path d="m4 12 5 5L20 6"/></>,
  ticket: <><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zM13 5v14"/></>,
  spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/></>,
  close: <><path d="M5 5 19 19M19 5 5 19"/></>,
};

export function GameIcon({ name, size = 24, ...props }: SVGProps<SVGSVGElement> & { name: GameIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {name === "coin" ? <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7.2"/><path d="m9.5 10 5-1-1 5-5 1z"/></> : drawings[name]}
  </svg>;
}
