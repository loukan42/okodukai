import { GameIcon } from "../GameIcon";

/** « +20 XP · Première répartition » : le montant vient toujours du serveur, rien s'il vaut 0. */
export function XpEarned({ amount, reason }: { amount: number; reason: string }) {
  if (amount <= 0) return null;
  return (
    <p role="status">
      <span className="xp-badge">
        <GameIcon name="xp" size={17} />+{amount} XP · {reason}
      </span>
    </p>
  );
}
