import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";
import { defineCopy, useCopy } from "../../i18n";

interface RewardRow {
  id: string;
  title: string;
  category: "EXPERIENCE" | "OBJET";
  priceCoins: number;
  active: boolean;
}

const TEMPLATES = [
  { key: "film", category: "EXPERIENCE" as const, price: 20 },
  { key: "dessert", category: "EXPERIENCE" as const, price: 10 },
  { key: "icecream", category: "EXPERIENCE" as const, price: 100 },
  { key: "games", category: "EXPERIENCE" as const, price: 30 },
  { key: "friend", category: "EXPERIENCE" as const, price: 40 },
  { key: "figurine", category: "OBJET" as const, price: 60 },
];

const COPY = defineCopy({
  fr: {
    templates: {
      film: "Choisir le film",
      dessert: "Choisir le dessert",
      icecream: "Glace en famille",
      games: "Soirée jeux de société",
      friend: "Inviter un ami",
      figurine: "Petite figurine",
    } as Record<string, string>,
    addError: "La récompense n'a pas pu être ajoutée. Réessayez.",
    toggleError: "Le changement n'a pas été enregistré. Réessayez.",
    title: "Boutique du foyer",
    intro: "Votre enfant échange les pièces gagnées contre les récompenses que vous choisissez. Chaque demande d'achat attend votre validation.",
    add: "Ajouter une récompense",
    addHint: "Fixez son prix en pièces. Elle apparaîtra dans la boutique de l'enfant.",
    ideas: "Quelques idées pour commencer",
    field: "Titre",
    category: "Catégorie",
    experience: "Expérience",
    object: "Objet",
    price: "Prix en pièces",
    priceHint: "Repère : une quête du quotidien rapporte 5 à 15 pièces.",
    priceWeeks: (weeks: number) =>
      weeks < 0.7
        ? "Moins d'une semaine des gains du foyer (quêtes et argent de poche des 4 dernières semaines)."
        : weeks <= 1.4
          ? "Environ 1 semaine des gains du foyer (quêtes et argent de poche des 4 dernières semaines)."
          : `Environ ${Math.round(weeks)} semaines des gains du foyer (quêtes et argent de poche des 4 dernières semaines).`,
    adding: "Ajout en cours…",
    submit: "Ajouter à la boutique",
    created: "Récompenses créées",
    counts: (active: number, total: number) => `${active} visible${active > 1 ? "s" : ""} dans la boutique · ${total} au total`,
    empty: "Boutique vide",
    emptyHint: "Ajoutez une première récompense.",
    colReward: "Récompense",
    colPrice: "Prix",
    colAvailability: "Disponibilité",
    visible: "Visible par l'enfant",
    hidden: "Masquée de la boutique",
    priceLabel: "Prix",
    busy: "Un instant…",
    disable: "Désactiver",
    enable: "Réactiver",
  },
  en: {
    templates: {
      film: "Pick the film",
      dessert: "Pick dessert",
      icecream: "Family ice cream",
      games: "Board game night",
      friend: "Have a friend over",
      figurine: "Small figurine",
    },
    addError: "The reward couldn't be added. Please try again.",
    toggleError: "The change wasn't saved. Please try again.",
    title: "Family shop",
    intro: "Your child swaps earned coins for rewards you choose. Every purchase request waits for your approval.",
    add: "Add a reward",
    addHint: "Set a price in coins. It will show up in your child's shop.",
    ideas: "A few ideas to start with",
    field: "Title",
    category: "Category",
    experience: "Experience",
    object: "Item",
    price: "Price in coins",
    priceHint: "As a guide, an everyday quest pays 5 to 15 coins.",
    priceWeeks: (weeks: number) =>
      weeks < 0.7
        ? "Less than a week of the household's earnings (quests and pocket money over the last 4 weeks)."
        : weeks <= 1.4
          ? "About 1 week of the household's earnings (quests and pocket money over the last 4 weeks)."
          : `About ${Math.round(weeks)} weeks of the household's earnings (quests and pocket money over the last 4 weeks).`,
    adding: "Adding…",
    submit: "Add to the shop",
    created: "Your rewards",
    counts: (active: number, total: number) => `${active} visible in the shop · ${total} in total`,
    empty: "The shop is empty",
    emptyHint: "Add a first reward.",
    colReward: "Reward",
    colPrice: "Price",
    colAvailability: "Availability",
    visible: "Visible to your child",
    hidden: "Hidden from the shop",
    priceLabel: "Price",
    busy: "One moment…",
    disable: "Hide",
    enable: "Show again",
  },
});

