import { GameIcon } from "./GameIcon";
import { ObjectArt } from "../art/ObjectArt";

const artwork = [
  { pattern: /cin[eé]ma|film|movie/i, name: "cinema" },
  { pattern: /glace|ice.?cream/i, name: "icecream" },
  { pattern: /dessert/i, name: "dessert" },
  { pattern: /v[eé]lo|bicycle|bike/i, name: "bicycle" },
  { pattern: /jeu[x]? de soci[eé]t[eé]|board.?game|game night/i, name: "family-game" },
  { pattern: /musique|music|playlist/i, name: "music" },
  { pattern: /inviter un ami|invite a friend|friend at home|ami à la maison/i, name: "friend" },
  { pattern: /figurine|toy figure|collectible figure/i, name: "figurine" },
  { pattern: /livre|book/i, name: "book" },
];

export function rewardArtworkName(title: string) {
  return artwork.find((item) => item.pattern.test(title))?.name ?? null;
}

/** Parent-defined rewards remain open-ended; known family moments get their own objects. */
export function RewardArt({ title, category }: { title: string; category: "EXPERIENCE" | "OBJET" }) {
  const found = rewardArtworkName(title);
  if (!found && /temps d['’]écran|minutes d['’]écran|screen time|extra screen/i.test(title)) return <span className="reward-item-art" aria-hidden="true"><ObjectArt name="hourglass" size={128} /></span>;
  if (!found) return <span className="reward-item-art reward-item-art--fallback" aria-hidden="true"><GameIcon name={category === "EXPERIENCE" ? "ticket" : "gift"} size={45} /></span>;
  return <span className="reward-item-art" aria-hidden="true"><img
    src={`/assets/rewards/reward-${found}-256.webp`}
    srcSet={`/assets/rewards/reward-${found}-256.webp 256w, /assets/rewards/reward-${found}-512.webp 512w`}
    sizes="(max-width: 540px) 140px, 230px"
    loading="lazy"
    alt=""
  /></span>;
}
