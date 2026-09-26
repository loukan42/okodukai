export type ValleyMood = "golden" | "dusk";

// React 18 ne connaît pas encore `fetchPriority` : l'attribut HTML passe tel quel.
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

/**
 * Fond plein cadre de la Vallée d'Okodukai (rendu 3D du studio) : cadrage portrait
 * sur mobile, paysage ailleurs. Purement décoratif.
 */
export function ValleyBackdrop({ mood = "golden", className = "" }: { mood?: ValleyMood; className?: string }) {
  const base = `/assets/backgrounds/valley-${mood}`;
  return (
    <picture className={`valley-backdrop ${className}`} aria-hidden="true">
      <source media="(max-aspect-ratio: 4/5)" srcSet={`${base}-tall-720.webp 720w, ${base}-tall-1080.webp 1080w`} sizes="100vw" />
      <img src={`${base}-wide-1280.webp`} srcSet={`${base}-wide-1280.webp 1280w, ${base}-wide-1920.webp 1920w`} sizes="100vw" alt="" decoding="async" {...HIGH_PRIORITY} />
    </picture>
  );
}
