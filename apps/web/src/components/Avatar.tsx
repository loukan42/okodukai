import { useState } from "react";

/**
 * Roster d'avatars Okodukai : portraits vectoriels générés par le pipeline
 * (scripts/art/characters/avatars.mjs → public/assets/avatars/*.svg), versionnés.
 */
export const AVAILABLE_AVATARS = Array.from({ length: 12 }, (_, i) => `aventurier-${String(i + 1).padStart(2, "0")}`);

const ROSTER_ID = /^aventurier-\d{2}$/;

/** Anciens identifiants (PNG « fille 1.png »…) : image locale si présente, sinon un portrait du roster. */
function fallbackFor(avatarId: string) {
  let h = 0;
  for (const ch of avatarId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVAILABLE_AVATARS[h % AVAILABLE_AVATARS.length];
}

export function avatarSrc(avatarId: string) {
  return ROSTER_ID.test(avatarId) ? `/assets/avatars/${avatarId}.svg` : `/avatars/${encodeURIComponent(avatarId)}`;
}

export function Avatar({ avatarId, size = "md" }: { avatarId: string; size?: "md" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? avatarSrc(fallbackFor(avatarId)) : avatarSrc(avatarId);
  return (
    <div className={`avatar ${size === "lg" ? "avatar-lg" : ""}`}>
      <img src={src} alt="" className="avatar-img" onError={() => setBroken(true)} draggable={false} />
    </div>
  );
}
