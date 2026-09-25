export function CoinPill({ amount }: { amount: number }) {
  return (
    <span className="coin-pill">
      <span aria-hidden>🪙</span> {amount}
    </span>
  );
}
