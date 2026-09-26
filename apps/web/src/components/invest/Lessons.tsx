import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const FMT = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const u = (v: number) => FMT.format(v);
const YEARS_SHOWN = [0, 1, 2, 5, 10];

function Bars({ rows, labels }: { rows: { year: number; values: number[] }[]; labels: string[] }) {
  const max = Math.max(...rows.flatMap((r) => r.values));
  return (
    <table className="lesson-table">
      <thead>
        <tr>
          <th scope="col">Année</th>
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

function Snowball() {
  const [rate, setRate] = useState("4");
  const [data, setData] = useState<{ compound: number[]; simple: number[] } | null>(null);
  useEffect(() => {
    api.get<{ compound: number[]; simple: number[] }>(`/child/lessons/snowball?rate=${rate}`).then(setData).catch(() => setData(null));
  }, [rate]);
  return (
    <div className="lesson-body">
      <p>Si ça montait de {rate} % chaque année, pendant 10 ans, voici ce que deviendraient 100 unités :</p>
      <div className="money-chips" role="group" aria-label="Taux de l'exemple">
        {["2", "4", "6"].map((r) => (
          <button key={r} type="button" className={`money-chip${rate === r ? " money-chip--on" : ""}`} onClick={() => setRate(r)} aria-pressed={rate === r}>
            {r} %
          </button>
        ))}
      </div>
      {data && <Bars labels={["Intérêts simples", "Intérêts composés"]} rows={YEARS_SHOWN.map((y) => ({ year: y, values: [data.simple[y], data.compound[y]] }))} />}
      <p className="library-note" role="note">
        Avec les intérêts composés, les intérêts d'une année rapportent à leur tour l'année suivante. Les adultes appellent ça la capitalisation. C'est un exemple : un vrai placement ne monte pas du même pourcentage chaque année.
      </p>
    </div>
  );
}

function Fees() {
  const [fee, setFee] = useState("1");
  const [data, setData] = useState<{ withoutFees: number[]; withFees: number[] } | null>(null);
  useEffect(() => {
    api.get<{ withoutFees: number[]; withFees: number[] }>(`/child/lessons/fees?fee=${fee}`).then(setData).catch(() => setData(null));
  }, [fee]);
  const gap = data ? data.withoutFees[10] - data.withFees[10] : 0;
  return (
    <div className="lesson-body">
      <p>Même croissance de 4 % par an pendant 10 ans, avec ou sans frais de gestion :</p>
      <div className="money-chips" role="group" aria-label="Frais par an">
        {["0.5", "1", "2"].map((f) => (
          <button key={f} type="button" className={`money-chip${fee === f ? " money-chip--on" : ""}`} onClick={() => setFee(f)} aria-pressed={fee === f}>
            {f.replace(".", ",")} % par an
          </button>
        ))}
      </div>
      {data && (
        <>
          <Bars labels={["Sans frais", "Avec frais"]} rows={YEARS_SHOWN.map((y) => ({ year: y, values: [data.withoutFees[y], data.withFees[y]] }))} />
          <p>
            Après 10 ans, l'écart est de <b>{u(gap)} unités</b>.
          </p>
        </>
      )}
      <p className="library-note" role="note">
        Les frais, c'est ce que tu paies pour le service. Ils sont pris chaque année, même quand ça baisse : un petit pourcentage finit par compter.
      </p>
    </div>
  );
}

function MarketList() {
  const [data, setData] = useState<{ source: "partie" | "illustration"; years: number; prices: number[] } | null>(null);
  useEffect(() => {
    api.get<{ source: "partie" | "illustration"; years: number; prices: number[] }>("/child/lessons/market-list").then(setData).catch(() => setData(null));
  }, []);
  if (!data) return null;
  const last = data.prices[data.prices.length - 1];
  const shown = data.prices.map((p, y) => ({ year: y, values: [p] })).filter((r) => r.year === 0 || r.year === data.years || r.year % Math.max(1, Math.floor(data.years / 4)) === 0);
  return (
    <div className="lesson-body">
      <p>
        {data.source === "partie"
          ? `Au début de ta partie, la liste de courses du marché de la vallée coûtait 100 unités école. Après ${data.years} ${data.years > 1 ? "ans" : "an"}, elle en coûte ${u(last)}.`
          : `Si les prix montaient de 2 % par an, une liste de courses à 100 unités école en coûterait ${u(last)} dans 10 ans.`}
      </p>
      <Bars labels={["Prix de la liste"]} rows={shown} />
      <p className="library-note" role="note">
        Tes 100 unités restent 100. Mais si les prix montent, elles achètent un peu moins. Quand la plupart des prix montent avec le temps, on parle d'inflation. Les prix de ta boutique familiale, eux, sont fixés par tes parents.
      </p>
    </div>
  );
}

const LESSONS = [
  { id: "snowball", title: "L'effet boule de neige", subtitle: "Intérêts composés", Body: Snowball },
  { id: "fees", title: "Ce que coûtent les frais", subtitle: "Frais de gestion", Body: Fees },
  { id: "market", title: "La liste du marché", subtitle: "Inflation et pouvoir d'achat", Body: MarketList },
];

/** Leçons chiffrées (10-12 ans) : chaque tableau vient du moteur de simulation. */
export function Lessons() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="lessons" aria-labelledby="lessons-title">
      <h2 id="lessons-title">Les leçons chiffrées</h2>
      {LESSONS.map(({ id, title, subtitle, Body }) => (
        <article key={id} className={`lesson${open === id ? " lesson--open" : ""}`}>
          <button type="button" className="lesson-head" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </button>
          {open === id && <Body />}
        </article>
      ))}
    </section>
  );
}
