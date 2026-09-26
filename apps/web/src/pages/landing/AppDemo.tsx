// Écrans de démonstration de l'app enfant, dessinés à la taille d'un téléphone (390 px) avec les
// vrais composants visuels du produit (pièce, coffre, lignes de relevé, barres de progression,
// icônes). Les données sont celles du foyer de démonstration : Emma, 9 ans.
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "../../art/Logo";
import { CoinArt } from "../../art/CoinArt";
import { ChestArt, type ChestState } from "../../art/ChestArt";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { ProgressBar } from "../../components/ProgressBar";
import { CoinPill } from "../../components/CoinPill";
import { MoneyLineRow } from "../../components/money/MoneyLineRow";
import type { MoneyLine } from "../../lib/money";

type Tab = "home" | "money" | "quests" | "shop" | "collection";

const NAV: { tab: Tab; label: string; icon: GameIconName }[] = [
  { tab: "home", label: "Accueil", icon: "home" },
  { tab: "money", label: "Mon argent", icon: "coin" },
  { tab: "quests", label: "Quêtes", icon: "quest" },
  { tab: "shop", label: "Boutique", icon: "shop" },
  { tab: "collection", label: "Collection", icon: "collection" },
];

const MONEY_TABS = ["Mon compte", "Coffre magique", "Investir", "Historique"];

