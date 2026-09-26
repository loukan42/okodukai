import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { FinanceQuestion } from "./FinanceQuestion";

interface Journal {
  tips: { code: string; title: string | null; message: string; shownAt: string }[];
  chapters: { chapter: number; title: string; notions: { code: string; word: string; state: "INCONNUE" | "RENCONTREE" | "EXPLIQUEE" | "VERIFIEE" }[] }[];
}

const STATE_LABEL = { INCONNUE: "pas encore vu", RENCONTREE: "rencontré", EXPLIQUEE: "expliqué", VERIFIEE: "vérifié" };

/**
 * Mon carnet (docs/FINANCIAL_EDUCATION.md §4.4) : les mots de la tranche par chapitre, colorés selon
 * leur état, et les feuillets déjà lus, relisibles à tout moment. Une question pour avancer.
 */
export function Carnet() {
  const [journal, setJournal] = useState<Journal | null>(null);

  useEffect(() => {
    api
      .get<Journal>("/child/finance/journal")
      .then(setJournal)
      .catch(() => setJournal(null));
  }, []);

  if (!journal) return null;
  const known = journal.chapters.flatMap((c) => c.notions).filter((n) => n.state === "EXPLIQUEE" || n.state === "VERIFIEE").length;

  return (
    <section className="carnet" aria-labelledby="carnet-title">
      <div className="section-heading">
        <h2 id="carnet-title">Mon carnet</h2>
        <span className="text-sm text-faint">{known} {known > 1 ? "mots compris" : "mot compris"}</span>
      </div>
      <FinanceQuestion context="library" />
      {journal.chapters.map((c) => (
        <div key={c.chapter} className="carnet-chapter">
          <h3>{c.title}</h3>
          <ul className="carnet-words">
            {c.notions.map((n) => (
              <li key={n.code} className={n.state === "VERIFIEE" ? "is-verified" : n.state === "EXPLIQUEE" ? "is-explained" : ""} title={STATE_LABEL[n.state]}>
                {n.state === "INCONNUE" ? "…" : n.word}
                <span className="sr-only"> : {STATE_LABEL[n.state]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {journal.tips.length > 0 && (
        <>
          <h3>Mes feuillets</h3>
          <ul className="carnet-leaves">
            {journal.tips.map((t) => (
              <li key={t.code}>
                {t.title && <strong>{t.title}</strong>}
                {t.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
