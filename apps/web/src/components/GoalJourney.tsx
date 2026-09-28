import { CoinArt } from "../art/CoinArt";
import { rewardArtworkName } from "./RewardArt";
import { isGoalArtworkKey } from "../lib/goalArtwork";
import { defineCopy, useCopy } from "../i18n";
import "../styles/goal-journey.css";

const copy = defineCopy({
  fr: { progress: (title: string, present: number, target: number) => `Chemin vers ${title} : ${present} pièces sur ${target}` },
  en: { progress: (title: string, present: number, target: number) => `Path to ${title}: ${present} of ${target} coins` },
});

/** A visual path to a goal; the progress values always come from the server. */
export function GoalJourney({ title, present, target, illustrationKey = null }: { title: string; present: number; target: number; illustrationKey?: string | null }) {
  const t = useCopy(copy);
  const art = isGoalArtworkKey(illustrationKey) ? illustrationKey : rewardArtworkName(title);
  const capped = Math.min(Math.max(0, present), Math.max(1, target));
  const percent = Math.min(100, Math.max(0, target > 0 ? present / target * 100 : 0));
  const image = art ? `/assets/rewards/reward-${art}` : "/assets/goals/goal-waypost";

  return <div className="goal-journey" role="progressbar" aria-label={t.progress(title, present, target)} aria-valuemin={0} aria-valuemax={Math.max(1, target)} aria-valuenow={capped}>
    <div className="goal-journey-path" aria-hidden="true">
      <div className="goal-journey-walked" style={{ width: `${percent}%` }}><CoinArt size={38} /></div>
    </div>
    <img
      className="goal-journey-destination"
      src={`${image}-256.webp`}
      srcSet={`${image}-256.webp 256w, ${image}-512.webp 512w`}
      sizes="(max-width: 600px) 90px, 115px"
      alt=""
      loading="lazy"
      width="115"
      height="115"
      aria-hidden="true"
    />
  </div>;
}
