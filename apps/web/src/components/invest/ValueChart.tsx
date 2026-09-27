import { units, yearOf } from "../../lib/invest";
import { defineCopy, useCopy } from "../../i18n";

interface ValueChartProps {
  series: { step: number; value: number; contributed: number }[];
  horizonMonths: number;
}

const COPY = defineCopy({
  fr: {
    summary: (start: string, end: string, months: number, low: string, high: string) =>
      `De ${start} au départ à ${end} unités après ${months} mois simulés. Le plus bas : ${low}, le plus haut : ${high}.`,
    year: (n: number) => `An ${n}`,
    paid: (n: string) => `Versé : ${n}`,
    note: (year: number, total: number) => `Année ${year} sur ${total} · la ligne pointillée marque ce que tu as versé.`,
  },
  en: {
    summary: (start: string, end: string, months: number, low: string, high: string) =>
      `From ${start} at the start to ${end} units after ${months} simulated months. Lowest: ${low}, highest: ${high}.`,
    year: (n: number) => `Yr ${n}`,
    paid: (n: string) => `Paid in: ${n}`,
    note: (year: number, total: number) => `Year ${year} of ${total} · the dotted line shows what you paid in.`,
  },
});

/**
 * Tracé honnête (docs/INVESTMENT_UX.md §0.5) : la ligne de référence « Versé » est toujours
 * dans l'axe, l'amplitude ne descend jamais sous ±10 % autour d'elle, pas de lissage.
 */
export function ValueChart({ series, horizonMonths }: ValueChartProps) {
  const t = useCopy(COPY);
  if (series.length < 2) return null;
  const W = 600, H = 220, PADX = 36, PADY = 18;
  const ref = series[series.length - 1].contributed || 100;
  const values = series.map((p) => p.value);
  const lo = Math.min(...values, ref * 0.9);
  const hi = Math.max(...values, ref * 1.1);
  // L'axe couvre ce qui est révélé plus une marge (jamais tout l'horizon d'un coup : la courbe serait écrasée).
  const span = Math.min(horizonMonths, Math.max(24, Math.ceil((series[series.length - 1].step + 6) / 12) * 12));
  const x = (step: number) => PADX + (step / span) * (W - PADX * 2);
  const y = (v: number) => PADY + (1 - (v - lo) / (hi - lo)) * (H - PADY * 2);
  const path = series.map((p, i) => `${i ? "L" : "M"}${x(p.step).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  const years = Math.ceil(span / 12);
  const totalYears = Math.ceil(horizonMonths / 12);
  const summary = t.summary(units(series[0].value, false), units(last.value, false), last.step, units(Math.min(...values), false), units(Math.max(...values), false));

  return (
    <figure className="value-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {Array.from({ length: years + 1 }, (_, i) => (
          <g key={i}>
            <line x1={x(i * 12)} x2={x(i * 12)} y1={PADY} y2={H - PADY} className="value-chart-grid" />
            {i < years && (
              <text x={x(i * 12 + 6)} y={H - 2} className="value-chart-axis" textAnchor="middle">
                {t.year(i + 1)}
              </text>
            )}
          </g>
        ))}
        <line x1={PADX} x2={W - PADX} y1={y(ref)} y2={y(ref)} className="value-chart-ref" />
        <text x={PADX + 4} y={y(ref) - 6} className="value-chart-ref-label">
          {t.paid(units(ref, false))}
        </text>
        <path d={path} className="value-chart-line" />
        <circle cx={x(last.step)} cy={y(last.value)} r={5} className="value-chart-dot" />
        <text x={Math.min(x(last.step) + 8, W - 4)} y={y(last.value) - 8} className="value-chart-last" textAnchor={x(last.step) > W - 90 ? "end" : "start"}>
          {units(last.value, false)}
        </text>
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
      <p className="value-chart-note">{t.note(yearOf(last.step === 0 ? 0 : last.step - 1), totalYears)}</p>
    </figure>
  );
}
