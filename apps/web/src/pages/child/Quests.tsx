import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";
import { useAuth } from "../../lib/AuthContext";
import { ObjectArt } from "../../art/ObjectArt";

interface QuestRow { id: string; title: string; description: string | null; status: string; rewardCoins: number; rewardXp: number }
const STATUS_LABEL: Record<string,string> = { DISPONIBLE:"Disponible", ACCEPTEE:"Acceptée", EN_COURS:"En cours", EN_ATTENTE_VALIDATION:"En attente du parent", VALIDEE:"Validée", A_REFAIRE:"À refaire", REFUSEE:"Refusée" };

export function Quests() {
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() { try { const res = await api.get<{ quests: QuestRow[] }>("/child/quests"); setQuests(res.quests); setError(null); } catch { setError("Impossible de charger les quêtes. Réessaie dans un instant."); } finally { setLoading(false); } }
  useEffect(() => { if (childId) { setLoading(true); void load(); } }, [childId]);

  async function act(id: string, action: "accept" | "complete") {
    setBusyId(id); setError(null);
    try { await api.post(`/child/quests/${id}/${action}`); await load(); }
    catch { setError("L'action n'a pas été enregistrée. Réessaie."); }
    finally { setBusyId(null); }
  }

  return <div className="quests-page"><header className="page-scene-title page-scene-title--art"><ObjectArt name="quest-board" folder="quests" size={132} /><div><p className="scene-kicker">À faire et à gagner</p><h1>Journal de quêtes</h1><p>Choisis une quête, puis préviens un parent quand elle est terminée.</p></div></header>
    {loading ? <p className="loading-message" role="status">Chargement des quêtes…</p> : quests.length === 0 && !error ? <EmptyState icon="quest" title="Pas encore de quête" subtitle="Demande à un parent de t'en proposer une."/> : null}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="quest-journal">{quests.map((q, index) => <article className={`quest-sheet quest-sheet--${q.status.toLowerCase()}`} key={q.id}>
      <div className="quest-sheet-index"><GameIcon name="quest" size={21}/><span>{String(index+1).padStart(2,"0")}</span></div>
      <div className="quest-sheet-main"><div className="quest-sheet-heading"><h2>{q.title}</h2><span className="quest-status">{STATUS_LABEL[q.status] ?? q.status}</span></div>
        {q.description && <p>{q.description}</p>}
        <div className="quest-sheet-bottom"><div className="quest-sheet-rewards"><span className="reward-label">Récompense après validation</span><CoinPill amount={q.rewardCoins}/><span className="xp-badge"><GameIcon name="xp" size={17}/>{q.rewardXp} XP</span><span className="booster-reward"><GameIcon name="gift" size={17}/> 1 booster</span></div>
          {(q.status === "DISPONIBLE" || q.status === "A_REFAIRE") && <button className="btn btn-primary" disabled={busyId === q.id} onClick={() => void act(q.id,"accept")}>Commencer</button>}
          {(q.status === "ACCEPTEE" || q.status === "EN_COURS") && <button className="btn btn-gold" disabled={busyId === q.id} onClick={() => void act(q.id,"complete")}>J'ai terminé</button>}
          {q.status === "EN_ATTENTE_VALIDATION" && <span className="quest-waiting"><GameIcon name="lock" size={17}/> En attente de validation</span>}
        </div>
      </div>
    </article>)}</div>
  </div>;
}
