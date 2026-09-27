import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { FinanceQuestion } from "./FinanceQuestion";
import { GameIcon } from "../GameIcon";
import { defineCopy, useCopy } from "../../i18n";

interface Journal {
  tips: { code: string; title: string | null; message: string; shownAt: string }[];
  chapters: { chapter: number; title: string; notions: { code: string; word: string; state: "INCONNUE" | "RENCONTREE" | "EXPLIQUEE" | "VERIFIEE" }[] }[];
}

const COPY = defineCopy({
  fr: {
    title: "Mon carnet",
    known: (n: number) => `${n} ${n > 1 ? "mots compris" : "mot compris"}`,
    hint: "Les mots cachés se dévoilent quand tu les rencontres dans la vallée.",
    hidden: "Mot à découvrir",
    states: { INCONNUE: "pas encore vu", RENCONTREE: "rencontré", EXPLIQUEE: "expliqué", VERIFIEE: "vérifié" },
    leaves: "Mes feuillets",
  },
  en: {
    title: "My notebook",
    known: (n: number) => `${n} ${n === 1 ? "word understood" : "words understood"}`,
    hint: "Hidden words appear once you come across them in the valley.",
    hidden: "Word to discover",
    states: { INCONNUE: "not seen yet", RENCONTREE: "seen", EXPLIQUEE: "explained", VERIFIEE: "checked" },
    leaves: "My notes",
  },
});

/**
 * Mon carnet (docs/FINANCIAL_EDUCATION.md §4.4) : les mots de la tranche par chapitre, colorés selon
 * leur état, et les feuillets déjà lus, relisibles à tout moment. Une question pour avancer.
 */
export function Carnet() {
  const t = useCopy(COPY);
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
        <h2 id="carnet-title">{t.title}</h2>
        <span className="text-sm text-faint">{t.known(known)}</span>
      </div>
      <p className="text-sm text-faint carnet-hint">{t.hint}</p>
      <FinanceQuestion context="library" />
      {journal.chapters.map((c) => (
        <div key={c.chapter} className="carnet-chapter">
          <h3>{c.title}</h3>
          <ul className="carnet-words">
            {c.notions.map((n) => (
              <li key={n.code} className={n.state === "VERIFIEE" ? "is-verified" : n.state === "EXPLIQUEE" ? "is-explained" : n.state === "INCONNUE" ? "is-hidden" : ""} title={t.states[n.state]}>
                {n.state === "INCONNUE" ? (
                  <>
                    <GameIcon name="lock" size={13} />
                    <span className="sr-only">{t.hidden}</span>
                  </>
                ) : (
                  <>
                    {n.word}
                    <span className="sr-only"> : {t.states[n.state]}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {journal.tips.length > 0 && (
        <>
          <h3>{t.leaves}</h3>
          <ul className="carnet-leaves">
            {journal.tips.map((leaf) => (
              <li key={leaf.code}>
                {leaf.title && <strong>{leaf.title}</strong>}
                {leaf.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
