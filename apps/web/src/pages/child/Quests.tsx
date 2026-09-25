import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";

interface QuestRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  rewardCoins: number;
  rewardXp: number;
}

const STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: "Disponible",
  ACCEPTEE: "Acceptée",
  EN_COURS: "En cours",
  EN_ATTENTE_VALIDATION: "En attente de validation",
  VALIDEE: "Validée",
  A_REFAIRE: "À refaire",
  REFUSEE: "Refusée",
};

export function Quests() {
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ quests: QuestRow[] }>("/child/quests");
    setQuests(res.quests);
  }

  useEffect(() => {
    load();
  }, []);

  async function accept(id: string) {
    setBusyId(id);
    try {
      await api.post(`/child/quests/${id}/accept`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function complete(id: string) {
    setBusyId(id);
    try {
      await api.post(`/child/quests/${id}/complete`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (quests.length === 0) {
    return <EmptyState emoji="🗺️" title="Pas encore de quête" subtitle="Demande à un parent de t'en proposer une." />;
  }

  return (
    <div className="stack">
      <h1 className="font-display" style={{ fontSize: 24 }}>
        Journal de quêtes
      </h1>
      {quests.map((q) => (
        <div key={q.id} className="card">
          <p style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{q.title}</p>
          {q.description && (
            <p className="text-sm text-faint" style={{ marginTop: 4 }}>
              {q.description}
            </p>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <CoinPill amount={q.rewardCoins} />
            <span className="pill pill-sky">⭐ {q.rewardXp} XP</span>
            <span className="pill" style={{ background: "var(--parchment-dim)" }}>
              {STATUS_LABEL[q.status] ?? q.status}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            {(q.status === "DISPONIBLE" || q.status === "A_REFAIRE") && (
              <button className="btn btn-primary" disabled={busyId === q.id} onClick={() => accept(q.id)}>
                Commencer
              </button>
            )}
            {(q.status === "ACCEPTEE" || q.status === "EN_COURS") && (
              <button className="btn btn-gold" disabled={busyId === q.id} onClick={() => complete(q.id)}>
                J'ai terminé !
              </button>
            )}
            {q.status === "EN_ATTENTE_VALIDATION" && (
              <p className="text-sm text-faint" style={{ margin: 0 }}>
                En attente de validation par un parent…
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
