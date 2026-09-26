import { useEffect } from "react";
import { useDialogFocus } from "../../lib/useDialogFocus";
import { KIND_WORD, fullDate, signed, type MoneyLine } from "../../lib/money";
import { KindIcon } from "./MoneyLineRow";

const PLACE_NAME = { account: "Mon compte", vault: "Mon coffre" } as const;

/**
 * Détail d'un mouvement : Avant · Mouvement · Après. C'est le geste qui fait comprendre
 * l'arithmétique d'un solde (docs/FINANCIAL_EDUCATION.md §11.2).
 */
export function LineDetailSheet({ line, onClose }: { line: MoneyLine; onClose: () => void }) {
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
              {KIND_WORD[line.kind]} · {PLACE_NAME[line.place]}
            </p>
          </div>
        </div>

        <div className="money-sheet-math" aria-label={`Avant ${line.balanceBefore}, mouvement ${signed(line.amount)}, après ${line.balanceAfter}`}>
          <div>
            <span>Avant</span>
            <strong>{line.balanceBefore}</strong>
          </div>
          <div className={line.amount > 0 ? "money-sheet-move money-sheet-move--in" : "money-sheet-move"}>
            <span>Mouvement</span>
            <strong>{signed(line.amount)}</strong>
          </div>
          <div>
            <span>Après</span>
            <strong>{line.balanceAfter}</strong>
          </div>
        </div>

        <dl className="money-sheet-facts">
          <div>
            <dt>Date</dt>
            <dd>{fullDate(line.createdAt)}</dd>
          </div>
          <div>
            <dt>Par</dt>
            <dd>{line.author}</dd>
          </div>
          {line.reason && (
            <div>
              <dt>Raison</dt>
              <dd>{line.reason}</dd>
            </div>
          )}
          {line.pending && (
            <div>
              <dt>État</dt>
              <dd>En attente de validation par un parent</dd>
            </div>
          )}
          {line.kind === "transfert" && (
            <div>
              <dt>À retenir</dt>
              <dd>Un transfert change tes pièces de place. Ton total ne change pas.</dd>
            </div>
          )}
        </dl>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
