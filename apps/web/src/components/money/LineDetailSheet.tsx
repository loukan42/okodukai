import { useEffect } from "react";
import { useDialogFocus } from "../../lib/useDialogFocus";
import { kindWord, fullDate, signed, type MoneyLine } from "../../lib/money";
import { KindIcon } from "./MoneyLineRow";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    place: { account: "Ton compte", vault: "Coffre magique" },
    before: "Avant",
    move: "Mouvement",
    after: "Après",
    math: (before: number, move: string, after: number) => `Avant ${before}, mouvement ${move}, après ${after}`,
    date: "Date",
    by: "Par",
    reason: "Raison",
    state: "État",
    pending: "En attente de validation par un parent",
    remember: "À retenir",
    transfer: "Un transfert change tes pièces de place. Ton total ne change pas.",
    close: "Fermer",
  },
  en: {
    place: { account: "Your account", vault: "Magic Vault" },
    before: "Before",
    move: "Change",
    after: "After",
    math: (before: number, move: string, after: number) => `Before ${before}, change ${move}, after ${after}`,
    date: "Date",
    by: "By",
    reason: "Reason",
    state: "Status",
    pending: "Waiting for a parent to approve",
    remember: "Good to know",
    transfer: "A transfer moves your coins to another place. Your total stays the same.",
    close: "Close",
  },
});

/**
 * Détail d'un mouvement : Avant · Mouvement · Après. C'est le geste qui fait comprendre
 * l'arithmétique d'un solde (docs/FINANCIAL_EDUCATION.md §11.2).
 */
export function LineDetailSheet({ line, onClose }: { line: MoneyLine; onClose: () => void }) {
  const t = useCopy(COPY);
  const ref = useDialogFocus<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop money-sheet-backdrop" role="presentation" onClick={onClose}>
      <div ref={ref} className="money-sheet" role="dialog" aria-modal="true" aria-labelledby="money-sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="money-sheet-head">
          <span className={`money-line-icon money-line-icon--${line.kind}${line.amount < 0 ? " money-line-icon--out" : ""}`}>
            <KindIcon kind={line.kind} amount={line.amount} />
          </span>
          <div>
            <h2 id="money-sheet-title">{line.label}</h2>
            <p>
              {kindWord(line.kind)} · {t.place[line.place]}
            </p>
          </div>
        </div>

        <div className="money-sheet-math" aria-label={t.math(line.balanceBefore, signed(line.amount), line.balanceAfter)}>
          <div>
            <span>{t.before}</span>
            <strong>{line.balanceBefore}</strong>
          </div>
          <div className={line.amount > 0 ? "money-sheet-move money-sheet-move--in" : "money-sheet-move"}>
            <span>{t.move}</span>
            <strong>{signed(line.amount)}</strong>
          </div>
          <div>
            <span>{t.after}</span>
            <strong>{line.balanceAfter}</strong>
          </div>
        </div>

        <dl className="money-sheet-facts">
          <div>
            <dt>{t.date}</dt>
            <dd>{fullDate(line.createdAt)}</dd>
          </div>
          <div>
            <dt>{t.by}</dt>
            <dd>{line.author}</dd>
          </div>
          {line.reason && (
            <div>
              <dt>{t.reason}</dt>
              <dd>{line.reason}</dd>
            </div>
          )}
          {line.pending && (
            <div>
              <dt>{t.state}</dt>
              <dd>{t.pending}</dd>
            </div>
          )}
          {line.kind === "transfert" && (
            <div>
              <dt>{t.remember}</dt>
              <dd>{t.transfer}</dd>
            </div>
          )}
        </dl>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
