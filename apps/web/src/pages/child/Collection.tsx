import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";
import { BoosterOpenOverlay, type RevealedCard } from "../../components/booster/BoosterOpenOverlay";
import { BoosterPack } from "../../components/booster/BoosterPack";
import { useAuth } from "../../lib/AuthContext";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    loading: "Ouverture de l'album…",
    failed: "L'album ne charge pas.",
    failedHint: "Vérifie ta connexion et réessaie.",
    retry: "Réessayer",
    kicker: "Ton album",
    title: "Ma collection",
    lead: "Retrouve ici les cartes que tu as gagnées.",
    found: "cartes trouvées",
    toOpen: "À ouvrir quand tu veux",
    boosters: "Mes boosters",
    none: "Aucun booster pour le moment",
    noneHint: "Termine une quête et fais-la valider par un parent. Tu recevras un booster à garder ici. Chaque nouveau niveau t'en offre un aussi.",
    seeQuests: "Voir mes quêtes",
    openNamed: (u: string) => `Ouvrir le booster ${u}`,
    waiting: (n: number) => (n === 1 ? "Un booster t'attend." : `${n} boosters t'attendent.`),
    next: (u: string) => `Le prochain vient de l'univers ${u}.`,
    open: "Ouvrir un booster",
    chooseWorld: "Choisir un univers",
    worlds: "Mes univers",
    noWorld: "Aucun univers activé",
    noWorldHint: "Demande à un parent d'activer un univers de collection.",
    world: (n: number) => `Univers ${String(n).padStart(2, "0")}`,
    cards: (a: number, b: number) => `${a} / ${b} cartes`,
    openAlbum: "Ouvrir l'album",
  },
  en: {
    loading: "Opening the album…",
    failed: "The album won't load.",
    failedHint: "Check your connection and try again.",
    retry: "Try again",
    kicker: "Your album",
    title: "My collection",
    lead: "Here are all the cards you've won.",
    found: "cards found",
    toOpen: "Open them whenever you like",
    boosters: "My boosters",
    none: "No boosters right now",
    noneHint: "Finish a quest and get a parent to approve it. You'll get a booster to keep here. Every new level gives you one too.",
    seeQuests: "See my quests",
    openNamed: (u: string) => `Open the ${u} booster`,
    waiting: (n: number) => (n === 1 ? "A booster is waiting for you." : `${n} boosters are waiting for you.`),
    next: (u: string) => `The next one comes from the ${u} world.`,
    open: "Open a booster",
    chooseWorld: "Choose a world",
    worlds: "My worlds",
    noWorld: "No world turned on",
    noWorldHint: "Ask a parent to turn on a card world.",
    world: (n: number) => `World ${String(n).padStart(2, "0")}`,
    cards: (a: number, b: number) => `${a} / ${b} cards`,
    openAlbum: "Open the album",
  },
});

interface Universe { id: string; code: string; title: string; description: string | null }
interface UniverseDisplay extends Universe { owned: number; total: number; imageUrl: string | null }
interface BoosterRow { id: string; grantedAt: string; definition: { title: string; universe: { title: string } } }

