import { useId } from "react";

// Cercle d'invocation : les mots gravés sont les qualités que les quêtes font travailler.
const RUNE_WORDS = "PATIENCE ✦ COURAGE ✦ CURIOSITÉ ✦ PARTAGE ✦ ÉPARGNE ✦ SAGESSE ✦ ";

const C = 200;
const polar = (r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const triangle = (r: number, offset: number) =>
  [0, 120, 240].map((d, i) => `${i === 0 ? "M" : "L"}${polar(r, d + offset).map((v) => v.toFixed(1)).join(" ")}`).join(" ") + " Z";

export function RuneCircle() {
  const pathId = `rune-path-${useId().replace(/:/g, "")}`;
  return (
    <svg className="rune-circle" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <path id={pathId} d={`M ${C} ${C} m -176 0 a 176 176 0 1 1 352 0 a 176 176 0 1 1 -352 0`} />
      </defs>
      <g className="rune-spin rune-spin--slow">
        <circle className="rune-stroke" cx={C} cy={C} r={192} pathLength={1} />
        <circle className="rune-stroke rune-stroke--thin" cx={C} cy={C} r={162} pathLength={1} />
        {Array.from({ length: 72 }, (_, i) => {
          const long = i % 6 === 0;
          const [x1, y1] = polar(long ? 186 : 189, i * 5);
          const [x2, y2] = polar(196, i * 5);
          return <line key={i} className="rune-tick" x1={x1} y1={y1} x2={x2} y2={y2} style={{ strokeWidth: long ? 2 : 1 }} />;
        })}
        <text className="rune-text">
          <textPath href={`#${pathId}`} textLength={1090} lengthAdjust="spacing">
            {RUNE_WORDS}
          </textPath>
        </text>
      </g>
      <g className="rune-spin rune-spin--reverse">
        <path className="rune-stroke" d={triangle(150, 0)} pathLength={1} />
        <path className="rune-stroke" d={triangle(150, 60)} pathLength={1} />
        {[0, 60, 120, 180, 240, 300].map((d) => {
          const [x, y] = polar(150, d);
          return <circle key={d} className="rune-stroke rune-stroke--thin" cx={x} cy={y} r={11} pathLength={1} />;
        })}
        <circle className="rune-stroke rune-stroke--thin" cx={C} cy={C} r={75} pathLength={1} />
      </g>
    </svg>
  );
}
