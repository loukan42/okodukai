import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { type MoneyOverview } from "../../lib/money";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { Avatar } from "../../components/Avatar";
import { CoinArt } from "../../art/CoinArt";
import { BoosterPack } from "../../components/booster/BoosterPack";

interface QuestRow { id: string; title: string; status: string; rewardCoins: number; rewardXp: number }
interface Level { level: number; xpIntoLevel: number; xpForNextLevel: number }

const places: { key: string; to: string; title: string; icon: GameIconName; description: string }[] = [
  { key: "quests", to: "/enfant/quetes", title: "Quêtes", icon: "quest", description: "Choisir une mission" },
  { key: "vault", to: "/enfant/argent/coffre", title: "Mon coffre", icon: "vault", description: "Garder des pièces" },
  { key: "shop", to: "/enfant/boutique", title: "Boutique", icon: "shop", description: "Voir les récompenses" },
  { key: "collection", to: "/enfant/collection", title: "Collection", icon: "collection", description: "Ouvrir mon album" },
  { key: "observatory", to: "/enfant/argent/investir", title: "Observatoire", icon: "xp", description: "Explorer le temps" },
  { key: "library", to: "/enfant/apprendre", title: "Bibliothèque", icon: "learn", description: "Apprendre" },
];

/** Les destinations du village restent de vrais liens HTML, accessibles au clavier. */
export function Home() {
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [money, setMoney] = useState<MoneyOverview | null>(null);
  const [level, setLevel] = useState<Level>({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [boosterCount, setBoosterCount] = useState(0);
  const [statementReady, setStatementReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [moneyRes, me, questsRes, boostersRes] = await Promise.all([
        api.get<MoneyOverview>("/child/money"), api.get<{ level: Level }>("/child/me"),
        api.get<{ quests: QuestRow[] }>("/child/quests"), api.get<{ boosters: { id: string }[] }>("/child/boosters"),
      ]);
      setMoney(moneyRes); setLevel(me.level);
      setQuests(questsRes.quests.filter((q) => ["DISPONIBLE", "ACCEPTEE", "A_REFAIRE"].includes(q.status)));
      setBoosterCount(boostersRes.boosters.length); setError(false);
      api.get<{ run: { unseen: number } | null }>("/child/invest")
        .then((res) => setStatementReady((res.run?.unseen ?? 0) > 0)).catch(() => setStatementReady(false));
    } catch { setError(true); } finally { setLoading(false); }
  }

  useEffect(() => { if (childId) { setLoading(true); void load(); } }, [childId]);
  if (session?.kind !== "child") return null;
  if (loading) return <div className="village-loading" role="status"><CoinArt size={80}/><p>Le village se prépare…</p></div>;
  if (error || !money) return <div className="empty-state"><strong>Le village ne s'ouvre pas.</strong><button className="btn btn-primary" onClick={() => void load()}>Réessayer</button></div>;

  const goal = money.goals[0];
  const activeQuest = quests.find((q) => q.status === "ACCEPTEE") ?? quests[0];
  const tier = level.level >= 30 ? 30 : level.level >= 20 ? 20 : level.level >= 10 ? 10 : level.level >= 5 ? 5 : 1;
  return <main className="village-home" data-world-tier={tier}>
    <div className="village-hud" aria-label="Ma progression">
      <Link className="village-hud-profile" to="/enfant/profil" aria-label={`Profil de ${session.child.displayName}, niveau ${level.level}`}><Avatar avatarId={session.child.avatarId}/><span><small>Bienvenue dans ton monde</small><strong>{session.child.displayName}</strong></span><span className="village-level">Niv. {level.level}</span></Link>
      <div className="village-hud-xp"><span>Expérience</span><ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel}/><small>{level.xpIntoLevel} / {level.xpForNextLevel} XP</small></div>
      <Link className="village-hud-coins" to="/enfant/argent" aria-label={`Mon compte, ${money.balances.available} pièces`}><CoinArt size={49}/><span><small>Mon compte</small><strong>{money.balances.available} <em>pièces</em></strong></span></Link>
    </div>
    <section className="village-section" aria-labelledby="village-title">
      <div className="village-heading"><h1 id="village-title">La Vallée d'Okodukai</h1><p>Choisis un lieu et poursuis ton aventure.</p></div>
      <nav className="village-stage" aria-label="Explorer la vallée">
        <picture className="village-landscape" aria-hidden="true"><source media="(max-width: 640px)" srcSet="/assets/backgrounds/child-hub-tall-720.webp 720w, /assets/backgrounds/child-hub-tall-1080.webp 1080w" sizes="100vw"/><img src="/assets/backgrounds/child-hub-wide-1280.webp" srcSet="/assets/backgrounds/child-hub-wide-1280.webp 1280w, /assets/backgrounds/child-hub-wide-1920.webp 1920w" sizes="(max-width: 1180px) 100vw, 1180px" alt="" fetchPriority="high" /></picture>
        <span className="village-light" aria-hidden="true" />
        {places.map((place) => <Link key={place.key} className={`village-place village-place--${place.key}`} to={place.to} aria-label={`${place.title} : ${place.description}`}><span className="village-place-icon"><GameIcon name={place.icon} size={21}/></span><span className="village-place-label">{place.title}</span>{place.key === "observatory" && statementReady && <span className="village-place-alert">Bilan prêt</span>}</Link>)}
        <Link to="/enfant/profil" className="village-character" aria-label="Voir mon personnage"><Avatar avatarId={session.child.avatarId} size="lg"/><span>Mon personnage</span></Link>
      </nav>
    </section>
    <div className="village-dispatch" aria-label="En ce moment dans ton village">
      <Link to="/enfant/quetes" className="village-dispatch-quest"><span className="village-dispatch-icon"><GameIcon name="quest" size={27}/></span><span><small>Sur le tableau des quêtes</small><strong>{activeQuest ? activeQuest.title : "Une nouvelle quête t'attend bientôt"}</strong><span>{activeQuest ? `À gagner après validation : ${activeQuest.rewardCoins} pièces et ${activeQuest.rewardXp} XP` : "Demande à un parent de t'en proposer une."}</span></span><GameIcon name="arrow" size={20}/></Link>
      <Link to={boosterCount ? "/enfant/collection" : goal ? "/enfant/argent/coffre" : "/enfant/collection"} className="village-dispatch-find"><BoosterPack className="village-dispatch-pack"/><span><small>{boosterCount ? "Dans ta galerie" : goal ? "Sur le chemin du coffre" : "Dans ta galerie"}</small><strong>{boosterCount ? `${boosterCount} booster${boosterCount > 1 ? "s" : ""} à ouvrir` : goal ? goal.title : "Découvre tes cartes"}</strong><span>{boosterCount ? "Ouvrir un booster" : goal ? `${goal.present} / ${goal.targetCoins} pièces de côté` : "Voir la collection"}</span></span></Link>
    </div>
  </main>;
}
