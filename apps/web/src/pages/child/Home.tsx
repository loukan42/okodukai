import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { chestStateFor, pieces, type MoneyOverview } from "../../lib/money";
import { CoinPill } from "../../components/CoinPill";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";
import { Avatar } from "../../components/Avatar";
import { CoinArt } from "../../art/CoinArt";
import { ChestArt } from "../../art/ChestArt";
import { ObjectArt } from "../../art/ObjectArt";
import boosterImage from "../../assets/cards/card-booster.webp";

interface QuestRow { id: string; title: string; status: string; rewardCoins: number; rewardXp: number }
interface BoosterRow { id: string; definition: { title: string; universe: { title: string } } }
interface Level { level: number; xpIntoLevel: number; xpForNextLevel: number }

/** Accueil enfant : le monde en bandeau, l'argent d'abord, puis les quêtes et les boosters. */
export function Home() {
  const { session } = useAuth();
  const childId = session?.kind === "child" ? session.child.id : null;
  const [money, setMoney] = useState<MoneyOverview | null>(null);
  const [level, setLevel] = useState<Level>({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [statementReady, setStatementReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [moneyRes, me, questsRes, boostersRes] = await Promise.all([
        api.get<MoneyOverview>("/child/money"),
        api.get<{ level: Level }>("/child/me"),
        api.get<{ quests: QuestRow[] }>("/child/quests"),
        api.get<{ boosters: BoosterRow[] }>("/child/boosters"),
      ]);
      setMoney(moneyRes);
      setLevel(me.level);
      setQuests(questsRes.quests.filter((q) => ["DISPONIBLE", "ACCEPTEE", "A_REFAIRE"].includes(q.status)));
      setBoosters(boostersRes.boosters);
      setError(false);
      // Pastille « Ton bilan est prêt » : facultative, jamais bloquante.
      api
        .get<{ run: { unseen: number } | null }>("/child/invest")
        .then((res) => setStatementReady((res.run?.unseen ?? 0) > 0))
        .catch(() => setStatementReady(false));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (childId) {
      setLoading(true);
      void load();
    }
  }, [childId]);

  if (session?.kind !== "child") return null;
  if (loading) return <p className="loading-message" role="status">Ton espace se prépare…</p>;
  if (error || !money)
    return (
      <div className="empty-state">
        <strong>Impossible de charger ton espace.</strong>
        <button className="btn btn-primary" onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );

  const { available, vault } = money.balances;
  const goal = money.goals[0];

  return (
    <div className="home">
      <section className="home-banner" aria-labelledby="welcome-title">
        <div className="home-banner-identity">
          <Avatar avatarId={session.child.avatarId} size="lg" />
          <div>
            <h1 id="welcome-title">Bonjour {session.child.displayName}</h1>
            <div className="home-banner-level">
              <span className="level-seal">Niv. {level.level}</span>
              <div className="home-banner-xp">
                <ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel} />
                <small>
                  {level.xpIntoLevel} / {level.xpForNextLevel} XP
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-money" aria-label="Mon argent">
        <Link to="/enfant/argent" className="home-money-card home-money-card--account">
          <CoinArt size={88} className="home-money-art" />
          <span className="home-money-text">
            <span>Mon compte</span>
            <strong>
              {available} <small>{available > 1 ? "pièces" : "pièce"}</small>
            </strong>
            <span className="home-money-link">
              Voir mon argent <GameIcon name="arrow" size={16} />
            </span>
          </span>
        </Link>
        <Link to="/enfant/argent/coffre" className="home-money-card home-money-card--vault">
          <ChestArt state={chestStateFor(vault, money.goals)} size={112} className="home-money-art home-money-art--chest" />
          <span className="home-money-text">
            <span>Mon coffre</span>
            <strong>
              {vault} <small>{vault > 1 ? "pièces" : "pièce"}</small>
            </strong>
            {goal ? (
              <span className="home-money-goal">
                <span>
                  {goal.title} : {goal.reached ? "objectif atteint" : `il te manque ${pieces(goal.missing)}`}
                </span>
                <ProgressBar value={goal.present} max={goal.targetCoins} />
              </span>
            ) : (
              <span className="home-money-link">
                Choisir un objectif <GameIcon name="arrow" size={16} />
              </span>
            )}
          </span>
        </Link>
      </section>

      <div className="home-columns">
        <div className="home-main-column">
          <section className="home-section" aria-labelledby="quest-title">
            <div className="section-heading home-section-heading">
              <ObjectArt name="quest-board" folder="quests" size={64} />
              <h2 id="quest-title">Journal de quêtes</h2>
              <Link to="/enfant/quetes">
                Toutes les quêtes <GameIcon name="arrow" size={16} />
              </Link>
            </div>
            {quests.length === 0 ? (
              <div className="home-empty">
                <ObjectArt name="quest-scroll" size={88} />
                <div>
                  <strong>Pas encore de quête</strong>
                  <p>Demande à un parent de t'en proposer une.</p>
                </div>
              </div>
            ) : (
              <div className="quest-list">
                {quests.slice(0, 3).map((q, index) => (
                  <Link to="/enfant/quetes" className="quest-entry" key={q.id}>
                    <span className="quest-entry-number">{index + 1}</span>
                    <span className="quest-entry-copy">
                      <strong>{q.title}</strong>
                      <small>{q.status === "ACCEPTEE" ? "Quête en cours" : "À commencer"}</small>
                    </span>
                    <span className="quest-entry-rewards">
                      <CoinPill amount={q.rewardCoins} />
                      <span className="xp-badge">
                        <GameIcon name="xp" size={15} />
                        {q.rewardXp} XP
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="home-side-column">
          <Link to="/enfant/collection" className="booster-callout">
            <span className="booster-callout-copy">
              <span>Ton inventaire</span>
              <strong>{boosters.length > 0 ? `${boosters.length} booster${boosters.length > 1 ? "s" : ""} à ouvrir` : "Tes boosters"}</strong>
              <small>{boosters.length > 0 ? "Ouvre-les quand tu veux dans ta collection." : "Chaque quête validée te donne un booster."}</small>
              <span className="booster-callout-action">
                {boosters.length > 0 ? "Ouvrir un booster" : "Voir ma collection"} <GameIcon name="arrow" size={16} />
              </span>
            </span>
            <img src={boosterImage} alt="" />
          </Link>
          <Link to="/enfant/argent/investir" className="home-callout">
            <ObjectArt name="coin-sprout" size={72} />
            <span>
              <strong>Investir</strong>
              <small>{statementReady ? "Ton bilan est prêt." : "Découvre comment un placement évolue, avec des unités école."}</small>
            </span>
            <GameIcon name="arrow" size={18} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
