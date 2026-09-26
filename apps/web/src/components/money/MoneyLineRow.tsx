import { ArrowCounterClockwise, ArrowsLeftRight, DownloadSimple, PencilSimple, PlusCircle, Sparkle, UploadSimple } from "@phosphor-icons/react";
import { KIND_WORD, dayLabel, signed, timeLabel, type LineKind, type MoneyLine } from "../../lib/money";

/** Icône de sens : elle accompagne toujours le mot, elle ne le remplace jamais. */
export function KindIcon({ kind, amount }: { kind: LineKind; amount: number }) {
  const props = { size: 20, weight: "duotone" as const, "aria-hidden": true };
  switch (kind) {
    case "transfert":
      return <ArrowsLeftRight {...props} />;
    case "remboursement":
      return <ArrowCounterClockwise {...props} />;
    case "correction":
      return <PencilSimple {...props} />;
    case "prime_coffre":
      return <PlusCircle {...props} />;
    case "bonus_epargne":
      return <Sparkle {...props} />;
    default:
      // Entrée : la flèche entre dans la bourse ; sortie : elle en sort.
      return amount >= 0 ? <DownloadSimple {...props} /> : <UploadSimple {...props} />;
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
