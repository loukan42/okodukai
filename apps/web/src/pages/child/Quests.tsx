import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";
import { useAuth } from "../../lib/AuthContext";
import { ObjectArt } from "../../art/ObjectArt";
import { defineCopy, useCopy } from "../../i18n";

interface QuestRow { id: string; title: string; description: string | null; status: string; rewardCoins: number; rewardXp: number; difficulty: "FACILE" | "MOYENNE" | "IMPORTANTE" | "EXCEPTIONNELLE"; recurrence: "UNIQUE" | "QUOTIDIENNE" | "HEBDOMADAIRE" }
const copy = defineCopy({
  fr: { status: { DISPONIBLE:"Disponible", ACCEPTEE:"Acceptée", EN_COURS:"En cours", EN_ATTENTE_VALIDATION:"En attente du parent", VALIDEE:"Validée", A_REFAIRE:"À refaire", REFUSEE:"Refusée" }, kind: { habit: "Habitude", major: "Grande quête", mission: "Mission" }, loadError: "Impossible de charger les quêtes. Réessaie dans un instant.", actionError: "L'action n'a pas été enregistrée. Réessaie.", kicker: "À faire et à gagner", title: "Journal de quêtes", intro: "Choisis une quête, puis préviens un parent quand elle est terminée.", loading: "Chargement des quêtes…", empty: "Pas encore de quête", emptyHelp: "Demande à un parent de t'en proposer une.", reward: "Récompense après validation", start: "Commencer", complete: "J'ai terminé", waiting: "En attente de validation" },
  en: { status: { DISPONIBLE:"Available", ACCEPTEE:"Accepted", EN_COURS:"In progress", EN_ATTENTE_VALIDATION:"Waiting for a parent", VALIDEE:"Approved", A_REFAIRE:"Try again", REFUSEE:"Declined" }, kind: { habit: "Habit", major: "Major quest", mission: "Mission" }, loadError: "Could not load quests. Try again shortly.", actionError: "The action was not saved. Try again.", kicker: "To do and earn", title: "Quest journal", intro: "Choose a quest, then tell a parent when it is done.", loading: "Loading quests…", empty: "No quests yet", emptyHelp: "Ask a parent to add one for you.", reward: "Reward after approval", start: "Start", complete: "I'm done", waiting: "Waiting for approval" },
});
const questKind = (quest: QuestRow, kind: (typeof copy)["fr"]["kind"]) => quest.recurrence !== "UNIQUE" ? kind.habit : quest.difficulty === "IMPORTANTE" || quest.difficulty === "EXCEPTIONNELLE" ? kind.major : kind.mission;
const questObject = (quest: QuestRow) => quest.recurrence !== "UNIQUE" ? "coin-sprout" : quest.difficulty === "IMPORTANTE" || quest.difficulty === "EXCEPTIONNELLE" ? "hourglass" : "quest-scroll";

export function Quests() {
  const t = useCopy(copy);
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() { try { const res = await api.get<{ quests: QuestRow[] }>("/child/quests"); setQuests(res.quests); setError(null); } catch { setError(t.loadError); } finally { setLoading(false); } }
  useEffect(() => { if (childId) { setLoading(true); void load(); } }, [childId]);

  async function act(id: string, action: "accept" | "complete") {
    setBusyId(id); setError(null);
    try { await api.post(`/child/quests/${id}/${action}`); await load(); }
    catch { setError(t.actionError); }
    finally { setBusyId(null); }
  }

  return <div className="quests-page"><header className="page-scene-title page-scene-title--art"><ObjectArt name="quest-board" folder="quests" size={132} /><div><p className="scene-kicker">{t.kicker}</p><h1>{t.title}</h1><p>{t.intro}</p></div></header>
    {loading ? <p className="loading-message" role="status">{t.loading}</p> : quests.length === 0 && !error ? <EmptyState art="quest-scroll" title={t.empty} subtitle={t.emptyHelp}/> : null}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="quest-journal">{quests.map((q, index) => <article className={`quest-sheet quest-sheet--${q.status.toLowerCase()}`} key={q.id}>
      <div className="quest-sheet-index"><ObjectArt name={questObject(q)} size={100}/><span>{String(index+1).padStart(2,"0")}</span></div>
      <div className="quest-sheet-main"><div className="quest-sheet-heading"><div><span className="quest-kind">{questKind(q, t.kind)}</span><h2>{q.title}</h2></div><span className="quest-status">{t.status[q.status as keyof typeof t.status] ?? q.status}</span></div>
        {q.description && <p>{q.description}</p>}
        <div className="quest-sheet-bottom"><div className="quest-sheet-rewards"><span className="reward-label">{t.reward}</span><CoinPill amount={q.rewardCoins}/><span className="xp-badge"><GameIcon name="xp" size={17}/>{q.rewardXp} XP</span></div>
          {(q.status === "DISPONIBLE" || q.status === "A_REFAIRE") && <button className="btn btn-primary" disabled={busyId === q.id} onClick={() => void act(q.id,"accept")}>{t.start}</button>}
          {(q.status === "ACCEPTEE" || q.status === "EN_COURS") && <button className="btn btn-gold" disabled={busyId === q.id} onClick={() => void act(q.id,"complete")}>{t.complete}</button>}
          {q.status === "EN_ATTENTE_VALIDATION" && <span className="quest-waiting"><GameIcon name="lock" size={17}/> {t.waiting}</span>}
        </div>
      </div>
    </article>)}</div>
  </div>;
}
