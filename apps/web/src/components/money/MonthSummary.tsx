import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: { title: "Mon mois en pièces", label: (month: string) => `Mon mois en pièces : ${month}` },
  en: { title: "My month in coins", label: (month: string) => `My month in coins: ${month}` },
});

/**
 * Volet « Mon mois en pièces » (docs/INVESTMENT_UX.md E9) : au premier bilan qui suit un changement
 * de mois réel, ce qui est entré, sorti et parti dans Mon coffre. Sans jugement, montré une fois.
 * Le texte vient du serveur, dans la langue demandée.
 */
export function MonthSummary() {
  const t = useCopy(COPY);
  const [summary, setSummary] = useState<{ month: string; text: string; goal: string | null } | null>(null);

  useEffect(() => {
    api
      .get<{ summary: { month: string; text: string; goal: string | null } | null }>("/child/money/month-summary")
      .then((r) => setSummary(r.summary))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;
  return (
    <aside className="month-summary" aria-label={t.label(summary.month)}>
      <strong>{t.title}</strong>
      <p>{summary.text}</p>
      {summary.goal && <p className="money-hint">{summary.goal}</p>}
    </aside>
  );
}
