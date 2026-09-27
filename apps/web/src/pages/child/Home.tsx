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
import { ChildCharacter } from "../../components/ChildCharacter";
import { ExperienceTree } from "../../components/ExperienceTree";
import { defineCopy, useCopy } from "../../i18n";
import { EMPTY_LEVEL, XP_COPY, levelTitle, type LevelView } from "../../lib/levels";

interface QuestRow { id: string; title: string; status: string; rewardCoins: number; rewardXp: number }

const places: { key: "quests" | "vault" | "shop" | "collection" | "observatory" | "library"; to: string; icon: GameIconName }[] = [
  { key: "quests", to: "/enfant/quetes", icon: "quest" },
  { key: "vault", to: "/enfant/argent/coffre", icon: "vault" },
  { key: "shop", to: "/enfant/boutique", icon: "shop" },
  { key: "collection", to: "/enfant/collection", icon: "collection" },
  { key: "observatory", to: "/enfant/argent/investir", icon: "xp" },
  { key: "library", to: "/enfant/apprendre", icon: "learn" },
];

const copy = defineCopy({
  fr: {
    welcome: "Bienvenue dans ton monde", experience: "Expérience", tree: "Mon arbre", account: "Mon compte", coins: "pièces", level: "Niv.",
    village: "La Vallée d'Okodukai", choose: "Choisis un lieu et poursuis ton aventure.", explore: "Explorer la vallée", character: "Mon personnage", seeCharacter: "Voir mon personnage", progress: "Ma progression", happening: "En ce moment dans ton village", statement: "Bilan prêt",
    loading: "Le village se prépare…", failed: "Le village ne s'ouvre pas.", retry: "Réessayer",
    questBoard: "Sur le tableau des quêtes", questSoon: "Une nouvelle quête t'attend bientôt", askParent: "Demande à un parent de t'en proposer une.", afterApproval: (coins: number, xp: number) => `À gagner après validation : ${coins} pièces et ${xp} XP`,
    gallery: "Dans ta galerie", vaultPath: "Sur le chemin du coffre", boosterCount: (count: number) => `${count} booster${count > 1 ? "s" : ""} à ouvrir`, openBooster: "Ouvrir un booster", discoverCards: "Découvre tes cartes", saved: (current: number, target: number) => `${current} / ${target} pièces de côté`, seeCollection: "Voir la collection",
    place: { quests: ["Quêtes", "Choisir une mission"], vault: ["Mon coffre", "Garder des pièces"], shop: ["Boutique", "Voir les récompenses"], collection: ["Collection", "Ouvrir mon album"], observatory: ["Observatoire", "Explorer le temps"], library: ["Bibliothèque", "Apprendre"] },
    profileAria: (name: string, level: number) => `Profil de ${name}, niveau ${level}`, accountAria: (count: number) => `Mon compte, ${count} pièces`,
  },
  en: {
    welcome: "Welcome to your world", experience: "Experience", tree: "My tree", account: "My account", coins: "coins", level: "Lvl.",
    village: "Okodukai Valley", choose: "Choose a place and continue your adventure.", explore: "Explore the valley", character: "My character", seeCharacter: "See my character", progress: "My progress", happening: "Around your village", statement: "Report ready",
    loading: "Getting the village ready…", failed: "The village couldn't open.", retry: "Try again",
    questBoard: "On the quest board", questSoon: "A new quest will be here soon", askParent: "Ask a parent to add one for you.", afterApproval: (coins: number, xp: number) => `Earn after approval: ${coins} coins and ${xp} XP`,
    gallery: "In your gallery", vaultPath: "On the path to your vault", boosterCount: (count: number) => `${count} booster${count > 1 ? "s" : ""} to open`, openBooster: "Open a booster", discoverCards: "Discover your cards", saved: (current: number, target: number) => `${current} / ${target} coins saved`, seeCollection: "See the collection",
    place: { quests: ["Quests", "Choose a mission"], vault: ["My vault", "Save coins"], shop: ["Shop", "See rewards"], collection: ["Collection", "Open my album"], observatory: ["Observatory", "Explore time"], library: ["Library", "Learn"] },
    profileAria: (name: string, level: number) => `${name}'s profile, level ${level}`, accountAria: (count: number) => `My account, ${count} coins`,
  },
});

