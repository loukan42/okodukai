import { useEffect, useRef, useState } from "react";
import { Phone } from "./Phone";
import { StoryScreen } from "./AppDemo";

const CHAPTERS = [
  { title: "La chambre est rangée.", text: "Emma coche sa quête, son père vérifie et valide. Les 10 pièces sont à elle.", screen: "Démonstration : la quête « Ranger sa chambre » validée, 10 pièces gagnées." },
  { title: "Le compte vient de bouger.", text: "Chaque mouvement s'affiche avec sa date et sa raison, comme sur un relevé de banque.", screen: "Démonstration : Mon compte passe à 42 pièces, la nouvelle ligne en haut du relevé." },
  { title: "Elle en met une partie de côté.", text: "20 pièces passent dans son Coffre magique. Chaque lundi, le coffre lui donne une petite prime sur ce qu'elle a gardé.", screen: "Démonstration : 20 pièces vont du compte au Coffre magique, prime de lundi annoncée." },
  { title: "Elle économise pour samedi.", text: "Son objectif, c'est « Glace en famille », une récompense de votre boutique. Il lui manque 10 pièces.", screen: "Démonstration : l'objectif Glace en famille à 90 sur 100." },
  { title: "Elle découvre les placements.", text: "Elle place 20 pièces dans une partie simulée. Chaque soir, un relevé montre ce que le marché en a fait.", screen: "Démonstration : une partie de placement simulée, la courbe et les supports." },
];

/**
 * Le premier gros moment produit : le téléphone reste en place, l'app change à mesure que les
 * chapitres défilent (le chapitre actif est celui qui passe au milieu de l'écran).
 */
export function AccountStory() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    for (const el of items.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="compte" className="lp-story" aria-labelledby="lp-story-title">
      <h2 id="lp-story-title" className="lp-story-title">
        Son premier compte.
        <em>Sans argent réel.</em>
      </h2>
      <div className="lp-story-grid">
        <div className="lp-story-stage">
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
