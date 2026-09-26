import { useState } from "react";
import { Link } from "react-router-dom";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { Logo } from "../../art/Logo";
import type { Ctas } from "./ctas";

/** Navigation minimale : elle devient translucide dès qu'on quitte le haut du monde. */
export function LandingNav({ ctas }: { ctas: Ctas }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 24;
    if (next !== scrolled) setScrolled(next);
  });

  return (
    <header className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
      <Link to="/" className="lp-nav-brand" aria-label="Okodukai, accueil">
        <Logo sizes="(max-width: 767px) 112px, 136px" alt="" />
      </Link>
      <nav className="lp-nav-links" aria-label="Sur cette page">
        <a href="#comment">Comment ça marche</a>
        <a href="#coffre">Le Coffre magique</a>
        <a href="#parents">Pour les parents</a>
      </nav>
      <div className="lp-nav-actions">
        <Link to={ctas.secondary.to} className="lp-nav-login">
          {ctas.secondary.label}
        </Link>
        <Link to={ctas.nav.to} className="lp-btn lp-btn--tint lp-btn--small">
          {ctas.nav.label}
        </Link>
      </div>
    </header>
  );
}
