import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";
import { defineCopy, useCopy } from "../../i18n";

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

type Category = "MAISON" | "AUTONOMIE" | "APPRENTISSAGE" | "ENTRAIDE" | "CREATIVITE" | "ECOLE" | "JARDIN" | "ANIMAUX";
type Difficulty = "FACILE" | "MOYENNE" | "IMPORTANTE" | "EXCEPTIONNELLE";

// Reprend le plafond serveur (routes/quests.ts) : le parent choisit une difficulté, jamais l'XP directement.
const XP_BY_DIFFICULTY: Record<Difficulty, number> = { FACILE: 10, MOYENNE: 15, IMPORTANTE: 25, EXCEPTIONNELLE: 40 };

const TEMPLATES: { key: string; category: Category; coins: number; difficulty: Difficulty }[] = [
  { key: "dishwasher", category: "MAISON", coins: 10, difficulty: "MOYENNE" },
  { key: "room", category: "AUTONOMIE", coins: 15, difficulty: "IMPORTANTE" },
  { key: "table", category: "ENTRAIDE", coins: 5, difficulty: "FACILE" },
  { key: "read", category: "APPRENTISSAGE", coins: 5, difficulty: "MOYENNE" },
  { key: "bins", category: "MAISON", coins: 10, difficulty: "MOYENNE" },
  { key: "pet", category: "ANIMAUX", coins: 5, difficulty: "FACILE" },
];

const COPY = defineCopy({
  fr: {
    title: "Nouvelle quête",
    intro: "Partez d'une idée ou écrivez votre propre quête. Toutes les trois quêtes validées, l'enfant reçoit aussi un booster de cartes.",
    templates: {
      dishwasher: "Vider le lave-vaisselle",
      room: "Ranger sa chambre",
      table: "Mettre la table",
      read: "Lire 15 minutes",
      bins: "Sortir les poubelles",
      pet: "Nourrir l'animal",
    } as Record<string, string>,
    categories: {
      MAISON: "Maison",
      AUTONOMIE: "Autonomie",
      APPRENTISSAGE: "Apprentissage",
      ENTRAIDE: "Entraide",
      CREATIVITE: "Créativité",
      ECOLE: "École",
      JARDIN: "Jardin",
      ANIMAUX: "Animaux",
    } as Record<Category, string>,
    child: "Enfant",
    category: "Catégorie",
    questTitle: "Titre de la quête",
    placeholder: "Vider le lave-vaisselle",
    coins: "Pièces",
    difficulty: "Difficulté",
    difficulties: {
      FACILE: "Facile · +10 XP",
      MOYENNE: "Moyenne · +15 XP",
      IMPORTANTE: "Importante · +25 XP",
      EXCEPTIONNELLE: "Exceptionnelle · +40 XP",
    } as Record<Difficulty, string>,
    xpHint:
      "L'XP fait monter le niveau de votre enfant ; elle vient de la difficulté choisie. Chaque niveau lui offre un booster de cartes et, à certains niveaux, un nouveau titre. Elle ne se convertit jamais en pièces : gardez les pièces pour l'argent, l'XP pour l'effort.",
    coinsHint: "Repère : 5 à 15 pièces pour une tâche du quotidien.",
    recurrence: "Récurrence",
    recurrences: { UNIQUE: "Une seule fois", QUOTIDIENNE: "Chaque jour", HEBDOMADAIRE: "Chaque semaine" } as Record<string, string>,
    create: "Créer la quête",
    active: "Quêtes actives",
    none: "Aucune quête",
    noneHint: "Créez-en une pour commencer.",
    meta: (name: string, xp: number) => `${name} · +${xp} XP`,
    statuses: {
      DISPONIBLE: "Disponible",
      ACCEPTEE: "Acceptée",
      EN_COURS: "En cours",
      DECLAREE_TERMINEE: "Terminée, à vérifier",
      EN_ATTENTE_VALIDATION: "À valider",
      VALIDEE: "Validée",
      A_REFAIRE: "À refaire",
      REFUSEE: "Refusée",
    } as Record<string, string>,
    archive: "Archiver",
    archiveLabel: (title: string) => `Archiver la quête « ${title} »`,
  },
  en: {
    title: "New quest",
    intro: "Start from an idea or write your own quest. Every third approved quest also gives a booster of cards.",
    templates: {
      dishwasher: "Empty the dishwasher",
      room: "Tidy your room",
      table: "Set the table",
      read: "Read for 15 minutes",
      bins: "Take out the bins",
      pet: "Feed the pet",
    },
    categories: {
      MAISON: "Home",
      AUTONOMIE: "Independence",
      APPRENTISSAGE: "Learning",
      ENTRAIDE: "Helping out",
      CREATIVITE: "Creativity",
      ECOLE: "School",
      JARDIN: "Garden",
      ANIMAUX: "Pets",
    },
    child: "Child",
    category: "Category",
    questTitle: "Quest title",
    placeholder: "Empty the dishwasher",
    coins: "Coins",
    difficulty: "Difficulty",
    difficulties: {
      FACILE: "Easy · +10 XP",
      MOYENNE: "Medium · +15 XP",
      IMPORTANTE: "Big · +25 XP",
      EXCEPTIONNELLE: "Exceptional · +40 XP",
    },
    xpHint:
      "XP raises your child's level and comes from the difficulty you pick. Each level gives them a booster of cards, and some levels add a new title. XP never turns into coins: coins are for money, XP is for effort.",
    coinsHint: "As a guide: 5 to 15 coins for an everyday chore.",
    recurrence: "Repeats",
    recurrences: { UNIQUE: "Just once", QUOTIDIENNE: "Every day", HEBDOMADAIRE: "Every week" },
    create: "Create the quest",
    active: "Active quests",
    none: "No quests yet",
    noneHint: "Create one to get started.",
    meta: (name: string, xp: number) => `${name} · +${xp} XP`,
    statuses: {
      DISPONIBLE: "Available",
      ACCEPTEE: "Accepted",
      EN_COURS: "In progress",
      DECLAREE_TERMINEE: "Done, to check",
      EN_ATTENTE_VALIDATION: "To approve",
      VALIDEE: "Approved",
      A_REFAIRE: "To redo",
      REFUSEE: "Declined",
    },
    archive: "Archive",
    archiveLabel: (title: string) => `Archive the quest "${title}"`,
  },
});

