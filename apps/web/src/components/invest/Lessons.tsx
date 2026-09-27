import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { defineCopy, useCopy } from "../../i18n";
import { numberFormatter, percentText } from "../../i18n/format";

const FMT = numberFormatter({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DEC = numberFormatter({ maximumFractionDigits: 1 });
const u = (v: number) => FMT.format(v);

const YEARS_SHOWN = [0, 1, 2, 5, 10];

const COPY = defineCopy({
  fr: {
    year: "Année",
    snowIntro: (rate: string) => `Si ça montait de ${rate} chaque année, pendant 10 ans, voici ce que deviendraient 100 unités :`,
    rateLabel: "Taux de l'exemple",
    simple: "Intérêts simples",
    compound: "Intérêts composés",
    snowNote:
      "Avec les intérêts composés, les intérêts d'une année rapportent à leur tour l'année suivante. Les adultes appellent ça la capitalisation. C'est un exemple : un vrai placement ne monte pas du même pourcentage chaque année.",
    feesIntro: "Même croissance de 4 % par an pendant 10 ans, avec ou sans frais de gestion :",
    feesLabel: "Frais par an",
    perYear: (fee: string) => `${fee} par an`,
    noFees: "Sans frais",
    withFees: "Avec frais",
    gapStart: "Après 10 ans, l'écart est de",
    gapUnits: (n: string) => `${n} unités`,
    feesNote: "Les frais, c'est ce que tu paies pour le service. Ils sont pris chaque année, même quand ça baisse : un petit pourcentage finit par compter.",
    marketGame: (years: number, last: string) =>
      `Au début de ta partie, la liste de courses du marché de la vallée coûtait 100 unités école. Après ${years} ${years > 1 ? "ans" : "an"}, elle en coûte ${last}.`,
    marketExample: (last: string) => `Si les prix montaient de 2 % par an, une liste de courses à 100 unités école en coûterait ${last} dans 10 ans.`,
    listPrice: "Prix de la liste",
    marketNote:
      "Tes 100 unités restent 100. Mais si les prix montent, elles achètent un peu moins. Quand la plupart des prix montent avec le temps, on parle d'inflation. Les prix de ta boutique familiale, eux, sont fixés par tes parents.",
    title: "Les leçons chiffrées",
    lessons: {
      snowball: ["L'effet boule de neige", "Intérêts composés"],
      fees: ["Ce que coûtent les frais", "Frais de gestion"],
      market: ["La liste du marché", "Inflation et pouvoir d'achat"],
    } as Record<string, string[]>,
  },
  en: {
    year: "Year",
    snowIntro: (rate: string) => `If it grew by ${rate} every year for 10 years, here's what 100 units would become:`,
    rateLabel: "Example rate",
    simple: "Simple interest",
    compound: "Compound interest",
    snowNote:
      "With compound interest, one year's interest earns more interest the next year. Grown-ups call this compounding. This is only an example: a real investment doesn't grow by the same percentage every year.",
    feesIntro: "The same 4% growth a year for 10 years, with and without management fees:",
    feesLabel: "Fees per year",
    perYear: (fee: string) => `${fee} a year`,
    noFees: "No fees",
    withFees: "With fees",
    gapStart: "After 10 years, the gap is",
    gapUnits: (n: string) => `${n} units`,
    feesNote: "Fees are what you pay for the service. They're taken every year, even when things go down, so a small percentage ends up mattering.",
    marketGame: (years: number, last: string) =>
      `When your game started, the shopping list at the valley market cost 100 practice units. After ${years} ${years === 1 ? "year" : "years"}, it costs ${last}.`,
    marketExample: (last: string) => `If prices rose by 2% a year, a shopping list costing 100 practice units would cost ${last} in 10 years.`,
    listPrice: "Price of the list",
    marketNote:
      "Your 100 units stay 100. But if prices go up, they buy a bit less. When most prices go up over time, it's called inflation. The prices in your family shop are set by your parents.",
    title: "Lessons with numbers",
    lessons: {
      snowball: ["The snowball effect", "Compound interest"],
      fees: ["What fees cost", "Management fees"],
      market: ["The market list", "Inflation and buying power"],
    },
  },
});

type Copy = (typeof COPY)["fr"];

function Bars({ rows, labels, t }: { rows: { year: number; values: number[] }[]; labels: string[]; t: Copy }) {
  const max = Math.max(...rows.flatMap((r) => r.values));
  return (
    <table className="lesson-table">
      <thead>
        <tr>
          <th scope="col">{t.year}</th>
          {labels.map((l) => (
            <th scope="col" key={l}>
              {l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.year}>
            <th scope="row">{r.year}</th>
            {r.values.map((v, i) => (
              <td key={i}>
                <span className={`lesson-bar lesson-bar--${i}`} style={{ width: `${(v / max) * 100}%` }} aria-hidden="true" />
                <span className="lesson-value">{u(v)}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Snowball({ t }: { t: Copy }) {
  const [rate, setRate] = useState("4");
  const [data, setData] = useState<{ compound: number[]; simple: number[] } | null>(null);

  useEffect(() => {
    api.get<{ compound: number[]; simple: number[] }>(`/child/lessons/snowball?rate=${rate}`).then(setData).catch(() => setData(null));
  }, [rate]);

  return (
    <div className="lesson-body">
      <p>{t.snowIntro(percentText(rate))}</p>
      <div className="money-chips" role="group" aria-label={t.rateLabel}>
        {["2", "4", "6"].map((r) => (
          <button key={r} type="button" className={`money-chip${rate === r ? " money-chip--on" : ""}`} onClick={() => setRate(r)} aria-pressed={rate === r}>
            {percentText(r)}
          </button>
        ))}
      </div>
      {data && <Bars t={t} labels={[t.simple, t.compound]} rows={YEARS_SHOWN.map((y) => ({ year: y, values: [data.simple[y], data.compound[y]] }))} />}
      <p className="library-note" role="note">
        {t.snowNote}
      </p>
    </div>
  );
}

function Fees({ t }: { t: Copy }) {
  const [fee, setFee] = useState("1");
  const [data, setData] = useState<{ withoutFees: number[]; withFees: number[] } | null>(null);

  useEffect(() => {
    api.get<{ withoutFees: number[]; withFees: number[] }>(`/child/lessons/fees?fee=${fee}`).then(setData).catch(() => setData(null));
  }, [fee]);

  const gap = data ? data.withoutFees[10] - data.withFees[10] : 0;
  return (
    <div className="lesson-body">
      <p>{t.feesIntro}</p>
      <div className="money-chips" role="group" aria-label={t.feesLabel}>
        {["0.5", "1", "2"].map((f) => (
          <button key={f} type="button" className={`money-chip${fee === f ? " money-chip--on" : ""}`} onClick={() => setFee(f)} aria-pressed={fee === f}>
            {t.perYear(percentText(DEC.format(Number(f))))}
          </button>
        ))}
      </div>
      {data && (
        <>
          <Bars t={t} labels={[t.noFees, t.withFees]} rows={YEARS_SHOWN.map((y) => ({ year: y, values: [data.withoutFees[y], data.withFees[y]] }))} />
          <p>
            {t.gapStart} <b>{t.gapUnits(u(gap))}</b>.
          </p>
        </>
      )}
      <p className="library-note" role="note">
        {t.feesNote}
      </p>
    </div>
  );
}

function MarketList({ t }: { t: Copy }) {
  const [data, setData] = useState<{ source: "partie" | "illustration"; years: number; prices: number[] } | null>(null);

  useEffect(() => {
    api.get<{ source: "partie" | "illustration"; years: number; prices: number[] }>("/child/lessons/market-list").then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;
  const last = data.prices[data.prices.length - 1];
  const shown = data.prices.map((p, y) => ({ year: y, values: [p] })).filter((r) => r.year === 0 || r.year === data.years || r.year % Math.max(1, Math.floor(data.years / 4)) === 0);
  return (
    <div className="lesson-body">
      <p>{data.source === "partie" ? t.marketGame(data.years, u(last)) : t.marketExample(u(last))}</p>
      <Bars t={t} labels={[t.listPrice]} rows={shown} />
      <p className="library-note" role="note">
        {t.marketNote}
      </p>
    </div>
  );
}

const LESSONS = [
  { id: "snowball", art: "compound", Body: Snowball },
  { id: "fees", art: "risk", Body: Fees },
  { id: "market", art: "inflation", Body: MarketList },
];

/** Leçons chiffrées (10-12 ans) : chaque tableau vient du moteur de simulation. */
export function Lessons() {
  const t = useCopy(COPY);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="lessons" aria-labelledby="lessons-title">
      <h2 id="lessons-title">{t.title}</h2>
      {LESSONS.map(({ id, art, Body }) => (
        <article key={id} className={`lesson${open === id ? " lesson--open" : ""}`}>
          <button type="button" className="lesson-head" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
            <img className="lesson-head-art" src={`/assets/learning/learning-${art}-320.webp`} alt="" loading="lazy" />
            <strong>{t.lessons[id][0]}</strong>
            <small>{t.lessons[id][1]}</small>
          </button>
          {open === id && <Body t={t} />}
        </article>
      ))}
    </section>
  );
}
