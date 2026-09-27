import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { CoinPill } from "../../components/CoinPill";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";
import { ParentShareCard } from "../../components/share/ParentShareCard";
import { ParentShareModal } from "../../components/share/ParentShareModal";
import { isShareCardDismissed } from "../../share/dismiss";
import { defineCopy, useCopy } from "../../i18n";
import { LEVEL_TITLE, titleCodeForLevel } from "../../lib/levels";

interface PendingCompletion { id: string; quest: { title: string; rewardCoins: number; rewardXp: number }; child: { id: string; displayName: string; avatarId: string } }
interface PendingRedemption { id: string; priceCoinsAtPurchase: number; reward: { title: string }; child: { id: string; displayName: string; avatarId: string } }
interface VaultRequest { id: string; amount: number; createdAt: string; child: { id: string; displayName: string; avatarId: string } }
interface ChildSummary { id: string; displayName: string; avatarId: string; currentLevel: number; balances: { available: number; vault: number } }

const COPY = defineCopy({
  fr: {
    loadError: "Impossible de charger la vue familiale. Réessayez dans un instant.",
    decisionError: "La décision n'a pas été enregistrée. Réessayez.",
    loading: "Chargement de la famille…",
    kicker: "Votre foyer",
    title: "La famille aujourd'hui",
    lead: "Les pièces, les projets et les demandes en un regard.",
    toApprove: "à valider",
    children: "Les enfants",
    manage: "Gérer les profils",
    noChild: "Aucun profil enfant",
    noChildHint: "Ajoutez un enfant pour commencer.",
    level: (n: number, title: string) => `Niveau ${n} · ${title}`,
    available: "Disponible",
    inVault: "Au coffre",
    pending: "Demandes à valider",
    allClear: "Tout est à jour",
    allClearHint: "Aucune validation en attente pour le moment.",
    questDone: (name: string) => `${name} a terminé une quête`,
    questReward: (coins: number, xp: number) => `+${coins} pièces · +${xp} XP`,
    approve: "Valider",
    redo: "À refaire",
    decline: "Refuser",
    vaultAsk: (name: string) => `${name} veut reprendre des pièces de son coffre`,
    vaultAmount: (n: number) => `${n} pièces vers son compte`,
    vaultRule: "Règle du coffre : retrait avec votre accord",
    accept: "Accepter",
    rewardAsk: (name: string) => `${name} demande une récompense`,
    coins: (n: number) => `${n} pièces`,
    quick: "Actions rapides",
    newQuest: "Créer une quête",
    newReward: "Ajouter une récompense",
    newChild: "Ajouter un enfant",
  },
  en: {
    loadError: "We couldn't load the family view. Try again in a moment.",
    decisionError: "Your decision wasn't saved. Please try again.",
    loading: "Loading your family…",
    kicker: "Your household",
    title: "The family today",
    lead: "Coins, plans and requests at a glance.",
    toApprove: "to approve",
    children: "Children",
    manage: "Manage profiles",
    noChild: "No child profile yet",
    noChildHint: "Add a child to get started.",
    level: (n: number, title: string) => `Level ${n} · ${title}`,
    available: "Available",
    inVault: "In the vault",
    pending: "Requests to approve",
    allClear: "All up to date",
    allClearHint: "Nothing is waiting for approval right now.",
    questDone: (name: string) => `${name} finished a quest`,
    questReward: (coins: number, xp: number) => `+${coins} coins · +${xp} XP`,
    approve: "Approve",
    redo: "Redo",
    decline: "Decline",
    vaultAsk: (name: string) => `${name} wants to take coins out of their vault`,
    vaultAmount: (n: number) => `${n} coins back to their account`,
    vaultRule: "Vault rule: withdrawals need your approval",
    accept: "Accept",
    rewardAsk: (name: string) => `${name} is asking for a reward`,
    coins: (n: number) => `${n} coins`,
    quick: "Quick actions",
    newQuest: "Create a quest",
    newReward: "Add a reward",
    newChild: "Add a child",
  },
});

