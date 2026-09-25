import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";

interface RewardRow {
  id: string;
  title: string;
  category: "EXPERIENCE" | "OBJET";
  priceCoins: number;
}

export function Shop() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [confirming, setConfirming] = useState<RewardRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const [rewardsRes, walletRes] = await Promise.all([
      api.get<{ rewards: RewardRow[] }>("/child/rewards"),
      api.get<{ balances: { available: number } }>("/child/wallet"),
    ]);
    setRewards(rewardsRes.rewards);
    setBalance(walletRes.balances.available);
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmPurchase() {
    if (!confirming) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/child/rewards/${confirming.id}/redeem`);
      setSuccess(`${confirming.title} demandé ! Un parent va valider.`);
      setConfirming(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="font-display" style={{ fontSize: 24 }}>
          Boutique
        </h1>
        <CoinPill amount={balance} />
      </div>

      {success && (
        <div className="card" style={{ background: "var(--forest-soft)", color: "var(--forest)" }}>
          {success}
        </div>
      )}

      {rewards.length === 0 ? (
        <EmptyState emoji="🎁" title="Boutique vide" subtitle="Reviens bientôt, tes parents préparent des récompenses." />
      ) : (
        <div className="grid-2">
          {rewards.map((r) => (
            <div key={r.id} className="card card--tight" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 30 }}>{r.category === "EXPERIENCE" ? "🎟️" : "🎁"}</p>
              <p style={{ fontWeight: 700, minHeight: 40 }}>{r.title}</p>
              <CoinPill amount={r.priceCoins} />
              <button
                className="btn btn-primary btn-block btn-sm"
                style={{ marginTop: 10 }}
                disabled={balance < r.priceCoins}
                onClick={() => setConfirming(r)}
              >
                Obtenir
              </button>
            </div>
          ))}
        </div>
      )}

      {confirming && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(28,46,74,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
            <h2 className="font-display" style={{ fontSize: 20 }}>
              Tu veux utiliser {confirming.priceCoins} de tes {balance} pièces ?
            </h2>
            <p className="text-faint text-sm">Il te restera {balance - confirming.priceCoins} pièces.</p>
            {error && <div className="form-error">{error}</div>}
            <div className="stack" style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-block" disabled={submitting} onClick={confirmPurchase}>
                Oui, je la veux
              </button>
              <button className="btn btn-ghost btn-block" onClick={() => setConfirming(null)}>
                Pas maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
