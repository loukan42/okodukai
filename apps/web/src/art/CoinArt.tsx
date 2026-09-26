/** Pièce Okodukai en 3D (or gravé, trou carré). */
export function CoinArt({ size = 48, className = "", alt = "" }: { size?: number; className?: string; alt?: string }) {
  return (
    <img
      className={className}
      src="/assets/coins/okodukai-coin-96.webp"
      srcSet="/assets/coins/okodukai-coin-48.webp 48w, /assets/coins/okodukai-coin-96.webp 96w, /assets/coins/okodukai-coin-192.webp 192w, /assets/coins/okodukai-coin-512.webp 512w"
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={alt}
      decoding="async"
      draggable={false}
    />
  );
}
