import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
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
    if (!title) return;
    setCreating(true);
    try {
      await api.post("/rewards", { title, category, priceCoins: price, allowedChildIds: [] });
      setTitle("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(reward: RewardRow) {
    await api.patch(`/rewards/${reward.id}`, { active: !reward.active });
    load();
  }

  return (
    <div className="stack parent-manage-page">
      <div className="card parent-form-panel">
        <h1 className="parent-form-title"><GameIcon name="gift" size={27}/> Nouvelle récompense</h1>
        <p className="text-faint text-sm">Choisissez une récompense que votre famille pourra valider.</p>
        <div className="row-wrap" style={{ marginBottom: 16 }}>
          {TEMPLATES.map((t) => (
            <button key={t.title} type="button" className="pill pill-sky" style={{ cursor: "pointer", border: "none" }} onClick={() => applyTemplate(t)}>
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
                <label htmlFor="reward-price">Prix (pièces)</label>
                <input id="reward-price" type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
            Ajouter à la boutique
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>
          Boutique du foyer
        </h2>
        {rewards.length === 0 ? (
          <EmptyState icon="gift" title="Boutique vide" subtitle="Ajoutez une première récompense." />
        ) : (
          <div className="stack">
            {rewards.map((r) => (
              <div key={r.id} className="card card--tight card-row">
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{r.title}</p>
                  <p className="text-sm text-faint" style={{ margin: 0 }}>
                    {r.category === "EXPERIENCE" ? "Expérience" : "Objet"}
                  </p>
                </div>
                <CoinPill amount={r.priceCoins}/>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(r)}>
                  {r.active ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