export function Dashboard() {
  const t = useCopy(COPY);
  const [completions, setCompletions] = useState<PendingCompletion[]>([]);
  const [redemptions, setRedemptions] = useState<PendingRedemption[]>([]);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [vaultRequests, setVaultRequests] = useState<VaultRequest[]>([]);
  const [hasValidatedQuest, setHasValidatedQuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCardVisible, setShareCardVisible] = useState(() => !isShareCardDismissed());

  async function load() {
    try { const [dashboard, childrenRes, vaultRes] = await Promise.all([
      api.get<{ pendingCompletions: PendingCompletion[]; pendingRedemptions: PendingRedemption[]; hasValidatedQuest?: boolean }>("/household/dashboard"),
      api.get<{ children: ChildSummary[] }>("/household/children"),
      api.get<{ requests: VaultRequest[] }>("/household/vault-requests"),
    ]); setCompletions(dashboard.pendingCompletions); setRedemptions(dashboard.pendingRedemptions); setChildren(childrenRes.children); setVaultRequests(vaultRes.requests); setHasValidatedQuest(Boolean(dashboard.hasValidatedQuest)); setError(null); }
    catch { setError(t.loadError); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function reviewQuest(id: string, decision: "VALIDEE" | "A_REFAIRE" | "REFUSEE") {
    setBusyId(id); try { await api.post(`/quest-completions/${id}/review`, { decision }); await load(); } catch { setError(t.decisionError); } finally { setBusyId(null); }
  }
  async function reviewReward(id: string, decision: "ACCEPTEE" | "REFUSEE") {
    setBusyId(id); try { await api.post(`/reward-redemptions/${id}/review`, { decision }); await load(); } catch { setError(t.decisionError); } finally { setBusyId(null); }
  }

  async function reviewVault(id: string, decision: "approve" | "refuse") {
    setBusyId(id); try { await api.post(`/household/vault-requests/${id}/decision`, { decision }); await load(); } catch (err) { setError(err instanceof Error && err.message ? err.message : t.decisionError); await load(); } finally { setBusyId(null); }
  }

  const pendingCount = completions.length + redemptions.length + vaultRequests.length;

  if (loading) return <p className="loading-message" role="status">{t.loading}</p>;
  return <div className="parent-dashboard">
    <header className="parent-dashboard-header"><div><p className="scene-kicker">{t.kicker}</p><h1>{t.title}</h1><p>{t.lead}</p></div><div className="parent-dashboard-pending"><strong>{pendingCount}</strong><span>{t.toApprove}</span></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {hasValidatedQuest && shareCardVisible && (
      <ParentShareCard onOpen={() => setShareOpen(true)} onDismiss={() => setShareCardVisible(false)} />
    )}
    <ParentShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    <section aria-labelledby="children-title"><div className="parent-section-heading"><h2 id="children-title">{t.children}</h2><Link to="/parent/enfants">{t.manage} <GameIcon name="arrow" size={16}/></Link></div>
      {children.length === 0 ? <EmptyState icon="user" title={t.noChild} subtitle={t.noChildHint}/> : <div className="parent-child-grid">{children.map((child) => <div className="parent-child-card" key={child.id}>
        <div className="parent-child-identity"><Avatar avatarId={child.avatarId}/><div><strong>{child.displayName}</strong><span>{t.level(child.currentLevel, LEVEL_TITLE[titleCodeForLevel(child.currentLevel)])}</span></div></div>
        <div className="parent-child-money"><div><span>{t.available}</span><CoinPill amount={child.balances.available}/></div><div><span>{t.inVault}</span><strong><GameIcon name="vault" size={18}/>{child.balances.vault}</strong></div></div>
      </div>)}</div>}
    </section>
    <section aria-labelledby="pending-title"><div className="parent-section-heading"><h2 id="pending-title">{t.pending}</h2><span className="pending-count">{pendingCount}</span></div>
      {pendingCount === 0 ? <EmptyState icon="check" title={t.allClear} subtitle={t.allClearHint}/> : <div className="approval-list">
        {completions.map((c) => <article key={c.id} className="approval-row"><span className="approval-icon"><GameIcon name="quest" size={23}/></span><div className="approval-copy"><span>{t.questDone(c.child.displayName)}</span><strong>{c.quest.title}</strong><small>{t.questReward(c.quest.rewardCoins, c.quest.rewardXp)}</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"VALIDEE")}>{t.approve}</button><button className="btn btn-ghost btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"A_REFAIRE")}>{t.redo}</button><button className="btn btn-danger btn-sm" disabled={busyId === c.id} onClick={() => void reviewQuest(c.id,"REFUSEE")}>{t.decline}</button></div></article>)}
        {vaultRequests.map((v) => <article key={v.id} className="approval-row"><span className="approval-icon"><GameIcon name="vault" size={23}/></span><div className="approval-copy"><span>{t.vaultAsk(v.child.displayName)}</span><strong>{t.vaultAmount(v.amount)}</strong><small>{t.vaultRule}</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === v.id} onClick={() => void reviewVault(v.id,"approve")}>{t.accept}</button><button className="btn btn-danger btn-sm" disabled={busyId === v.id} onClick={() => void reviewVault(v.id,"refuse")}>{t.decline}</button></div></article>)}
        {redemptions.map((r) => <article key={r.id} className="approval-row"><span className="approval-icon"><GameIcon name="gift" size={23}/></span><div className="approval-copy"><span>{t.rewardAsk(r.child.displayName)}</span><strong>{r.reward.title}</strong><small>{t.coins(r.priceCoinsAtPurchase)}</small></div><div className="approval-actions"><button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => void reviewReward(r.id,"ACCEPTEE")}>{t.accept}</button><button className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => void reviewReward(r.id,"REFUSEE")}>{t.decline}</button></div></article>)}
      </div>}
    </section>
    <nav className="parent-quick-actions" aria-label={t.quick}><Link to="/parent/quetes"><GameIcon name="quest" size={21}/>{t.newQuest}</Link><Link to="/parent/boutique"><GameIcon name="gift" size={21}/>{t.newReward}</Link><Link to="/parent/enfants"><GameIcon name="user" size={21}/>{t.newChild}</Link></nav>
  </div>;
}
