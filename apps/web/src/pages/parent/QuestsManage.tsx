import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";

interface ChildOption {
  id: string;
  displayName: string;
}

interface QuestRow {
  id: string;
  title: string;
  status: string;
  rewardCoins: number;
  rewardXp: number;
  active: boolean;
  child: { id: string; displayName: string };
}

const TEMPLATES = [
  { title: "Vider le lave-vaisselle", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
  { title: "Ranger sa chambre", category: "AUTONOMIE", difficulty: "MOYENNE", coins: 15, xp: 20 },
  { title: "Mettre la table", category: "ENTRAIDE", difficulty: "FACILE", coins: 5, xp: 10 },
  { title: "Lire 15 minutes", category: "APPRENTISSAGE", difficulty: "FACILE", coins: 5, xp: 15 },
  { title: "Sortir les poubelles", category: "MAISON", difficulty: "FACILE", coins: 10, xp: 15 },
  { title: "Nourrir l'animal", category: "ANIMAUX", difficulty: "FACILE", coins: 5, xp: 10 },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  MAISON: "Maison",
  AUTONOMIE: "Autonomie",
  APPRENTISSAGE: "Apprentissage",
  ENTRAIDE: "Entraide",
  CREATIVITE: "Créativité",
  ECOLE: "École",
  JARDIN: "Jardin",
  ANIMAUX: "Animaux",
};

export function QuestsManage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("MAISON");
  const [coins, setCoins] = useState(10);
  const [xp, setXp] = useState(15);
  const [recurrence, setRecurrence] = useState("UNIQUE");
  const [creating, setCreating] = useState(false);

  async function load() {
    const [childrenRes, questsRes] = await Promise.all([
      api.get<{ children: ChildOption[] }>("/household/children"),
      api.get<{ quests: QuestRow[] }>("/quests"),
    ]);
    setChildren(childrenRes.children);
    setQuests(questsRes.quests);
    if (!childId && childrenRes.children[0]) setChildId(childrenRes.children[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setTitle(t.title);
    setCategory(t.category);
    setCoins(t.coins);
    setXp(t.xp);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!childId || !title) return;
    setCreating(true);
    try {
      await api.post("/quests", {
        childId,
        title,
        category,
        difficulty: "FACILE",
        rewardCoins: coins,
        rewardXp: xp,
        recurrence,
      });
      setTitle("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function archive(id: string) {
    await api.patch(`/quests/${id}`, { active: false });
    load();
  }

  return (
    <div className="stack parent-manage-page">
      <div className="card parent-form-panel">
        <h1 className="parent-form-title"><GameIcon name="quest" size={27}/> Nouvelle quête</h1>
        <p className="text-faint text-sm">Partez d'une idée ou écrivez votre propre quête. Chaque quête validée offre aussi un booster de cartes, ajouté à l'inventaire de l'enfant.</p>
        <div className="row-wrap" style={{ marginBottom: 16 }}>
          {TEMPLATES.map((t) => (
            <button key={t.title} type="button" className="pill pill-sky" style={{ cursor: "pointer", border: "none" }} onClick={() => applyTemplate(t)}>
              {t.title}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="quest-child">Enfant</label>
              <select id="quest-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quest-category">Catégorie</label>
              <select id="quest-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="quest-title">Titre de la quête</label>
            <input id="quest-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vider le lave-vaisselle" required />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="quest-coins">Pièces</label>
              <input id="quest-coins" type="number" min={0} value={coins} onChange={(e) => setCoins(Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="quest-xp">XP</label>
              <input id="quest-xp" type="number" min={0} value={xp} onChange={(e) => setXp(Number(e.target.value))} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="quest-recurrence">Récurrence</label>
            <select id="quest-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="UNIQUE">Unique</option>
              <option value="QUOTIDIENNE">Quotidienne</option>
              <option value="HEBDOMADAIRE">Hebdomadaire</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
            Créer la quête
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
          Quêtes actives
        </h2>
        {quests.filter((q) => q.active).length === 0 ? (
          <EmptyState icon="quest" title="Aucune quête" subtitle="Créez-en une pour commencer." />
        ) : (
          <div className="stack">
            {quests
              .filter((q) => q.active)
              .map((q) => (
                <div key={q.id} className="card card--tight card-row">
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{q.title}</p>
                    <p className="text-sm text-faint" style={{ margin: 0 }}>
                      {q.child.displayName} · +{q.rewardXp} XP · 1 booster · {q.status}
                    </p>
                  </div>
                  <CoinPill amount={q.rewardCoins}/>
                  <button className="btn btn-ghost btn-sm" onClick={() => archive(q.id)}>
                    Archiver
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