/** L'habillage de l'app enfant : en-tête (logo, profil, accès parent) et barre d'onglets. */
export function AppChrome({ tab, children }: { tab: Tab; children: ReactNode }) {
  return (
    <div className="lpa">
      <header className="lpa-header">
        <Logo className="lpa-logo" sizes="96px" alt="" />
        <span className="lpa-id">
          <img src="/assets/avatars/aventurier-06-96.webp" alt="" width={34} height={34} />
          Emma
        </span>
        <span className="lpa-parent">
          <GameIcon name="lock" size={15} />
          Parent
        </span>
      </header>
      <div className="lpa-body">{children}</div>
      <nav className="lpa-nav">
        {NAV.map((item) => (
          <span key={item.tab} className={item.tab === tab ? "is-on" : undefined}>
            <GameIcon name={item.icon} size={22} />
            {item.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

function MoneyTabs({ on }: { on: number }) {
  return (
    <div className="lpa-money-tabs">
      {MONEY_TABS.map((t, i) => (
        <span key={t} className={i === on ? "is-on" : undefined}>
          {t}
        </span>
      ))}
    </div>
  );
}

const today = () => new Date().toISOString();
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString();

function line(id: string, kind: MoneyLine["kind"], label: string, amount: number, createdAt: string): MoneyLine {
  return { id, transactionId: id, place: "account", kind, label, amount, balanceBefore: 0, balanceAfter: 0, createdAt, reason: null, author: "Sophie", pending: false };
}

/** Accueil : le premier écran d'Emma (le téléphone du hero). */
export function HomeScreen() {
  return (
    <AppChrome tab="home">
      <section className="lpa-banner">
        <img src="/assets/avatars/aventurier-06-192.webp" alt="" width={64} height={64} />
        <div>
          <h1>Bonjour Emma</h1>
          <div className="lpa-level">
            <span>Niv. 2</span>
            <ProgressBar value={80} max={125} />
          </div>
        </div>
      </section>
      <section className="lpa-card lpa-card--account">
        <CoinArt size={78} />
        <div>
          <span>Mon compte</span>
          <strong>
            32 <small>pièces</small>
          </strong>
          <em>
            Voir mon argent <GameIcon name="arrow" size={14} />
          </em>
        </div>
      </section>
      <section className="lpa-card lpa-card--vault">
        <ChestArt state="full" size={96} />
        <div>
          <span>Coffre magique</span>
          <strong>
            70 <small>pièces</small>
          </strong>
          <p>Glace en famille : il te manque 30 pièces</p>
          <ProgressBar value={70} max={100} />
        </div>
      </section>
      <section className="lpa-quest-teaser">
        <img src="/assets/quests/quest-board-180.webp" alt="" width={52} height={52} />
        <div>
          <strong>Vider le lave-vaisselle</strong>
          <span>À faire aujourd'hui</span>
        </div>
        <CoinPill amount={10} />
      </section>
    </AppChrome>
  );
}

// ---------------------------------------------------------------------------
// L'histoire du compte (section « Son premier compte ») : cinq écrans, un par chapitre.
// ---------------------------------------------------------------------------

function QuestStep() {
  return (
    <AppChrome tab="quests">
      <div className="lpa-page-title">
        <img src="/assets/quests/quest-board-180.webp" alt="" width={76} height={76} />
        <div>
          <small>À faire et à gagner</small>
          <h1>Journal de quêtes</h1>
        </div>
      </div>
      <article className="lpa-quest lpa-quest--done">
        <div className="lpa-quest-head">
          <h2>Ranger sa chambre</h2>
          <span className="lpa-status lpa-status--ok">Validée</span>
        </div>
        <p>Lit fait, jouets rangés, bureau dégagé.</p>
        <div className="lpa-rewards">
          <CoinPill amount={10} />
          <span className="lpa-xp">
            <GameIcon name="xp" size={16} /> 15 XP
          </span>
        </div>
        <span className="lpa-stamp">Validée par Papa</span>
      </article>
      <article className="lpa-quest">
        <div className="lpa-quest-head">
          <h2>Mettre la table</h2>
          <span className="lpa-status">Disponible</span>
        </div>
        <div className="lpa-rewards">
          <CoinPill amount={5} />
          <span className="lpa-xp">
            <GameIcon name="xp" size={16} /> 10 XP
          </span>
        </div>
      </article>
      <div className="lpa-toast">
        <CoinArt size={34} />
        <span>
          <strong>+10 pièces</strong> sur ton compte
        </span>
      </div>
    </AppChrome>
  );
}

function AccountStep() {
  return (
    <AppChrome tab="money">
      <MoneyTabs on={0} />
      <section className="lpa-passbook">
        <div className="lpa-passbook-head">
          <span>Mon compte</span>
          <CoinArt size={48} />
        </div>
        <p className="lpa-passbook-balance">
          J'ai <strong>42</strong> pièces
        </p>
        <p className="lpa-passbook-week">
          Cette semaine : <b>+22</b> gagnées, <b>−10</b> dépensées
        </p>
      </section>
      <h2 className="lpa-heading">Derniers mouvements</h2>
      <div className="money-lines lpa-lines">
        <div className="lpa-line-new">
          <MoneyLineRow line={line("q1", "entree", "Quête « Ranger sa chambre »", 10, today())} when="day" />
        </div>
        <MoneyLineRow line={line("r1", "sortie", "Récompense « Choisir le dessert »", -10, today())} when="day" />
        <MoneyLineRow line={line("q2", "entree", "Quête « Vider le lave-vaisselle »", 10, yesterday())} when="day" />
        <MoneyLineRow line={line("a1", "entree", "Argent de poche de Sophie", 2, yesterday())} when="day" />
      </div>
    </AppChrome>
  );
}

function VaultStep() {
  return (
    <AppChrome tab="money">
      <MoneyTabs on={1} />
      <section className="lpa-vault">
        <ChestArt state="full" size={170} />
        <h1>Coffre magique</h1>
        <p className="lpa-vault-balance">
          <strong>90</strong> pièces
        </p>
      </section>
      <div className="lpa-transfer">
        <div>
          <span>Mon compte</span>
          <strong>42 → 22</strong>
        </div>
        <div>
          <span>Coffre magique</span>
          <strong>70 → 90</strong>
        </div>
      </div>
      <div className="lpa-prime">
        <img src="/assets/objects/coin-sprout-128.webp" alt="" width={48} height={48} />
        <span>
          <small>Ma prime de lundi</small>
          <strong>+7 pièces</strong>
        </span>
      </div>
    </AppChrome>
  );
}

function GoalStep() {
  return (
    <AppChrome tab="money">
      <MoneyTabs on={1} />
      <h2 className="lpa-heading">Mes objectifs</h2>
      <article className="lpa-goal lpa-goal--main">
        <div className="lpa-goal-head">
          <strong>
            Glace en famille <span>Boutique</span>
          </strong>
          <span>90 sur 100</span>
        </div>
        <ProgressBar value={90} max={100} />
        <p>Il te manque 10 pièces.</p>
      </article>
      <article className="lpa-goal">
        <div className="lpa-goal-head">
          <strong>Livre au choix</strong>
          <span>0 sur 50</span>
        </div>
        <ProgressBar value={0} max={50} />
        <p>Le Coffre magique le remplira ensuite.</p>
      </article>
      <div className="lpa-goal-chest">
        <ChestArt state="almost" size={150} />
      </div>
    </AppChrome>
  );
}

/** Une partie de placement (valeurs de démonstration, marché simulé). */
const CURVE = "M8 92 C 40 88, 58 70, 84 74 S 128 96, 150 80 S 190 40, 214 52 S 252 70, 272 44 S 310 20, 332 28";

function InvestStep() {
  return (
    <AppChrome tab="money">
      <MoneyTabs on={2} />
      <section className="lpa-observatory">
        <img src="/assets/objects/telescope-256.webp" alt="" width={92} height={92} />
        <div>
          <small>L'observatoire</small>
          <h1>Mes placements</h1>
          <p>Année 4 sur 10. Prochain relevé ce soir à 17 h.</p>
        </div>
      </section>
      <section className="lpa-chart">
        <div className="lpa-chart-head">
          <span>Ma partie</span>
          <strong>
            23 <small>pièces placées : 20</small>
          </strong>
        </div>
        <svg viewBox="0 0 340 110" aria-hidden="true">
          <path d={CURVE} className="lpa-chart-line" />
        </svg>
        <span className="lpa-sim">Simulation</span>
      </section>
      <ul className="lpa-supports">
        <li>
          <span>Sécurisé</span>
          <b>presque pas bougé</b>
        </li>
        <li>
          <span>Entreprises</span>
          <b className="is-up">▲ 3 de plus</b>
        </li>
        <li>
          <span>Panier Monde</span>
          <b className="is-down">▼ 1 de moins</b>
        </li>
      </ul>
    </AppChrome>
  );
}

const STEPS = [QuestStep, AccountStep, VaultStep, GoalStep, InvestStep];

/** L'écran qui correspond au chapitre `step` ; il change en fondu quand on avance. */
export function StoryScreen({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const Screen = STEPS[Math.max(0, Math.min(STEPS.length - 1, step))];
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={step}
        className="lpa-frame"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: reduce ? 0.01 : 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        <Screen />
      </motion.div>
    </AnimatePresence>
  );
}

export const STORY_STEP_COUNT = STEPS.length;

/** Le coffre de démonstration, pour la section « Coffre magique ». */
export const VAULT_STAGES: { state: ChestState; balance: number }[] = [
  { state: "closed", balance: 0 },
  { state: "low", balance: 20 },
  { state: "full", balance: 42 },
  { state: "almost", balance: 90 },
  { state: "reached", balance: 100 },
];
