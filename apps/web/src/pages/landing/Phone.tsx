import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Largeur logique de l'écran : celle d'un téléphone courant. Le contenu est dessiné à cette taille, puis mis à l'échelle. */
const SCREEN_W = 390;

/**
 * Un téléphone dont l'écran affiche une démonstration de l'app enfant. L'écran est une
 * illustration : rien n'y est focalisable (`inert`), et `label` décrit ce qu'on y voit.
 */
export function Phone({ children, label, className = "", style }: { children: ReactNode; label: string; className?: string; style?: CSSProperties }) {
  const glass = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = glass.current;
    if (!el) return;
    const apply = () => el.style.setProperty("--k", String(el.clientWidth / SCREEN_W));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    screen.current?.setAttribute("inert", "");
  }, []);

  return (
    <div className={`lp-phone ${className}`} style={style} role="img" aria-label={label}>
      <div className="lp-phone-glass" ref={glass}>
        <div className="lp-phone-screen" ref={screen} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
