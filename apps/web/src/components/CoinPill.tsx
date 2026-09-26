import { CoinArt } from "../art/CoinArt";

/** Montant en pièces, avec la vraie pièce Okodukai (pas un pictogramme). */
export function CoinPill({ amount }: { amount: number }) {
  return (
    <span className="coin-pill" aria-label={`${amount} pièces`}>
      <CoinArt size={20} className="ok-coin" />
      <span>{amount}</span>
    </span>
  );
}
