import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";
import { useDialogFocus } from "../../lib/useDialogFocus";

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
  const [loading, setLoading] = useState(true);
  const purchaseRef = useDialogFocus<HTMLDivElement>(confirming !== null);

  async function load() {
    try { const [rewardsRes, walletRes] = await Promise.all([
      api.get<{ rewards: RewardRow[] }>("/child/rewards"),
      api.get<{ balances: { available: number } }>("/child/wallet"),
    ]);
    setRewards(rewardsRes.rewards);
    setBalance(walletRes.balances.available);
    } catch { setError("Impossible de charger la boutique. Réessaie dans un instant."); }
    finally { setLoading(false); }
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
    <div className="stack shop-page">
      <header className="shop-header"><div className="page-scene-title"><span className="page-scene-icon"><GameIcon name="shop" size={30}/></span><div><p className="scene-kicker">Récompenses familiales</p><h1>Boutique</h1><p>Choisis ce que tu veux obtenir avec tes pièces.</p></div></div><div className="shop-wallet"><span>Ma bourse</span><CoinPill amount={balance}/></div></header>

      {success && (
        <div className="card" style={{ background: "var(--forest-soft)", color: "var(--forest)" }}>
          {success}
        </div>
      )}

      {loading ? <p className="loading-message" role="status">La boutique se prépare…</p> : error && !confirming ? <p className="form-error" role="alert">{error}</p> : rewards.length === 0 ? (
        <EmptyState art="coin-pouch" title="Boutique vide" subtitle="Reviens bientôt, tes parents préparent des récompenses." />
      ) : (
        <div className="reward-grid">
          {rewards.map((r) => (
            <article key={r.id} className="reward-item">
              <span className="reward-item-icon"><GameIcon name={r.category === "EXPERIENCE" ? "ticket" : "gift"} size={36}/></span>
              <span className="reward-item-category">{r.category === "EXPERIENCE" ? "Expérience" : "Objet"}</span>
              <h2>{r.title}</h2>
              <div className="reward-item-price"><span>Prix</span><CoinPill amount={r.priceCoins}/></div>
              <button
                className="btn btn-primary btn-block"
                disabled={balance < r.priceCoins}
                onClick={() => setConfirming(r)}
              >
                {balance < r.priceCoins ? `Il manque ${r.priceCoins - balance} pièces` : <><span className="label-long">Demander cette récompense</span><span className="label-short">Demander</span></>}
              </button>
            </article>
          ))}
        </div>
      )}

      {confirming && (
        <div className="dialog-backdrop">
          <div ref={purchaseRef} className="card reward-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title" onKeyDown={(e) => { if (e.key === "Escape") setConfirming(null); }}>
            <h2 id="purchase-title" className="font-display" style={{ fontSize: 20 }}>
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
