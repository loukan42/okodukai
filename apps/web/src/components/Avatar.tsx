const AVATAR_EMOJI: Record<string, string> = {
  "avatar-fox": "🦊",
  "avatar-owl": "🦉",
  "avatar-cat": "🐱",
  "avatar-panda": "🐼",
  "avatar-dragon": "🐲",
  "avatar-lion": "🦁",
  "avatar-turtle": "🐢",
  "avatar-rabbit": "🐰",
};

export const AVAILABLE_AVATARS = Object.keys(AVATAR_EMOJI);

export function Avatar({ avatarId, size = "md" }: { avatarId: string; size?: "md" | "lg" }) {
  return <div className={`avatar ${size === "lg" ? "avatar-lg" : ""}`}>{AVATAR_EMOJI[avatarId] ?? "🙂"}</div>;
}
