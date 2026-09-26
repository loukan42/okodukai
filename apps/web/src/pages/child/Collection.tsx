import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";
import { BoosterOpenOverlay, type RevealedCard } from "../../components/booster/BoosterOpenOverlay";
import boosterImage from "../../assets/cards/card-booster.webp";
import { useAuth } from "../../lib/AuthContext";

interface Universe { id: string; code: string; title: string; description: string | null }
interface UniverseDisplay extends Universe { owned: number; total: number; imageUrl: string | null }
interface BoosterRow { id: string; grantedAt: string; definition: { title: string; universe: { title: string } } }

export function Collection() {
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

  if (loading) return <p className="loading-message" role="status">Ouverture de l'album…</p>;
  if (error) return <div className="empty-state"><strong>L'album ne charge pas.</strong><p>Vérifie ta connexion et réessaie.</p><button className="btn btn-primary" onClick={() => void load()}>Réessayer</button></div>;

  const totalOwned = universes.reduce((sum, u) => sum + u.owned, 0);
  const totalCards = universes.reduce((sum, u) => sum + u.total, 0);

  return <div className="collection-page">
    <header className="collection-header"><div><p className="scene-kicker">Ton album</p><h1>Ma collection</h1><p>Explore tes univers et retrouve les cartes gagnées.</p></div><div className="collection-total"><GameIcon name="collection" size={26}/><strong>{totalOwned} / {totalCards}</strong><span>cartes trouvées</span></div></header>
    <section className="booster-inventory" aria-labelledby="inventory-title"><div className="booster-inventory-heading"><div><p className="scene-kicker">À ouvrir quand tu veux</p><h2 id="inventory-title">Mes boosters <span>{boosters.length}</span></h2></div><GameIcon name="gift" size={28}/></div>
      {boosters.length === 0 ? <div className="booster-inventory-empty"><img src={boosterImage} alt=""/><div><strong>Aucun booster pour le moment</strong><p>Termine une quête et fais-la valider par un parent. Tu recevras un booster à garder ici.</p><Link to="/enfant/quetes" className="btn btn-gold">Voir mes quêtes <GameIcon name="arrow" size={17}/></Link></div></div>
        : <div className="booster-inventory-grid">{boosters.map((booster) => <article className="booster-inventory-item" key={booster.id}><img src={boosterImage} alt=""/><div><small>Booster gagné</small><h3>{booster.definition.universe.title}</h3><p>{booster.definition.title}</p><button className="btn btn-gold" onClick={() => setOpeningBooster(booster)}>Ouvrir ce booster <GameIcon name="arrow" size={17}/></button></div></article>)}</div>}
    </section>
    <section aria-labelledby="albums-title"><div className="section-heading"><h2 id="albums-title">Mes univers</h2></div>
    {universes.length === 0 ? <EmptyState icon="collection" title="Aucun univers activé" subtitle="Demande à un parent d'activer un univers de collection."/> : <div className="collection-universes">{universes.map((universe, index) => <Link key={universe.id} to={`/enfant/collection/${universe.id}`} className="universe-tile">
      {universe.imageUrl ? <img className="universe-tile-art" src={universe.imageUrl} alt="" loading="lazy"/> : <span className="universe-tile-pattern" aria-hidden="true"/>}
      <span className="universe-tile-shade"/><span className="universe-tile-content"><small>Univers {String(index + 1).padStart(2,"0")}</small><strong>{universe.title}</strong><span className="universe-tile-description">{universe.description}</span><span className="universe-tile-progress"><span>{universe.owned} / {universe.total} cartes</span><ProgressBar value={universe.owned} max={universe.total}/></span><span className="universe-tile-link">Ouvrir l'album <GameIcon name="arrow" size={17}/></span></span>
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
