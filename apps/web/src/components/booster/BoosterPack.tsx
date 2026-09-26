import packArt from "../../assets/cards/card-booster.webp";

/**
 * Sachet de booster : l'illustration dorée d'origine, habillée Okodukai. Le logo recouvre l'ancien
 * titre anglais et un ruban au nom de l'univers recouvre le crâne du bas. Tout est placé en
 * pourcentages de l'illustration (640 × 960) : l'habillage reste calé à toutes les tailles.
 */
export function BoosterPack({ universe, className = "" }: { universe?: string; className?: string }) {
  return (
    <span className={`booster-pack ${className}`} aria-hidden="true">
      <img className="booster-pack-art" src={packArt} alt="" draggable={false} />
      <span className="booster-pack-halo" />
      <img
        className="booster-pack-logo"
        src="/assets/brand/logo-full-320.webp"
        srcSet="/assets/brand/logo-full-320.webp 320w, /assets/brand/logo-full-640.webp 640w"
        sizes="(max-width: 560px) 160px, 220px"
        alt=""
        draggable={false}
      />
      <span className="booster-pack-ribbon">
        <span>{universe ?? "Booster"}</span>
      </span>
      <span className="booster-pack-sheen" style={{ WebkitMaskImage: `url(${packArt})`, maskImage: `url(${packArt})` }} />
    </span>
  );
}
