import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { CoinPill } from "../../components/CoinPill";
import { ProgressBar } from "../../components/ProgressBar";

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
    <div className="stack">
      <h1 className="font-display" style={{ fontSize: 24 }}>
        Mon coffre
      </h1>

      <div className="grid-2">
        <div className="card card--tight" style={{ textAlign: "center" }}>
          <p className="text-sm text-faint">Ma bourse</p>
          <CoinPill amount={balances.available} />
        </div>
        <div className="card card--tight" style={{ textAlign: "center" }}>
          <p className="text-sm text-faint">Mon coffre</p>
          <span className="pill pill-forest" style={{ fontSize: 16 }}>
            🏦 {balances.vault}
          </span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        <p className="text-sm text-faint" style={{ marginBottom: 8 }}>
          Mettre de côté ou reprendre
        </p>
        <div className="row">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: 90, border: "1.5px solid var(--parchment-line)", borderRadius: 8, padding: 10 }}
          />
          <button className="btn btn-primary btn-sm" onClick={lock}>
            → Coffre
          </button>
          <button className="btn btn-ghost btn-sm" onClick={unlock}>
            ← Bourse
          </button>
        </div>
      </div>

      {activeGoal ? (
        <div className="card">
          <p className="text-sm text-faint">Mon objectif</p>
          <p style={{ fontWeight: 700, fontSize: 18 }}>{activeGoal.title}</p>
          <ProgressBar value={balances.vault} max={activeGoal.targetCoins} />
          <p className="text-sm text-faint" style={{ marginTop: 8 }}>
            {balances.vault} / {activeGoal.targetCoins}
            {balances.vault < activeGoal.targetCoins && ` · il te manque ${activeGoal.targetCoins - balances.vault}`}
          </p>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setShowNewGoal(true)}>
          + Choisir un objectif
        </button>
      )}

      {showNewGoal && (
        <form onSubmit={createGoal} className="card">
          <div className="field">
            <label>Objectif</label>
            <input value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="Glace en famille" required />
          </div>
          <div className="field">
            <label>Prix (pièces)</label>
            <input type="number" min={1} value={newGoalTarget} onChange={(e) => setNewGoalTarget(Number(e.target.value))} />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Enregistrer
          </button>
        </form>
      )}

      <Link to="/enfant/apprendre" className="card card-row" style={{ textDecoration: "none", color: "inherit" }}>
        <div>
          <p style={{ fontWeight: 700, margin: 0 }}>📘 Apprendre</p>
          <p className="text-sm text-faint" style={{ margin: 0 }}>
            Comprendre l'épargne et l'argent
          </p>
        </div>
        <span style={{ fontSize: 18 }}>→</span>
      </Link>

      <div>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 10 }}>
          Historique
        </h2>
        <div className="stack" style={{ gap: 8 }}>
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
