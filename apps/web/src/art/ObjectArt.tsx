const WIDTHS: Record<string, number[]> = {
  objects: [128, 256, 512],
  quests: [180, 360, 540],
  shop: [180, 360, 540],
};

/** Objet 3D du studio (parchemin, bourse, sablier, pousse, tableau de quêtes…). */
export function ObjectArt({ name, folder = "objects", size = 96, className = "", alt = "" }: { name: string; folder?: "objects" | "quests" | "shop"; size?: number; className?: string; alt?: string }) {
  const widths = WIDTHS[folder];
  const base = `/assets/${folder}/${name}`;
  return (
    <img
      className={`object-art ${className}`}
      src={`${base}-${widths[1]}.webp`}
      srcSet={widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ")}
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
