import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { CoinPill } from "../../components/CoinPill";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";

interface Goal {
  id: string;
  title: string;
  targetCoins: number;
  achievedAt: string | null;
}

interface WalletTx {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  QUEST_REWARD: "Quête",
  PARENT_BONUS: "Bonus",
  PARENT_ADJUSTMENT: "Correction",
  REWARD_PURCHASE: "Récompense",
  REWARD_REFUND: "Remboursement",
  SAVINGS_LOCK: "Mis de côté",
  SAVINGS_UNLOCK: "Repris du coffre",
  SAVINGS_BONUS: "Bonus d'épargne",
};

const DEBIT_TYPES = new Set(["REWARD_PURCHASE", "SAVINGS_LOCK"]);

export function Vault() {
  const [balances, setBalances] = useState({ available: 0, vault: 0 });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(50);
  const [showNewGoal, setShowNewGoal] = useState(false);

  async function load() {
    const [wallet, goalsRes] = await Promise.all([
      api.get<{ balances: typeof balances; transactions: WalletTx[] }>("/child/wallet"),
      api.get<{ goals: Goal[] }>("/child/savings/goals"),
    ]);
    setBalances(wallet.balances);
    setTransactions(wallet.transactions);
    setGoals(goalsRes.goals);
  }

  useEffect(() => {
    load();
  }, []);

  async function lock() {
    setError(null);
    try {
      await api.post("/child/savings/lock", { amount });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    }
  }

  async function unlock() {
    setError(null);
    try {
      await api.post("/child/savings/unlock", { amount });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    }
  }

  async function createGoal(e: FormEvent) {
    e.preventDefault();
    if (!newGoalTitle) return;
    await api.post("/child/savings/goals", { title: newGoalTitle, targetCoins: newGoalTarget });
    setNewGoalTitle("");
    setShowNewGoal(false);
    await load();
  }

  const activeGoal = goals.find((g) => !g.achievedAt);

  return (
    <div className="stack vault-page">
      <header className="page-scene-title"><span className="page-scene-icon"><GameIcon name="vault" size={31}/></span><div><p className="scene-kicker">Ma bourse et mon épargne</p><h1>Mon coffre</h1><p>Mets des pièces de côté pour ce qui compte pour toi.</p></div></header>

      <div className="vault-balances">
        <div className="vault-balance vault-balance--wallet">
          <GameIcon name="coin" size={30}/><span>Dans ma bourse</span><strong>{balances.available} <small>pièces</small></strong>
        </div>
        <div className="vault-balance vault-balance--saved">
          <GameIcon name="vault" size={30}/><span>Dans mon coffre</span><strong>{balances.vault} <small>pièces</small></strong>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card vault-transfer">
        <label htmlFor="vault-amount">Combien de pièces veux-tu déplacer ?</label>
        <div className="row-wrap">
          <input
            id="vault-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <button className="btn btn-primary" onClick={lock}>
            Mettre au coffre
          </button>
          <button className="btn btn-ghost" onClick={unlock}>
            Reprendre dans ma bourse
          </button>
        </div>
      </div>

      {activeGoal ? (
        <div className="goal-panel vault-goal">
          <span className="goal-panel-mark"><GameIcon name="flag" size={29}/></span><div className="goal-panel-content"><span>Mon objectif</span><strong>{activeGoal.title}</strong>
          <ProgressBar value={balances.vault} max={activeGoal.targetCoins} />
          <small>{balances.vault} sur {activeGoal.targetCoins} pièces{balances.vault < activeGoal.targetCoins && ` · il te manque ${activeGoal.targetCoins - balances.vault}`}</small></div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setShowNewGoal(true)}>
          + Choisir un objectif
        </button>
      )}

      {showNewGoal && (
        <form onSubmit={createGoal} className="card">
          <div className="field">
            <label htmlFor="goal-name">Objectif</label>
            <input id="goal-name" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="Glace en famille" required />
          </div>
          <div className="field">
            <label htmlFor="goal-target">Prix (pièces)</label>
            <input id="goal-target" type="number" min={1} value={newGoalTarget} onChange={(e) => setNewGoalTarget(Number(e.target.value))} />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Enregistrer
          </button>
        </form>
      )}

      <Link to="/enfant/apprendre" className="learn-callout">
        <span className="feature-icon"><GameIcon name="learn" size={25}/></span><span><strong>Apprendre</strong><small>Comprendre l'épargne et l'argent</small></span><GameIcon name="arrow" size={18}/>
      </Link>

      <div>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 10 }}>
          Historique
        </h2>
        <div className="vault-history">
          {transactions.map((t) => (
            <div key={t.id} className="card card--tight card-row">
              <span className="text-sm">{t.reason ?? TYPE_LABEL[t.type] ?? t.type}</span>
              <span style={{ fontWeight: 800, color: DEBIT_TYPES.has(t.type) ? "var(--danger)" : "var(--success)" }}>
                {DEBIT_TYPES.has(t.type) ? "−" : "+"}
                {t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
