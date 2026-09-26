import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";

interface RewardRow {
  id: string;
  title: string;
  category: "EXPERIENCE" | "OBJET";
  priceCoins: number;
  active: boolean;
}

const TEMPLATES = [
  { title: "Choisir le film", category: "EXPERIENCE" as const, price: 20 },
  { title: "Choisir le dessert", category: "EXPERIENCE" as const, price: 10 },
  { title: "Glace en famille", category: "EXPERIENCE" as const, price: 100 },
  { title: "Soirée jeux de société", category: "EXPERIENCE" as const, price: 30 },
  { title: "Inviter un ami", category: "EXPERIENCE" as const, price: 40 },
  { title: "Petite figurine", category: "OBJET" as const, price: 60 },
];

export function RewardsManage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"EXPERIENCE" | "OBJET">("EXPERIENCE");
  const [price, setPrice] = useState(20);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ rewards: RewardRow[] }>("/rewards");
    setRewards(res.rewards);
  }

  useEffect(() => {
    load();
  }, []);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setTitle(t.title);
    setCategory(t.category);
    setPrice(t.price);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || price < 1) return;
    setCreating(true);
    setError(null);
    try {
      await api.post("/rewards", { title: title.trim(), category, priceCoins: price, allowedChildIds: [] });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "La récompense n'a pas pu être ajoutée. Réessayez.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(reward: RewardRow) {
    setBusyId(reward.id);
    setError(null);
    try {
      await api.patch(`/rewards/${reward.id}`, { active: !reward.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le changement n'a pas été enregistré. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = rewards.filter((reward) => reward.active).length;

  return (
    <div className="stack parent-manage-page rewards-manage-page">
      <header className="parent-page-intro">
        <div className="parent-page-intro-icon"><GameIcon name="gift" size={27}/></div>
        <div>
          <h1>Boutique du foyer</h1>
          <p>Votre enfant échange les pièces gagnées contre les récompenses que vous choisissez. Chaque demande d'achat attend votre validation.</p>
        </div>
      </header>

      <section className="card parent-form-panel reward-create" aria-labelledby="reward-create-title">
        <h2 id="reward-create-title">Ajouter une récompense</h2>
        <p className="text-faint text-sm">Fixez son prix en pièces. Elle apparaîtra dans la boutique de l'enfant.</p>
        <p className="reward-template-label">Quelques idées pour commencer</p>
        <div className="reward-templates">
          {TEMPLATES.map((t) => (
            <button key={t.title} type="button" className="reward-template" onClick={() => applyTemplate(t)}>
              {t.title}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reward-title">Titre</label>
            <input id="reward-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Choisir le film" required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="reward-category">Catégorie</label>
              <select id="reward-category" value={category} onChange={(e) => setCategory(e.target.value as "EXPERIENCE" | "OBJET")}>
                <option value="EXPERIENCE">Expérience</option>
                <option value="OBJET">Objet</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reward-price">Prix en pièces</label>
              <input id="reward-price" type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={creating || !title.trim() || price < 1}>
            {creating ? "Ajout en cours…" : "Ajouter à la boutique"}
          </button>
        </form>
      </section>

      <section className="reward-catalog" aria-labelledby="reward-catalog-title">
        <div className="reward-catalog-intro">
          <div>
            <h2 id="reward-catalog-title">Récompenses créées</h2>
            <p>{activeCount} visible{activeCount > 1 ? "s" : ""} dans la boutique · {rewards.length} au total</p>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {rewards.length === 0 ? (
          <EmptyState icon="gift" title="Boutique vide" subtitle="Ajoutez une première récompense." />
        ) : (
          <div className="reward-admin-list">
            <div className="reward-admin-columns" aria-hidden="true"><span>Récompense</span><span>Prix</span><span>Disponibilité</span></div>
            {rewards.map((reward) => (
              <article key={reward.id} className={`reward-admin-row${reward.active ? "" : " reward-admin-row--inactive"}`}>
                <div className="reward-admin-main">
                  <h3>{reward.title}</h3>
                  <span>{reward.category === "EXPERIENCE" ? "Expérience" : "Objet"} · {reward.active ? "Visible par l'enfant" : "Masquée de la boutique"}</span>
                </div>
                <div className="reward-admin-price"><span>Prix</span><CoinPill amount={reward.priceCoins}/></div>
                <button type="button" className={`btn btn-sm ${reward.active ? "btn-ghost" : "btn-primary"}`} disabled={busyId === reward.id} onClick={() => void toggleActive(reward)}>
                  {busyId === reward.id ? "Un instant…" : reward.active ? "Désactiver" : "Réactiver"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
