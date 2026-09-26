export type ChestState = "closed" | "empty" | "low" | "full" | "almost" | "reached";

/** Coffre 3D (Mon coffre) ; même cadrage pour tous les états, on peut donc les enchaîner. */
export function ChestArt({ state, size = 240, className = "", alt = "" }: { state: ChestState; size?: number; className?: string; alt?: string }) {
  const base = `/assets/savings/savings-chest-${state}`;
  return (
    <img
      className={className}
      src={`${base}-480.webp`}
      srcSet={`${base}-240.webp 240w, ${base}-480.webp 480w, ${base}-720.webp 720w`}
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={alt}
      decoding="async"
      draggable={false}
    />
  );
}
