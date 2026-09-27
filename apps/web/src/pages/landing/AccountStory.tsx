import { useEffect, useRef, useState } from "react";
import { Phone } from "./Phone";
import { StoryScreen } from "./AppDemo";
import { LANDING } from "./copy";
import { useCopy } from "../../i18n";


/**
 * Le premier gros moment produit : le téléphone reste en place, l'app change à mesure que les
 * chapitres défilent (le chapitre actif est celui qui passe au milieu de l'écran).
 */
export function AccountStory() {
  const t = useCopy(LANDING).story;
  const CHAPTERS = t.chapters;
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Le chapitre actif est celui dont le titre passe le plus près d'une ligne de lecture : le
    // milieu de l'écran sur ordinateur ; sur téléphone, le haut de la partie visible sous le
    // téléphone de démonstration (qui reste collé en haut et cacherait le texte).
    const stage = stageRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const top = narrow && stage ? stage.getBoundingClientRect().bottom : 0;
      const line = narrow ? top + (vh - top) * 0.3 : vh * 0.5;
      let best = 0;
      let bestDistance = Infinity;
      items.current.forEach((el, i) => {
        const heading = el?.querySelector("h3");
        if (!heading) return;
        const distance = Math.abs(heading.getBoundingClientRect().top - line);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="compte" className="lp-story" aria-labelledby="lp-story-title">
      <h2 id="lp-story-title" className="lp-story-title">
        {t.title}
        <em>{t.titleEm}</em>
      </h2>
      <div className="lp-story-grid">
        <div className="lp-story-stage" ref={stageRef}>
          <div className="lp-story-sticky">
            <div className="lp-story-halo" aria-hidden="true" />
            <Phone className="lp-story-phone" label={CHAPTERS[active].screen}>
              <StoryScreen step={active} />
            </Phone>
            <ol className="lp-story-progress" aria-hidden="true">
              {CHAPTERS.map((c, i) => (
                <li key={c.title} className={i === active ? "is-on" : i < active ? "is-done" : undefined} />
              ))}
            </ol>
          </div>
        </div>
        <ol className="lp-story-chapters">
          {CHAPTERS.map((c, i) => (
            <li
              key={c.title}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-index={i}
              className={`lp-chapter${i === active ? " is-on" : ""}`}
            >
              <span className="lp-chapter-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
