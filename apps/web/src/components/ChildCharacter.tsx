import { Avatar } from "./Avatar";

/** Emma and Lucas have expressive poses; the other illustrated explorers keep their idle pose. */
export type CharacterPose = "idle" | "happy" | "proud" | "thinking" | "victory" | "discovery";

const illustratedAvatars = new Set(["aventurier-01", "aventurier-02", "aventurier-03", "aventurier-04", "aventurier-05", "aventurier-06", "aventurier-07", "aventurier-08", "aventurier-09", "aventurier-10"]);
export function hasFullBodyCharacter(avatarId: string) { return illustratedAvatars.has(avatarId); }

export function ChildCharacter({ avatarId, pose = "idle", className = "" }: { avatarId: string; pose?: CharacterPose; className?: string }) {
  const character = avatarId === "aventurier-06" ? "emma" : avatarId === "aventurier-05" ? "lucas" : illustratedAvatars.has(avatarId) ? avatarId.slice(-2) : null;
  if (!character) return <span className={className}><Avatar avatarId={avatarId} size="lg" /></span>;
  const imagePose = character === "emma" || character === "lucas" ? pose : "idle";
  return <img
    className={className}
    src={`/assets/characters/adventurer-${character}-${imagePose}-512.webp`}
    srcSet={`/assets/characters/adventurer-${character}-${imagePose}-256.webp 256w, /assets/characters/adventurer-${character}-${imagePose}-512.webp 512w, /assets/characters/adventurer-${character}-${imagePose}-768.webp 768w`}
    sizes="(max-width: 640px) 160px, 280px"
    alt=""
    draggable={false}
  />;
}
