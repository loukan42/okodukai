import { useMemo } from "react";

/**
 * Poussières dorées qui montent lentement dans la lumière (boucle CSS). Positions et
 * rythmes tirés une fois, de façon déterministe, pour éviter tout saut au rendu.
 */
export function DustMotes({ count = 18, seed = 7 }: { count?: number; seed?: number }) {
  const motes = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      left: `${(rand() * 100).toFixed(1)}%`,
      top: `${(30 + rand() * 65).toFixed(1)}%`,
      size: 2 + rand() * 4,
      duration: `${(9 + rand() * 10).toFixed(1)}s`,
      delay: `${(-rand() * 18).toFixed(1)}s`,
      drift: `${(rand() * 60 - 30).toFixed(0)}px`,
    }));
  }, [count, seed]);

  return (
    <div className="dust-motes" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDuration: m.duration, animationDelay: m.delay, ["--drift" as string]: m.drift }}
        />
      ))}
    </div>
  );
}
