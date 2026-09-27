import { useState } from "react";
import { Link } from "react-router-dom";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { Logo } from "../../art/Logo";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { useCopy } from "../../i18n";
import type { Ctas } from "./ctas";
import { LANDING } from "./copy";

/** Navigation minimale : elle devient translucide dès qu'on quitte le haut du monde. */
export function LandingNav({ ctas }: { ctas: Ctas }) {
  const t = useCopy(LANDING).nav;
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 24;
    if (next !== scrolled) setScrolled(next);
  });

  return (
    <header className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
      <Link to="/" className="lp-nav-brand" aria-label={t.home}>
        <Logo sizes="(max-width: 767px) 112px, 136px" alt="" />
      </Link>
      <nav className="lp-nav-links" aria-label={t.onPage}>
        <a href="#comment">{t.how}</a>
        <a href="#coffre">{t.vault}</a>
        <a href="#parents">{t.parents}</a>
      </nav>
      <div className="lp-nav-actions">
        <LanguageSwitch className="lp-nav-lang" />
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
