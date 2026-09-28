import { Avatar } from "./Avatar";

/** Every illustrated explorer has the same six expressions. */
export type CharacterPose = "idle" | "happy" | "proud" | "thinking" | "victory" | "discovery";

const illustratedAvatars = new Set(Array.from({ length: 16 }, (_, index) => `aventurier-${String(index + 1).padStart(2, "0")}`));
export function hasFullBodyCharacter(avatarId: string) { return illustratedAvatars.has(avatarId); }

export function ChildCharacter({ avatarId, pose = "idle", className = "" }: { avatarId: string; pose?: CharacterPose; className?: string }) {
  const character = avatarId === "aventurier-06" ? "emma" : avatarId === "aventurier-05" ? "lucas" : illustratedAvatars.has(avatarId) ? avatarId.slice(-2) : null;
  if (!character) return <span className={className}><Avatar avatarId={avatarId} size="lg" /></span>;
  const imagePose = pose;
  const sourceWidths = character === "emma" || character === "lucas" || pose === "idle" ? [256, 512, 768] : [256, 512];
  return <img
    className={className}
    src={`/assets/characters/adventurer-${character}-${imagePose}-512.webp`}
    srcSet={sourceWidths.map((width) => `/assets/characters/adventurer-${character}-${imagePose}-${width}.webp ${width}w`).join(", ")}
    sizes="(max-width: 640px) 160px, 280px"
    alt=""
    draggable={false}
  />;
}
