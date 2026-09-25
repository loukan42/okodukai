import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { CoinPill } from "../../components/CoinPill";
import { ProgressBar } from "../../components/ProgressBar";
import { EmptyState } from "../../components/EmptyState";
import { BoosterOpenOverlay } from "../../components/BoosterOpenOverlay";

interface QuestRow {
  id: string;
  title: string;
  status: string;
  rewardCoins: number;
  rewardXp: number;
}

interface Goal {
  id: string;
  title: string;
  targetCoins: number;
  achievedAt: string | null;
}

interface BoosterRow {
  id: string;
  definition: { title: string; universe: { title: string } };
}

export function Home() {
  const { session } = useAuth();
  const [balances, setBalances] = useState({ available: 0, vault: 0 });
  const [level, setLevel] = useState({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [openingBooster, setOpeningBooster] = useState<BoosterRow | null>(null);

  async function load() {
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
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session?.kind !== "child") return null;

  return (
    <div className="stack">
      <div>
        <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
          Bonjour {session.child.displayName} 👋
        </h1>
        <div className="row" style={{ marginTop: 8 }}>
          <CoinPill amount={balances.available} />
          <span className="pill" style={{ background: "var(--parchment-dim)" }}>
            ⭐ Niveau {level.level}
          </span>
        </div>
      </div>

      {goal && (
        <div className="card">
          <p className="text-sm text-faint" style={{ marginBottom: 4 }}>
            Mon objectif
          </p>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{goal.title}</p>
          <ProgressBar value={balances.vault} max={goal.targetCoins} />
          <p className="text-sm text-faint" style={{ marginTop: 8 }}>
            {balances.vault} / {goal.targetCoins} pièces dans le coffre
          </p>
        </div>
      )}

      {boosters.length > 0 && (
        <button
          className="card card-row"
          style={{ border: "none", cursor: "pointer", width: "100%", background: "linear-gradient(135deg, var(--gold-soft), var(--gold))" }}
          onClick={() => setOpeningBooster(boosters[0])}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ fontWeight: 800, margin: 0 }}>🎁 {boosters.length} booster{boosters.length > 1 ? "s" : ""} à ouvrir</p>
            <p className="text-sm" style={{ margin: 0 }}>
              {boosters[0].definition.universe.title}
            </p>
          </div>
          <span style={{ fontSize: 22 }}>→</span>
        </button>
      )}

      <Link to="/enfant/apprendre" className="card card-row" style={{ textDecoration: "none", color: "inherit" }}>
        <div>
          <p style={{ fontWeight: 700, margin: 0 }}>📘 Apprendre</p>
          <p className="text-sm text-faint" style={{ margin: 0 }}>
            Découvre comment fonctionne l'argent
          </p>
        </div>
        <span style={{ fontSize: 18 }}>→</span>
      </Link>

      <div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 20 }}>
            Mes quêtes
          </h2>
          <Link to="/enfant/quetes" className="text-sm">
            Tout voir →
          </Link>
        </div>
        {quests.length === 0 ? (
          <EmptyState emoji="🗺️" title="Pas encore de quête" subtitle="Demande à un parent de t'en proposer une." />
        ) : (
          <div className="stack">
            {quests.slice(0, 3).map((q) => (
              <div key={q.id} className="card card--tight card-row">
                <p style={{ fontWeight: 700, margin: 0 }}>{q.title}</p>
                <div className="row">
                  <CoinPill amount={q.rewardCoins} />
                  <span className="pill pill-sky">⭐ {q.rewardXp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BoosterOpenOverlay
        open={openingBooster !== null}
        onOpen={async () => {
          const res = await api.post<{ cards: { id: string; name: string; rarity: string; artworkUrl: string | null }[] }>(
            `/child/boosters/${openingBooster!.id}/open`
          );
          return res.cards as never;
        }}
        onClose={() => {
          setOpeningBooster(null);
          load();
        }}
      />
    </div>
  );
}
