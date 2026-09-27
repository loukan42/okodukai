import { GameIcon } from "./GameIcon";

const artwork = [
  { pattern: /cin[eé]ma|film|movie/i, name: "cinema" },
  { pattern: /glace|ice.?cream|dessert/i, name: "icecream" },
  { pattern: /v[eé]lo|bicycle|bike/i, name: "bicycle" },
  { pattern: /jeu[x]? de soci[eé]t[eé]|board.?game|game night/i, name: "family-game" },
];

/** Parent-defined rewards remain open-ended; known family moments get their own objects. */
export function RewardArt({ title, category }: { title: string; category: "EXPERIENCE" | "OBJET" }) {
  const found = artwork.find((item) => item.pattern.test(title));
  if (!found) return <span className="reward-item-art reward-item-art--fallback" aria-hidden="true"><GameIcon name={category === "EXPERIENCE" ? "ticket" : "gift"} size={45} /></span>;
  return <span className="reward-item-art" aria-hidden="true"><img
    src={`/assets/rewards/reward-${found.name}-256.webp`}
    srcSet={`/assets/rewards/reward-${found.name}-256.webp 256w, /assets/rewards/reward-${found.name}-512.webp 512w`}
    sizes="(max-width: 540px) 140px, 230px"
    loading="lazy"
    alt=""
  /></span>;
}
