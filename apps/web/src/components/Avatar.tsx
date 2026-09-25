/**
 * Avatars fournis par l'utilisateur (dossier "Avatar" de herosdelaclasse.com),
 * copiés en local dans public/avatars/ (non suivi par Git, voir CLAUDE.md).
 */
export const AVAILABLE_AVATARS = [
  "fille 1.png",
  "Fille 2.png",
  "Fille 3.png",
  "Fille 4.png",
  "fille 5.png",
  "fille 6.png",
  "fille 7.png",
  "garçon 1.png",
  "garçon 2.png",
  "garçon 3.png",
  "garçon 4.png",
  "garçon 5.png",
  "garçon 6.png",
  "garçon 7.png",
  "garçon 8.png",
  "chevalier 1.png",
  "chevalier 2.png",
  "Prince 1.png",
  "Prince 2.png",
  "Super hero 1.png",
  "Superhero 2.png",
  "ninja 1.png",
  "Ninja 2.png",
  "pirate 1.png",
  "pirate 2.png",
  "cowboy.png",
  "cowboy 2.png",
  "indien 1.png",
  "indien 2.png",
  "Pompier.png",
  "Pompier 2.png",
];

export function Avatar({ avatarId, size = "md" }: { avatarId: string; size?: "md" | "lg" }) {
  return (
    <div className={`avatar ${size === "lg" ? "avatar-lg" : ""}`}>
      <img src={`/avatars/${encodeURIComponent(avatarId)}`} alt="" className="avatar-img" />
    </div>
  );
}
