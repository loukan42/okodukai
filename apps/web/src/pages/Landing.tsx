import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
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
import "./landing/landing.css";

/**
 * La landing publique : l'entrée dans la Vallée d'Okodukai (docs/LANDING_REDESIGN.md).
 * Une journée dans le monde : l'heure dorée du hero, le crépuscule des placements, la nuit
 * de la collection et des parents, puis l'aube de la fin, où le chemin mène au hameau.
 */
export function Landing() {
  const { session } = useAuth();
  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  const ctas = landingCtas();

  return (
    <div className="lp">
      <a className="lp-skip" href="#lp-main">
        Aller au contenu
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
