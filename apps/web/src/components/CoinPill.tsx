import { CoinArt } from "../art/CoinArt";
import { pieces } from "../lib/money";

/** Montant en pièces, avec la vraie pièce Okodukai (pas un pictogramme). */
export function CoinPill({ amount }: { amount: number }) {
  return (
    <span className="coin-pill" aria-label={pieces(amount)}>
      <CoinArt size={20} className="ok-coin" />
      <span>{amount}</span>
    </span>
  );
}
