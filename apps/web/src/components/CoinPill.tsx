import { GameIcon } from "./GameIcon";

export function CoinPill({ amount }: { amount: number }) {
  return (
    <span className="coin-pill" aria-label={`${amount} pièces`}>
      <span className="ok-coin"><GameIcon name="coin" size={20} /></span><span>{amount}</span>
    </span>
  );
}