export function Collection() {
  const t = useCopy(COPY);
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [universes, setUniverses] = useState<UniverseDisplay[]>([]);
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [openingBooster, setOpeningBooster] = useState<BoosterRow | null>(null);
  // Boosters ouverts à la suite sans fermer l'écran (la liste est rechargée à la fermeture).
  const [openedIds, setOpenedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [res, inventory] = await Promise.all([
        api.get<{ universes: Universe[] }>("/child/universes"),
        api.get<{ boosters: BoosterRow[] }>("/child/boosters"),
      ]);
      const displays = await Promise.all(res.universes.map(async (universe) => {
        const detail = await api.get<{ completion: { owned: number; total: number }; cards: { owned: boolean; artworkUrl: string | null }[] }>(`/child/collection/${universe.id}`);
        return { ...universe, ...detail.completion, imageUrl: detail.cards.find((card) => card.owned && card.artworkUrl)?.artworkUrl ?? detail.cards.find((card) => card.artworkUrl)?.artworkUrl ?? null };
      }));
      setUniverses(displays);
      setBoosters(inventory.boosters);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (childId) { setLoading(true); void load(); } }, [childId]);

  if (loading) return <p className="loading-message" role="status">{t.loading}</p>;
  if (error) return <div className="empty-state"><strong>{t.failed}</strong><p>{t.failedHint}</p><button className="btn btn-primary" onClick={() => void load()}>{t.retry}</button></div>;

  const universeGroups = [...boosters.reduce((groups, booster) => {
    const title = booster.definition.universe.title;
    groups.set(title, [...(groups.get(title) ?? []), booster]);
    return groups;
  }, new Map<string, BoosterRow[]>())];
  const totalOwned = universes.reduce((sum, u) => sum + u.owned, 0);
  const totalCards = universes.reduce((sum, u) => sum + u.total, 0);

  return <div className="collection-page">
    <header className="collection-header"><div><p className="scene-kicker">{t.kicker}</p><h1>{t.title}</h1><p>{t.lead}</p></div><div className="collection-total"><GameIcon name="collection" size={26}/><strong>{totalOwned} / {totalCards}</strong><span>{t.found}</span></div></header>
    <section className="booster-inventory" aria-labelledby="inventory-title"><div className="booster-inventory-heading"><div><p className="scene-kicker">{t.toOpen}</p><h2 id="inventory-title">{t.boosters} <span>{boosters.length}</span></h2></div><GameIcon name="gift" size={28}/></div>
      {boosters.length === 0 ? <div className="booster-inventory-empty"><BoosterPack className="booster-pack--resting"/><div><strong>{t.none}</strong><p>{t.noneHint}</p><Link to="/enfant/quetes" className="btn btn-gold">{t.seeQuests} <GameIcon name="arrow" size={17}/></Link></div></div>
        : <div className="booster-altar">
          <button type="button" className="booster-stack" onClick={() => setOpeningBooster(boosters[0])} aria-label={t.openNamed(boosters[0].definition.universe.title)}>
            <span className="booster-stack-glow" aria-hidden="true"/>
            {boosters.slice(0, 3).reverse().map((booster, i, shown) => <BoosterPack key={booster.id} universe={booster.definition.universe.title} className={`booster-stack-pack booster-stack-pack--${shown.length - 1 - i}`}/>)}
          </button>
          <div className="booster-altar-copy">
            <strong>{t.waiting(boosters.length)}</strong>
            <p>{t.next(boosters[0].definition.universe.title)}</p>
            <button type="button" className="btn btn-gold booster-open-cta" onClick={() => setOpeningBooster(boosters[0])}>{t.open} <GameIcon name="arrow" size={17}/></button>
            {universeGroups.length > 1 && <div className="booster-chips" role="group" aria-label={t.chooseWorld}>{universeGroups.map(([title, rows]) => <button type="button" key={title} className="booster-chip" onClick={() => setOpeningBooster(rows[0])}>{title}<span>×{rows.length}</span></button>)}</div>}
          </div>
        </div>}
    </section>
    <section aria-labelledby="albums-title"><div className="section-heading"><h2 id="albums-title">{t.worlds}</h2></div>
    {universes.length === 0 ? <EmptyState art="hourglass" title={t.noWorld} subtitle={t.noWorldHint}/> : <div className="collection-universes">{universes.map((universe, index) => <Link key={universe.id} to={`/enfant/collection/${universe.id}`} className="universe-tile">
      {universe.imageUrl ? <img className="universe-tile-art" src={universe.imageUrl} alt="" loading="lazy"/> : <span className="universe-tile-pattern" aria-hidden="true"/>}
      <span className="universe-tile-shade"/><span className="universe-tile-content"><small>{t.world(index + 1)}</small><strong>{universe.title}</strong><span className="universe-tile-description">{universe.description}</span><span className="universe-tile-progress"><span>{t.cards(universe.owned, universe.total)}</span><ProgressBar value={universe.owned} max={universe.total}/></span><span className="universe-tile-link">{t.openAlbum} <GameIcon name="arrow" size={17}/></span></span>
    </Link>)}</div>}</section>
    <BoosterOpenOverlay
      key={openingBooster?.id ?? "ferme"}
      open={openingBooster !== null}
      universeTitle={openingBooster?.definition.universe.title}
      remaining={boosters.filter((b) => b.id !== openingBooster?.id && !openedIds.includes(b.id)).length}
      onOpen={async () => {
        const id = openingBooster!.id;
        const res = await api.post<{ cards: RevealedCard[] }>(`/child/boosters/${id}/open`);
        setOpenedIds((ids) => [...ids, id]);
        return res.cards;
      }}
      onOpenNext={() => setOpeningBooster(boosters.find((b) => b.id !== openingBooster?.id && !openedIds.includes(b.id)) ?? null)}
      onClose={() => { setOpeningBooster(null); setOpenedIds([]); void load(); }}
    />
  </div>;
}
