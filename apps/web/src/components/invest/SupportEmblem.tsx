import type { SupportCode } from "../../lib/invest";

/**
 * Emblèmes monolignes des quatre lieux de la vallée (tour de garde, pont, marché, ateliers),
 * dans le style de GameIcon, lisibles à 32 px. Jamais d'or ni de trou carré : réservés à la pièce.
 */
export function SupportEmblem({ code, size = 28 }: { code: SupportCode; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (code) {
    case "SECURISE":
      return (
        <svg {...p}>
          <path d="M6 21V9h12v12M4 9h16M6 9V5h2v2h2V5h4v2h2V5h2v4M10 21v-4a2 2 0 0 1 4 0v4" />
        </svg>
      );
    case "PRETER":
      return (
        <svg {...p}>
          <path d="M2 16h20M4 16v4M20 16v4M4 16c3-6 13-6 16 0M9 16v-3.5M15 16v-3.5M12 16v-4.5" />
        </svg>
      );
    case "MONDE":
      return (
        <svg {...p}>
          <path d="M3 10l2-5h14l2 5M3 10c0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0M5 11v9h14v-9M9 20v-5h6v5" />
        </svg>
      );
    case "ENTREPRISES":
      return (
        <svg {...p}>
          <path d="M3 21V11l4-3 4 3v10M11 21v-8l4-3 4 3v8M2 21h20M6 15h2M14 16h2" />
          <path d="M18 9V5h2v6" />
        </svg>
      );
  }
}

/** Crans de risque : cinq barres, remplies jusqu'au niveau (texture, pas seulement couleur). */
export function RiskMeter({ level, label }: { level: number; label: string }) {
  return (
    <span className="risk-meter" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`risk-meter-bar${n <= level ? " risk-meter-bar--on" : ""}`} style={{ height: 6 + n * 3 }} />
      ))}
    </span>
  );
}
