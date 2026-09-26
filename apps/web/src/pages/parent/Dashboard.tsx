import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";

interface PendingCompletion { id: string; quest: { title: string; rewardCoins: number; rewardXp: number }; child: { id: string; displayName: string; avatarId: string } }
interface PendingRedemption { id: string; priceCoinsAtPurchase: number; reward: { title: string }; child: { id: string; displayName: string; avatarId: string } }
interface VaultRequest { id: string; amount: number; createdAt: string; child: { id: string; displayName: string; avatarId: string } }
interface ChildSummary { id: string; displayName: string; avatarId: string; currentLevel: number; balances: { available: number; vault: number } }

export function Dashboard() {
  const [completions, setCompletions] = useState<PendingCompletion[]>([]);
  const [redemptions, setRedemptions] = useState<PendingRedemption[]>([]);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [vaultRequests, setVaultRequests] = useState<VaultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try { const [dashboard, childrenRes, vaultRes] = await Promise.all([
      api.get<{ pendingCompletions: PendingCompletion[]; pendingRedemptions: PendingRedemption[] }>("/household/dashboard"),
      api.get<{ children: ChildSummary[] }>("/household/children"),
      api.get<{ requests: VaultRequest[] }>("/household/vault-requests"),
    ]); setCompletions(dashboard.pendingCompletions); setRedemptions(dashboard.pendingRedemptions); setChildren(childrenRes.children); setVaultRequests(vaultRes.requests); setError(null); }
    catch { setError("Impossible de charger la vue familiale. Réessayez dans un instant."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function reviewQuest(id: string, decision: "VALIDEE" | "A_REFAIRE" | "REFUSEE") {
    setBusyId(id); try { await api.post(`/quest-completions/${id}/review`, { decision }); await load(); } catch { setError("La décision n'a pas été enregistrée. Réessayez."); } finally { setBusyId(null); }
  }
  async function reviewReward(id: string, decision: "ACCEPTEE" | "REFUSEE") {
    setBusyId(id); try { await api.post(`/reward-redemptions/${id}/review`, { decision }); await load(); } catch { setError("La décision n'a pas été enregistrée. Réessayez."); } finally { setBusyId(null); }
  }

  async function reviewVault(id: string, decision: "approve" | "refuse") {
    setBusyId(id); try { await api.post(`/household/vault-requests/${id}/decision`, { decision }); await load(); } catch (err) { setError(err instanceof Error && err.message ? err.message : "La décision n'a pas été enregistrée. Réessayez."); await load(); } finally { setBusyId(null); }
  }

  const pendingCount = completions.length + redemptions.length + vaultRequests.length;

  if (loading) return <p className="loading-message" role="status">Chargement de la famille…</p>;
  return <div className="parent-dashboard">
    <header className="parent-dashboard-header"><div><p className="scene-kicker">Votre foyer</p><h1>La famille aujourd'hui</h1><p>Les pièces, les projets et les demandes en un regard.</p></div><div className="parent-dashboard-pending"><strong>{pendingCount}</strong><span>à valider</span></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section aria-labelledby="children-title"><div className="parent-section-heading"><h2 id="children-title">Les enfants</h2><Link to="/parent/enfants">Gérer les profils <GameIcon name="arrow" size={16}/></Link></div>
      {children.length === 0 ? <EmptyState icon="user" title="Aucun profil enfant" subtitle="Ajoutez un enfant pour commencer."/> : <div className="parent-child-grid">{children.map((child) => <div className="parent-child-card" key={child.id}>
        <div className="parent-child-identity"><Avatar avatarId={child.avatarId}/><div><strong>{child.displayName}</strong><span>Niveau {child.currentLevel}</span></div></div>
        <div className="parent-child-money"><div><span>Disponible</span><CoinPill amount={child.balances.available}/></div><div><span>Au coffre</span><strong><GameIcon name="vault" size={18}/>{child.balances.vault}</strong></div></div>
      </div>)}</div>}
    </section>
    <section aria-labelledby="pending-title"><div className="parent-section-heading"><h2 id="pending-title">Demandes à valider</h2><span className="pending-count">{pendingCount}</span></div>
      {pendingCount === 0 ? <EmptyState icon="check" title="Tout est à jour" subtitle="Aucune validation en attente pour le moment."/> : <div className="approval-list">
        {completions.map((c) => <article key={c.id} className="approval-row"><span className="approval-icon"><GameIcon name="quest" size={23}/></span><div className="approval-copy"><span>{c.child.displayName} a terminé une quête</span><strong>{c.quest.title}</strong><small>+{c.quest.rewardCoins} pièces · +{c.quest.rewardXp} XP · 1 booster</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"VALIDEE")}>Valider</button><button className="btn btn-ghost btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"A_REFAIRE")}>À refaire</button><button className="btn btn-danger btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"REFUSEE")}>Refuser</button></div></article>)}
        {vaultRequests.map((v) => <article key={v.id} className="approval-row"><span className="approval-icon"><GameIcon name="vault" size={23}/></span><div className="approval-copy"><span>{v.child.displayName} veut reprendre des pièces de son coffre</span><strong>{v.amount} pièces vers son compte</strong><small>Règle du coffre : retrait avec votre accord</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === v.id} onClick={() => void reviewVault(v.id,"approve")}>Accepter</button><button className="btn btn-danger btn-sm" disabled={busyId === v.id} onClick={() => void reviewVault(v.id,"refuse")}>Refuser</button></div></article>)}
        {redemptions.map((r) => <article key={r.id} className="approval-row"><span className="approval-icon"><GameIcon name="gift" size={23}/></span><div className="approval-copy"><span>{r.child.displayName} demande une récompense</span><strong>{r.reward.title}</strong><small>{r.priceCoinsAtPurchase} pièces</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => void reviewReward(r.id,"ACCEPTEE")}>Accepter</button><button className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => void reviewReward(r.id,"REFUSEE")}>Refuser</button></div></article>)}
      </div>}
    </section>
    <nav className="parent-quick-actions" aria-label="Actions rapides"><Link to="/parent/quetes"><GameIcon name="quest" size={21}/>Créer une quête</Link><Link to="/parent/boutique"><GameIcon name="gift" size={21}/>Ajouter une récompense</Link><Link to="/parent/enfants"><GameIcon name="user" size={21}/>Ajouter un enfant</Link></nav>
  </div>;
}
