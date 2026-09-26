import { KIND_WORD, dayLabel, signed, timeLabel, type LineKind, type MoneyLine } from "../../lib/money";

/** Icône de sens : elle accompagne toujours le mot, elle ne le remplace jamais. */
export function KindIcon({ kind, amount }: { kind: LineKind; amount: number }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "transfert":
      return (
        <svg {...common}>
          <path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4 4-4-4 4-4" />
        </svg>
      );
    case "remboursement":
      return (
        <svg {...common}>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </svg>
      );
    case "correction":
      return (
        <svg {...common}>
          <path d="M4 20h4L19 9l-4-4L4 16z" />
          <path d="m13 7 4 4" />
        </svg>
      );
    case "prime_coffre":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "bonus_epargne":
      return (
        <svg {...common}>
          <path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
        </svg>
      );
    default:
      // Entrée : la flèche entre dans la bourse ; sortie : elle en sort.
      return amount >= 0 ? (
        <svg {...common}>
          <path d="M12 3v11m-4-4 4 4 4-4" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M12 14V3m-4 4 4-4 4 4" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
      );
  }
}

interface MoneyLineRowProps {
  line: MoneyLine;
  showBalance?: boolean;
  /** Repère de temps : l'heure (dans un groupe par jour) ou le jour (liste courte). */
  when?: "time" | "day";
  onOpen?: (line: MoneyLine) => void;
}

/** Une ligne de relevé : ce qui s'est passé, le mot de sens, le montant signé. */
export function MoneyLineRow({ line, showBalance = false, when = "time", onOpen }: MoneyLineRowProps) {
  const word = KIND_WORD[line.kind];
  const spoken = `${word}, ${Math.abs(line.amount)} ${Math.abs(line.amount) > 1 ? "pièces" : "pièce"}, ${line.label}${line.pending ? ", en attente de validation" : ""}`;
  const content = (
    <>
      <span className={`money-line-icon money-line-icon--${line.kind}${line.amount < 0 ? " money-line-icon--out" : ""}`}>
        <KindIcon kind={line.kind} amount={line.amount} />
      </span>
      <span className="money-line-text">
        <strong>{line.label}</strong>
        <small>
          {word}
          {` · ${when === "time" ? timeLabel(line.createdAt) : dayLabel(line.createdAt)}`}
          {line.pending && <span className="money-line-pending"> · En attente de validation</span>}
        </small>
      </span>
      <span className="money-line-amounts">
        <span className={`money-line-amount${line.amount > 0 ? " money-line-amount--in" : ""}`}>{signed(line.amount)}</span>
        {showBalance && <small>Solde {line.balanceAfter}</small>}
      </span>
    </>
  );
  if (!onOpen) {
    return (
      <div className="money-line" aria-label={spoken}>
        {content}
      </div>
    );
  }
  return (
    <button type="button" className="money-line money-line--button" onClick={() => onOpen(line)} aria-label={`${spoken}. Voir le détail`}>
      {content}
    </button>
  );
}
