import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";

interface PendingCompletion {
  id: string;
  quest: { title: string; rewardCoins: number; rewardXp: number };
  child: { id: string; displayName: string; avatarId: string };
}

interface PendingRedemption {
  id: string;
  priceCoinsAtPurchase: number;
  reward: { title: string };
  child: { id: string; displayName: string; avatarId: string };
}

interface ChildSummary {
  id: string;
  displayName: string;
  avatarId: string;
  currentLevel: number;
  balances: { available: number; vault: number };
}

export function Dashboard() {
  const [completions, setCompletions] = useState<PendingCompletion[]>([]);
  const [redemptions, setRedemptions] = useState<PendingRedemption[]>([]);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [dashboard, childrenRes] = await Promise.all([
      api.get<{ pendingCompletions: PendingCompletion[]; pendingRedemptions: PendingRedemption[] }>(
        "/household/dashboard"
      ),
      api.get<{ children: ChildSummary[] }>("/household/children"),
    ]);
    setCompletions(dashboard.pendingCompletions);
    setRedemptions(dashboard.pendingRedemptions);
    setChildren(childrenRes.children);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewQuest(id: string, decision: "VALIDEE" | "A_REFAIRE" | "REFUSEE") {
    await api.post(`/quest-completions/${id}/review`, { decision });
    load();
  }

  async function reviewReward(id: string, decision: "ACCEPTEE" | "REFUSEE") {
    await api.post(`/reward-redemptions/${id}/review`, { decision });
    load();
  }

  if (loading) return <p className="text-faint">Chargement…</p>;

  return (
    <div className="stack">
      <div>
        <h1 className="font-display" style={{ fontSize: 26, marginBottom: 16 }}>
          La famille aujourd'hui
        </h1>
        <div className="grid-2">
          {children.map((child) => (
            <div key={child.id} className="card card--tight">
              <div className="row">
                <Avatar avatarId={child.avatarId} />
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{child.displayName}</p>
                  <p className="text-sm text-faint" style={{ margin: 0 }}>
                    Niveau {child.currentLevel}
                  </p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <CoinPill amount={child.balances.available} />
                <span className="pill pill-forest">🏦 {child.balances.vault}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
          En attente de validation
        </h2>
        {completions.length === 0 && redemptions.length === 0 ? (
          <EmptyState emoji="✅" title="Tout est à jour" subtitle="Aucune validation en attente pour le moment." />
        ) : (
          <div className="stack">
            {completions.map((c) => (
              <div key={c.id} className="card card--tight card-row">
                <div className="row">
                  <Avatar avatarId={c.child.avatarId} />
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{c.quest.title}</p>
                    <p className="text-sm text-faint" style={{ margin: 0 }}>
                      {c.child.displayName} · +{c.quest.rewardCoins} 🪙 · +{c.quest.rewardXp} XP
                    </p>
                  </div>
                </div>
                <div className="row">
                  <button className="btn btn-primary btn-sm" onClick={() => reviewQuest(c.id, "VALIDEE")}>
                    Valider
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => reviewQuest(c.id, "A_REFAIRE")}>
                    À refaire
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => reviewQuest(c.id, "REFUSEE")}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
            {redemptions.map((r) => (
              <div key={r.id} className="card card--tight card-row">
                <div className="row">
                  <Avatar avatarId={r.child.avatarId} />
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{r.reward.title}</p>
                    <p className="text-sm text-faint" style={{ margin: 0 }}>
                      {r.child.displayName} veut utiliser {r.priceCoinsAtPurchase} 🪙
                    </p>
                  </div>
                </div>
                <div className="row">
                  <button className="btn btn-primary btn-sm" onClick={() => reviewReward(r.id, "ACCEPTEE")}>
                    Accepter
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => reviewReward(r.id, "REFUSEE")}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="row-wrap">
        <Link to="/parent/quetes" className="btn btn-gold">
          + Nouvelle quête
        </Link>
        <Link to="/parent/boutique" className="btn btn-ghost">
          + Nouvelle récompense
        </Link>
        <Link to="/parent/enfants" className="btn btn-ghost">
          + Nouvel enfant
        </Link>
      </div>
    </div>
  );
}
