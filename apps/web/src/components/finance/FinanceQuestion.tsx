import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { XpEarned } from "../invest/XpEarned";

type Context = "onboarding" | "vault" | "bilan" | "library";
interface Question {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
}
interface Result {
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  word: string | null;
}

/**
 * Petite vérification (docs/FINANCIAL_EDUCATION.md §9) : une question, des options mélangées par le
 * serveur, « Je ne sais pas encore » en dernier. Pas de chrono, pas de score ; un retour neutre.
 * `onAnswered` : appelé après la réponse (l'onboarding attend la réponse pour continuer).
 */
export function FinanceQuestion({ context, mode, onAnswered, onEmpty }: { context: Context; mode?: "MIROIR" | "ASSURANCE_VIE"; onAnswered?: () => void; onEmpty?: () => void }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ context, ...(mode ? { mode } : {}) });
    api
      .get<{ question: Question | null }>(`/child/finance/question?${params}`)
      .then((res) => {
        if (cancelled) return;
        setQuestion(res.question);
        if (!res.question) onEmpty?.();
      })
      .catch(() => onEmpty?.());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, mode]);

  if (!question || dismissed) return null;

  async function answer(optionId: string) {
    setSending(true);
    try {
      setResult(await api.post<Result>(`/child/finance/questions/${question!.id}/answer`, { optionId, context, mode }));
      onAnswered?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="finance-question" aria-labelledby={`question-${question.id}`}>
      <p className="finance-question-kicker">Petite vérification</p>
      <h3 id={`question-${question.id}`}>{question.prompt}</h3>
      {!result ? (
        <div className="finance-question-options">
          {question.options.map((o) => (
            <button key={o.id} type="button" className={`finance-option${o.id === "je_ne_sais_pas" ? " finance-option--unsure" : ""}`} disabled={sending} onClick={() => void answer(o.id)}>
              {o.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="finance-question-result" role="status">
          <p>{result.feedback}</p>
          {result.correct && result.word && <p className="finance-question-word">Nouveau mot dans ton carnet : {result.word}.</p>}
          <XpEarned amount={result.xpAwarded} reason="Notion vérifiée" />
          {context !== "onboarding" && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>
              Continuer
            </button>
          )}
        </div>
      )}
    </section>
  );
}
