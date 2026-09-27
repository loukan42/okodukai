import { Avatar } from "./Avatar";

/** Two illustrated poses are matched to their roster portraits; all other portraits remain selectable. */
export function ChildCharacter({ avatarId, pose = "idle", className = "" }: { avatarId: string; pose?: "idle" | "victory"; className?: string }) {
  const character = avatarId === "aventurier-06" ? "emma" : avatarId === "aventurier-05" ? "lucas" : null;
  if (!character) return <span className={className}><Avatar avatarId={avatarId} size="lg" /></span>;
  return <img
    className={className}
    src={`/assets/characters/adventurer-${character}-${pose}-512.webp`}
    srcSet={`/assets/characters/adventurer-${character}-${pose}-256.webp 256w, /assets/characters/adventurer-${character}-${pose}-512.webp 512w, /assets/characters/adventurer-${character}-${pose}-768.webp 768w`}
    sizes="(max-width: 640px) 160px, 280px"
    alt=""
    draggable={false}
  />;
}