export function QuestsManage() {
  const t = useCopy(COPY);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("MAISON");
  const [coins, setCoins] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("MOYENNE");
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

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setTitle(t.templates[template.key]);
    setCategory(template.category);
    setCoins(template.coins);
    setDifficulty(template.difficulty);
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
        difficulty,
        rewardCoins: coins,
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

  const active = quests.filter((q) => q.active);

  return (
    <div className="stack parent-manage-page">
      <div className="card parent-form-panel">
        <h1 className="parent-form-title"><GameIcon name="quest" size={27}/> {t.title}</h1>
        <p className="text-faint text-sm">{t.intro}</p>
        <div className="row-wrap" style={{ marginBottom: 16 }}>
          {TEMPLATES.map((template) => (
            <button key={template.key} type="button" className="pill pill-sky" style={{ cursor: "pointer", border: "none" }} onClick={() => applyTemplate(template)}>
              {t.templates[template.key]}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="quest-child">{t.child}</label>
              <select id="quest-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quest-category">{t.category}</label>
              <select id="quest-category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {(Object.keys(t.categories) as Category[]).map((k) => (
                  <option key={k} value={k}>
                    {t.categories[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="quest-title">{t.questTitle}</label>
            <input id="quest-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.placeholder} required maxLength={120} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="quest-coins">{t.coins}</label>
              <input id="quest-coins" type="number" inputMode="numeric" min={0} value={coins} onChange={(e) => setCoins(Number(e.target.value))} aria-describedby="quest-coins-hint" />
              <p id="quest-coins-hint" className="field-hint">{t.coinsHint}</p>
            </div>
            <div className="field">
              <label htmlFor="quest-difficulty">{t.difficulty}</label>
              <select id="quest-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} aria-describedby="quest-xp-hint">
                {(Object.keys(XP_BY_DIFFICULTY) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>
                    {t.difficulties[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p id="quest-xp-hint" className="field-hint field-hint--box">
            <GameIcon name="xp" size={16} /> {t.xpHint}
          </p>

          <div className="field">
            <label htmlFor="quest-recurrence">{t.recurrence}</label>
            <select id="quest-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {Object.entries(t.recurrences).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
            {t.create}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
          {t.active}
        </h2>
        {active.length === 0 ? (
          <EmptyState icon="quest" title={t.none} subtitle={t.noneHint} />
        ) : (
          <div className="stack">
            {active.map((q) => (
              <div key={q.id} className="card card--tight card-row">
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{q.title}</p>
                  <p className="text-sm text-faint" style={{ margin: 0 }}>
                    {t.meta(q.child.displayName, q.rewardXp)}
                  </p>
                  <span className={`quest-status-pill quest-status-pill--${q.status.toLowerCase()}`}>{t.statuses[q.status] ?? q.status}</span>
                </div>
                <CoinPill amount={q.rewardCoins}/>
                <button className="btn btn-ghost btn-sm" onClick={() => archive(q.id)} aria-label={t.archiveLabel(q.title)}>
                  {t.archive}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
