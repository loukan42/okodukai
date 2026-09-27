/** Portraits Okodukai : les seize cases du sprite sont affichées à leur position exacte. */
export const AVAILABLE_AVATARS = Array.from({ length: 16 }, (_, i) => `aventurier-${String(i + 1).padStart(2, "0")}`);

export const AVATAR_LABELS = [
  "Cheveux bruns et sweat rouge", "Carré noir et pull bleu", "Boucles noires et sweat vert", "Nattes rousses",
  "Cheveux blonds et lunettes", "Chignon bouclé et haut fleuri", "Casquette verte", "Cheveux longs et bandeau rose",
  "Locks et sweat orange", "Cheveux blonds et chemisier bleu", "Lunettes rouges et marinière", "Couettes et pull jaune",
  "Bonnet vert", "Boucles rousses et sweat bleu", "Carré brun et pull rouge", "Chapeau de paille",
];
export const AVATAR_LABELS_EN = [
  "Brown hair and red sweater", "Black bob and blue top", "Black curls and green sweater", "Red braids",
  "Blond hair and glasses", "Curly bun and floral top", "Green cap", "Long hair and pink headband",
  "Locs and orange sweater", "Blond hair and blue shirt", "Red glasses and striped top", "Pigtails and yellow top",
  "Green beanie", "Red curls and blue sweater", "Brown bob and red sweater", "Straw hat",
];

function avatarIndex(avatarId: string) {
  const match = /^aventurier-(\d{2})$/.exec(avatarId);
  const n = match ? Number(match[1]) : 0;
  if (n >= 1 && n <= AVAILABLE_AVATARS.length) return n - 1;
  let hash = 0;
  for (const char of avatarId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % AVAILABLE_AVATARS.length;
}

export function Avatar({ avatarId, size = "md", frameId = "none" }: { avatarId: string; size?: "md" | "lg"; frameId?: string }) {
  const index = avatarIndex(avatarId);
  const column = index % 4;
  const row = Math.floor(index / 4);
  return (
    <span className={`avatar ${size === "lg" ? "avatar-lg" : ""}`} aria-hidden="true">
      <span className="avatar-illustration" style={{ backgroundPosition: `${(column / 3) * 100}% ${(row / 3) * 100}%` }} />
      {(["camp", "grove", "observatory"].includes(frameId)) && <img className="avatar-frame-art" src={`/assets/frames/frame-${frameId}-128.webp`} srcSet={`/assets/frames/frame-${frameId}-128.webp 128w, /assets/frames/frame-${frameId}-256.webp 256w`} sizes={size === "lg" ? "88px" : "56px"} alt="" draggable={false} />}
    </span>
  );
}
