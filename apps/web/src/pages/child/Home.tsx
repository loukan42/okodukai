import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { CoinPill } from "../../components/CoinPill";
import { ProgressBar } from "../../components/ProgressBar";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";
import boosterImage from "../../assets/cards/card-booster.png";

interface QuestRow { id: string; title: string; status: string; rewardCoins: number; rewardXp: number }
interface Goal { id: string; title: string; targetCoins: number; achievedAt: string | null }
interface BoosterRow { id: string; definition: { title: string; universe: { title: string } } }

export function Home() {
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [balances, setBalances] = useState({ available: 0, vault: 0 });
  const [level, setLevel] = useState({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [wallet, me, questsRes, goalsRes, boostersRes] = await Promise.all([
        api.get<{ balances: { available: number; vault: number } }>("/child/wallet"),
        api.get<{ level: typeof level; child: { activeGoalId: string | null } }>("/child/me"),
        api.get<{ quests: QuestRow[] }>("/child/quests"),
        api.get<{ goals: Goal[] }>("/child/savings/goals"),
        api.get<{ boosters: BoosterRow[] }>("/child/boosters"),
      ]);
      setBalances(wallet.balances);
      setLevel(me.level);
      setQuests(questsRes.quests.filter((q) => ["DISPONIBLE", "ACCEPTEE", "A_REFAIRE"].includes(q.status)));
      setGoal(goalsRes.goals.find((g) => g.id === me.child.activeGoalId && !g.achievedAt) ?? null);
      setBoosters(boostersRes.boosters);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (childId) { setLoading(true); void load(); } }, [childId]);

  if (session?.kind !== "child") return null;
  if (loading) return <p className="loading-message" role="status">Ton espace se prépare…</p>;
  if (error) return <div className="empty-state"><strong>Impossible de charger ton espace.</strong><button className="btn btn-primary" onClick={() => void load()}>Réessayer</button></div>;

  return <div className="child-home">
    <section className="wallet-hero" aria-labelledby="welcome-title">
      <div className="wallet-hero-top"><div><p className="scene-kicker">Ton aventure</p><h1 id="welcome-title">Bonjour {session.child.displayName}</h1></div><span className="level-seal">Niv. {level.level}</span></div>
      <div className="wallet-main"><span className="wallet-main-icon"><GameIcon name="coin" size={37}/></span><div><p>Mon compte</p><strong>{balances.available} <small>pièces</small></strong></div></div>
      <div className="wallet-hero-bottom"><div><GameIcon name="vault" size={20}/><span>Mon coffre</span><strong>{balances.vault}</strong></div><Link to="/enfant/argent">Voir mon argent <GameIcon name="arrow" size={16}/></Link></div>
      <div className="xp-line"><span>Progression du niveau</span><span>{level.xpIntoLevel} / {level.xpForNextLevel} XP</span></div><ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel}/>
    </section>

    <div className="home-columns"><div className="home-main-column">
      <section className="home-section" aria-labelledby="goal-title"><div className="section-heading"><h2 id="goal-title">Mon objectif</h2><GameIcon name="flag" size={22}/></div>
        {goal ? <Link to="/enfant/argent/coffre" className="goal-panel"><span className="goal-panel-mark"><GameIcon name="flag" size={32}/></span><span className="goal-panel-content"><strong>{goal.title}</strong><span>{Math.min(balances.vault, goal.targetCoins)} sur {goal.targetCoins} pièces</span><ProgressBar value={balances.vault} max={goal.targetCoins}/><small>Il te manque {Math.max(0, goal.targetCoins - balances.vault)} pièces</small></span></Link> : <Link to="/enfant/argent/coffre" className="goal-panel goal-panel--empty"><GameIcon name="flag"/><span>Choisis un objectif pour ton coffre</span><GameIcon name="arrow" size={18}/></Link>}
      </section>
      <section className="home-section" aria-labelledby="quest-title"><div className="section-heading"><h2 id="quest-title">Journal de quêtes</h2><Link to="/enfant/quetes">Toutes les quêtes <GameIcon name="arrow" size={16}/></Link></div>
        {quests.length === 0 ? <EmptyState icon="quest" title="Pas encore de quête" subtitle="Demande à un parent de t'en proposer une."/> : <div className="quest-list">{quests.slice(0, 3).map((q, index) => <Link to="/enfant/quetes" className="quest-entry" key={q.id}><span className="quest-entry-number">{String(index + 1).padStart(2, "0")}</span><span className="quest-entry-copy"><strong>{q.title}</strong><small>{q.status === "ACCEPTEE" ? "Quête en cours" : "À commencer"}</small></span><span className="quest-entry-rewards"><CoinPill amount={q.rewardCoins}/><span className="xp-badge"><GameIcon name="xp" size={15}/>{q.rewardXp} XP</span><span className="booster-reward"><GameIcon name="gift" size={15}/> 1 booster</span></span></Link>)}</div>}
      </section>
    </div><aside className="home-side-column">
      <Link to="/enfant/collection" className="booster-callout"><span className="booster-callout-copy"><span>Ton inventaire</span><strong>{boosters.length > 0 ? `${boosters.length} booster${boosters.length > 1 ? "s" : ""} à ouvrir` : "Tes boosters"}</strong><small>{boosters.length > 0 ? "Ouvre-les quand tu veux dans ta collection." : "Chaque quête validée te donne un booster."}</small><span className="booster-callout-action">{boosters.length > 0 ? "Ouvrir un booster" : "Voir ma collection"} <GameIcon name="arrow" size={16}/></span></span><img src={boosterImage} alt=""/></Link>
      <Link to="/enfant/argent/investir" className="learn-callout"><span className="feature-icon"><GameIcon name="learn" size={27}/></span><span><strong>Apprendre</strong><small>Comprendre l'argent en faisant des choix</small></span><GameIcon name="arrow" size={18}/></Link>
      <Link to="/enfant/collection" className="learn-callout"><span className="feature-icon"><GameIcon name="collection" size={27}/></span><span><strong>Ma collection</strong><small>Retrouve tes cartes et tes univers</small></span><GameIcon name="arrow" size={18}/></Link>
    </aside></div>
  </div>;
}
