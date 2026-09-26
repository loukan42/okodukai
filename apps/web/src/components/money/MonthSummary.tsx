import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/**
 * Volet « Mon mois en pièces » (docs/INVESTMENT_UX.md E9) : au premier bilan qui suit un changement
 * de mois réel, ce qui est entré, sorti et parti dans Mon coffre. Sans jugement, montré une fois.
 */
export function MonthSummary() {
  const [summary, setSummary] = useState<{ month: string; text: string; goal: string | null } | null>(null);

  useEffect(() => {
    api
      .get<{ summary: { month: string; text: string; goal: string | null } | null }>("/child/money/month-summary")
      .then((r) => setSummary(r.summary))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;
  return (
    <aside className="month-summary" aria-label={`Mon mois en pièces : ${summary.month}`}>
      <strong>Mon mois en pièces</strong>
      <p>{summary.text}</p>
      {summary.goal && <p className="money-hint">{summary.goal}</p>}
    </aside>
  );
}
