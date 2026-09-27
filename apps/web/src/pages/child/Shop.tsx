import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";
import { useDialogFocus } from "../../lib/useDialogFocus";
import { ObjectArt } from "../../art/ObjectArt";
import { RewardArt } from "../../components/RewardArt";
import { defineCopy, useCopy } from "../../i18n";

const copy = defineCopy({
  fr: { loadError: "Impossible de charger la boutique. Réessaie dans un instant.", requestError: "Une erreur est survenue", requested: (title: string) => `${title} demandé ! Un parent va valider.`, kicker: "Récompenses familiales", title: "Boutique", intro: "Choisis ce que tu veux obtenir avec tes pièces.", wallet: "Ma bourse", loading: "La boutique se prépare…", empty: "Boutique vide", emptyHelp: "Reviens bientôt, tes parents préparent des récompenses.", experience: "Expérience", object: "Objet", price: "Prix", missing: (amount: number) => `Il manque ${amount} pièces`, requestLong: "Demander cette récompense", requestShort: "Demander", confirm: (price: number, balance: number) => `Tu veux utiliser ${price} de tes ${balance} pièces ?`, remaining: (amount: number) => `Il te restera ${amount} pièces.`, yes: "Oui, je la veux", later: "Pas maintenant" },
  en: { loadError: "Could not load the shop. Try again shortly.", requestError: "Something went wrong", requested: (title: string) => `${title} requested! A parent will approve it.`, kicker: "Family rewards", title: "Shop", intro: "Choose what you would like to get with your coins.", wallet: "My purse", loading: "Preparing the shop…", empty: "The shop is empty", emptyHelp: "Come back soon. Your parents are preparing rewards.", experience: "Experience", object: "Item", price: "Price", missing: (amount: number) => `${amount} coins needed`, requestLong: "Request this reward", requestShort: "Request", confirm: (price: number, balance: number) => `Use ${price} of your ${balance} coins?`, remaining: (amount: number) => `You will have ${amount} coins left.`, yes: "Yes, I want it", later: "Not now" },
});

interface RewardRow {
  id: string;
  title: string;
  category: "EXPERIENCE" | "OBJET";
  priceCoins: number;
}

export function Shop() {
  const t = useCopy(copy);
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
    } catch { setError(t.loadError); }
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
      setSuccess(t.requested(confirming.title));
      setConfirming(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack shop-page">
      <header className="shop-header"><div className="page-scene-title page-scene-title--art"><ObjectArt name="shop-stall" folder="shop" size={132} /><div><p className="scene-kicker">{t.kicker}</p><h1>{t.title}</h1><p>{t.intro}</p></div></div><div className="shop-wallet"><span>{t.wallet}</span><CoinPill amount={balance}/></div></header>

      {success && (
        <div className="card" style={{ background: "var(--forest-soft)", color: "var(--forest)" }}>
          {success}
        </div>
      )}

      {loading ? <p className="loading-message" role="status">{t.loading}</p> : error && !confirming ? <p className="form-error" role="alert">{error}</p> : rewards.length === 0 ? (
        <EmptyState art="coin-pouch" title={t.empty} subtitle={t.emptyHelp} />
      ) : (
        <div className="reward-grid">
          {rewards.map((r) => (
            <article key={r.id} className="reward-item">
              <RewardArt title={r.title} category={r.category}/>
              <span className="reward-item-category">{r.category === "EXPERIENCE" ? t.experience : t.object}</span>
              <h2>{r.title}</h2>
              <div className="reward-item-price"><span>{t.price}</span><CoinPill amount={r.priceCoins}/></div>
              <button
                className="btn btn-primary btn-block"
                disabled={balance < r.priceCoins}
                onClick={() => setConfirming(r)}
              >
                {balance < r.priceCoins ? t.missing(r.priceCoins - balance) : <><span className="label-long">{t.requestLong}</span><span className="label-short">{t.requestShort}</span></>}
              </button>
            </article>
          ))}
        </div>
      )}

      {confirming && (
        <div className="dialog-backdrop">
          <div ref={purchaseRef} className="card reward-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title" onKeyDown={(e) => { if (e.key === "Escape") setConfirming(null); }}>
            <h2 id="purchase-title" className="font-display" style={{ fontSize: 20 }}>
              {t.confirm(confirming.priceCoins, balance)}
            </h2>
            <p className="text-faint text-sm">{t.remaining(balance - confirming.priceCoins)}</p>
            {error && <div className="form-error">{error}</div>}
            <div className="stack" style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-block" disabled={submitting} onClick={confirmPurchase}>
                {t.yes}
              </button>
              <button className="btn btn-ghost btn-block" onClick={() => setConfirming(null)}>
                {t.later}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
