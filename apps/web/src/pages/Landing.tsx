import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { trackReferralLandingOnce } from "../share/analytics";
import { LandingNav } from "./landing/LandingNav";
import { Hero } from "./landing/Hero";
import { Choice } from "./landing/Choice";
import { AccountStory } from "./landing/AccountStory";
import { QuestsScene } from "./landing/QuestsScene";
import { VaultScene } from "./landing/VaultScene";
import { InvestScene } from "./landing/InvestScene";
import { CollectionScene } from "./landing/CollectionScene";
import { ParentsScene } from "./landing/ParentsScene";
import { Finale, Trust } from "./landing/Finale";
import { landingCtas } from "./landing/ctas";
import { LANDING } from "./landing/copy";
import { useCopy } from "../i18n";
import "./landing/landing.css";

/**
 * La landing publique : l'entrée dans la Vallée d'Okodukai (docs/LANDING_REDESIGN.md).
 * Une journée dans le monde : l'heure dorée du hero, le crépuscule des placements, la nuit
 * de la collection et des parents, puis l'aube de la fin, où le chemin mène au hameau.
 */
/** Le reflet des boutons de verre suit le pointeur : un seul écouteur pour toute la page. */
function useGlassHighlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const button = (e.target as Element | null)?.closest?.(".lp-btn") as HTMLElement | null;
      if (!button) return;
      const r = button.getBoundingClientRect();
      button.style.setProperty("--mx", `${e.clientX - r.left}px`);
      button.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

export function Landing() {
  const { session } = useAuth();
  const t = useCopy(LANDING);
  useGlassHighlight();
  useEffect(() => {
    trackReferralLandingOnce(window.location.search);
  }, []);
  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  const ctas = landingCtas();

  return (
    <div className="lp">
      <a className="lp-skip" href="#lp-main">
        {t.skip}
      </a>
      <LandingNav ctas={ctas} />
      <main id="lp-main">
        <Hero ctas={ctas} />
        <Choice />
        <AccountStory />
        <QuestsScene />
        <VaultScene />
        <InvestScene />
        <CollectionScene />
        <ParentsScene />
        <Trust />
        <Finale ctas={ctas} />
      </main>
    </div>
  );
}