export function RewardsManage() {
  const t = useCopy(COPY);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"EXPERIENCE" | "OBJET">("EXPERIENCE");
  const [price, setPrice] = useState(20);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);

  async function load() {
    const res = await api.get<{ rewards: RewardRow[] }>("/rewards");
    setRewards(res.rewards);
  }

  useEffect(() => {
    load();
    api
      .get<{ weeklyAverage: number }>("/household/earnings-reference")
      .then((r) => setWeeklyAverage(r.weeklyAverage))
      .catch(() => setWeeklyAverage(null));
  }, []);

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setTitle(t.templates[template.key]);
    setCategory(template.category);
    setPrice(template.price);
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
      setError(err instanceof ApiError ? err.message : t.addError);
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
      setError(err instanceof ApiError ? err.message : t.toggleError);
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
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </header>

      <section className="card parent-form-panel reward-create" aria-labelledby="reward-create-title">
        <h2 id="reward-create-title">{t.add}</h2>
        <p className="text-faint text-sm">{t.addHint}</p>
        <p className="reward-template-label">{t.ideas}</p>
        <div className="reward-templates">
          {TEMPLATES.map((template) => (
            <button key={template.key} type="button" className="reward-template" onClick={() => applyTemplate(template)}>
              {t.templates[template.key]}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reward-title">{t.field}</label>
            <input id="reward-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.templates.film} maxLength={120} required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="reward-category">{t.category}</label>
              <select id="reward-category" value={category} onChange={(e) => setCategory(e.target.value as "EXPERIENCE" | "OBJET")}>
                <option value="EXPERIENCE">{t.experience}</option>
                <option value="OBJET">{t.object}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reward-price">{t.price}</label>
              <input id="reward-price" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-describedby="reward-price-hint" />
              <p id="reward-price-hint" className="field-hint">{t.priceHint}</p>
              {weeklyAverage !== null && weeklyAverage > 0 && <p className="field-hint">{t.priceWeeks(price / weeklyAverage)}</p>}
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={creating || !title.trim() || price < 1}>
            {creating ? t.adding : t.submit}
          </button>
        </form>
      </section>

      <section className="reward-catalog" aria-labelledby="reward-catalog-title">
        <div className="reward-catalog-intro">
          <div>
            <h2 id="reward-catalog-title">{t.created}</h2>
            <p>{t.counts(activeCount, rewards.length)}</p>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {rewards.length === 0 ? (
          <EmptyState icon="gift" title={t.empty} subtitle={t.emptyHint} />
        ) : (
          <div className="reward-admin-list">
            <div className="reward-admin-columns" aria-hidden="true"><span>{t.colReward}</span><span>{t.colPrice}</span><span>{t.colAvailability}</span></div>
            {rewards.map((reward) => (
              <article key={reward.id} className={`reward-admin-row${reward.active ? "" : " reward-admin-row--inactive"}`}>
                <div className="reward-admin-main">
                  <h3>{reward.title}</h3>
                  <span>{reward.category === "EXPERIENCE" ? t.experience : t.object} · {reward.active ? t.visible : t.hidden}</span>
                </div>
                <div className="reward-admin-price"><span>{t.priceLabel}</span><CoinPill amount={reward.priceCoins}/></div>
                <button type="button" className={`btn btn-sm ${reward.active ? "btn-ghost" : "btn-primary"}`} disabled={busyId === reward.id} onClick={() => void toggleActive(reward)}>
                  {busyId === reward.id ? t.busy : reward.active ? t.disable : t.enable}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
