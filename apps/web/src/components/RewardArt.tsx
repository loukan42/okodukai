import { GameIcon } from "./GameIcon";

const artwork = [
  { pattern: /cin[eé]ma|film|movie/i, name: "cinema" },
  { pattern: /glace|ice.?cream|dessert/i, name: "icecream" },
  { pattern: /v[eé]lo|bicycle|bike/i, name: "bicycle" },
  { pattern: /jeu[x]? de soci[eé]t[eé]|board.?game|game night/i, name: "family-game" },
];

export function rewardArtworkName(title: string) {
  return artwork.find((item) => item.pattern.test(title))?.name ?? null;
}

/** Parent-defined rewards remain open-ended; known family moments get their own objects. */
export function RewardArt({ title, category }: { title: string; category: "EXPERIENCE" | "OBJET" }) {
  const found = rewardArtworkName(title);
  if (!found) return <span className="reward-item-art reward-item-art--fallback" aria-hidden="true"><GameIcon name={category === "EXPERIENCE" ? "ticket" : "gift"} size={45} /></span>;
  return <span className="reward-item-art" aria-hidden="true"><img
    src={`/assets/rewards/reward-${found}-256.webp`}
    srcSet={`/assets/rewards/reward-${found}-256.webp 256w, /assets/rewards/reward-${found}-512.webp 512w`}
    sizes="(max-width: 540px) 140px, 230px"
    loading="lazy"
    alt=""
  /></span>;
}