/** Les destinations du village restent de vrais liens HTML, accessibles au clavier. */
export function Home() {
  const t = useCopy(copy);
  const xpCopy = useCopy(XP_COPY);
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [money, setMoney] = useState<MoneyOverview | null>(null);
  const [level, setLevel] = useState<LevelView>(EMPTY_LEVEL);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [boosterCount, setBoosterCount] = useState(0);
  const [statementReady, setStatementReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [moneyRes, me, questsRes, boostersRes] = await Promise.all([
        api.get<MoneyOverview>("/child/money"), api.get<{ level: LevelView }>("/child/me"),
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
  if (loading) return <div className="village-loading" role="status"><CoinArt size={80}/><p>{t.loading}</p></div>;
  if (error || !money) return <div className="empty-state"><strong>{t.failed}</strong><button className="btn btn-primary" onClick={() => void load()}>{t.retry}</button></div>;

  const goal = money.goals[0];
  const activeQuest = quests.find((q) => q.status === "ACCEPTEE") ?? quests[0];
  const tier = level.level >= 30 ? 30 : level.level >= 20 ? 20 : level.level >= 10 ? 10 : level.level >= 5 ? 5 : 1;
  return <main className="village-home" data-world-tier={tier}>
    <div className="village-hud" aria-label={t.progress}>
      <Link className="village-hud-profile" to="/enfant/profil" aria-label={t.profileAria(session.child.displayName, level.level)}><Avatar avatarId={session.child.avatarId}/><span><small>{t.welcome}</small><strong>{session.child.displayName}</strong></span><span className="village-level">{t.level} {level.level}</span></Link>
      <Link className="village-hud-xp" to="/enfant/profil#xp" aria-label={`${t.tree}. ${levelTitle(level) || t.experience}. ${level.xpForNextLevel ? xpCopy.xpLeft(level.xpForNextLevel - level.xpIntoLevel, level.level + 1) : xpCopy.maxed} ${xpCopy.whatTitle}`}><ExperienceTree level={level} childId={session.child.id} compact /><span>{t.tree}</span><ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel || 1}/><small>{level.xpIntoLevel} / {level.xpForNextLevel} XP{level.xpForNextLevel > 0 && <> · {xpCopy.hudNext(level.xpForNextLevel - level.xpIntoLevel)}</>}</small></Link>
      <Link className="village-hud-coins" to="/enfant/argent" aria-label={t.accountAria(money.balances.available)}><CoinArt size={49}/><span><small>{t.account}</small><strong>{money.balances.available} <em>{t.coins}</em></strong></span></Link>
    </div>
    <section className="village-section" aria-labelledby="village-title">
      <div className="village-heading"><h1 id="village-title">{t.village}</h1><p>{t.choose}</p></div>
      <nav className="village-stage" aria-label={t.explore}>
        <picture className="village-landscape" aria-hidden="true"><source media="(max-width: 640px)" srcSet="/assets/backgrounds/child-hub-tall-720.webp 720w, /assets/backgrounds/child-hub-tall-1080.webp 1080w" sizes="100vw"/><img src="/assets/backgrounds/child-hub-wide-1280.webp" srcSet="/assets/backgrounds/child-hub-wide-1280.webp 1280w, /assets/backgrounds/child-hub-wide-1920.webp 1920w" sizes="(max-width: 1180px) 100vw, 1180px" alt="" fetchPriority="high" /></picture>
        <span className="village-light" aria-hidden="true" />
        {places.map((place) => <Link key={place.key} className={`village-place village-place--${place.key}`} to={place.to} aria-label={`${t.place[place.key][0]} : ${t.place[place.key][1]}`}><span className="village-place-icon"><GameIcon name={place.icon} size={21}/></span><span className="village-place-label">{t.place[place.key][0]}</span>{place.key === "observatory" && statementReady && <span className="village-place-alert">{t.statement}</span>}</Link>)}
        <Link to="/enfant/profil" className="village-character" aria-label={t.seeCharacter}><ChildCharacter avatarId={session.child.avatarId} className="village-character-art"/><span>{t.character}</span></Link>
      </nav>
    </section>
    <div className="village-dispatch" aria-label={t.happening}>
      <Link to="/enfant/quetes" className="village-dispatch-quest"><span className="village-dispatch-icon"><GameIcon name="quest" size={27}/></span><span><small>{t.questBoard}</small><strong>{activeQuest ? activeQuest.title : t.questSoon}</strong><span>{activeQuest ? t.afterApproval(activeQuest.rewardCoins, activeQuest.rewardXp) : t.askParent}</span></span><GameIcon name="arrow" size={20}/></Link>
      <Link to={boosterCount ? "/enfant/collection" : goal ? "/enfant/argent/coffre" : "/enfant/collection"} className="village-dispatch-find"><BoosterPack className="village-dispatch-pack"/><span><small>{boosterCount ? t.gallery : goal ? t.vaultPath : t.gallery}</small><strong>{boosterCount ? t.boosterCount(boosterCount) : goal ? goal.title : t.discoverCards}</strong><span>{boosterCount ? t.openBooster : goal ? t.saved(goal.present, goal.targetCoins) : t.seeCollection}</span></span></Link>
    </div>
  </main>;
}
