// Écrans de démonstration de l'app enfant, dessinés à la taille d'un téléphone (390 px) avec les
// vrais composants visuels du produit (pièce, coffre, lignes de relevé, barres de progression,
// icônes). Les données sont celles du foyer de démonstration : Emma, 9 ans. Textes : `copy.ts`.
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
import { useCopy } from "../../i18n";
import { LANDING } from "./copy";

type Tab = "home" | "money" | "quests" | "shop" | "collection";

const NAV: { tab: Tab; icon: GameIconName }[] = [
  { tab: "home", icon: "home" },
  { tab: "money", icon: "coin" },
  { tab: "quests", icon: "quest" },
  { tab: "shop", icon: "shop" },
  { tab: "collection", icon: "collection" },
];

const useDemo = () => useCopy(LANDING).demo;

/** L'habillage de l'app enfant : en-tête (logo, profil, accès parent) et barre d'onglets. */
export function AppChrome({ tab, children }: { tab: Tab; children: ReactNode }) {
  const t = useDemo();
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
          {t.parent}
        </span>
      </header>
      <div className="lpa-body">{children}</div>
      <nav className="lpa-nav">
        {NAV.map((item, i) => (
          <span key={item.tab} className={item.tab === tab ? "is-on" : undefined}>
            <GameIcon name={item.icon} size={22} />
            {t.nav[i]}
          </span>
        ))}
      </nav>
    </div>
  );
}

function MoneyTabs({ on }: { on: number }) {
  const t = useDemo();
  return (
    <div className="lpa-money-tabs">
      {t.moneyTabs.map((label, i) => (
        <span key={label} className={i === on ? "is-on" : undefined}>
          {label}
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
  const t = useDemo();
  return (
    <AppChrome tab="home">
      <section className="lpa-banner">
        <img src="/assets/avatars/aventurier-06-192.webp" alt="" width={64} height={64} />
        <div>
          <h1>{t.hello}</h1>
          <div className="lpa-level">
            <span>{t.level}</span>
            <ProgressBar value={80} max={125} />
          </div>
        </div>
      </section>
      <section className="lpa-card lpa-card--account">
        <CoinArt size={78} />
        <div>
          <span>{t.account}</span>
          <strong>
            32 <small>{t.coins}</small>
          </strong>
          <em>
            {t.seeMoney} <GameIcon name="arrow" size={14} />
          </em>
        </div>
      </section>
      <section className="lpa-card lpa-card--vault">
        <ChestArt state="full" size={96} />
        <div>
          <span>{t.vault}</span>
          <strong>
            70 <small>{t.coins}</small>
          </strong>
          <p>{t.vaultGoal}</p>
          <ProgressBar value={70} max={100} />
        </div>
      </section>
      <section className="lpa-quest-teaser">
        <img src="/assets/quests/quest-board-180.webp" alt="" width={52} height={52} />
        <div>
          <strong>{t.dishwasher}</strong>
          <span>{t.today}</span>
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
  const t = useDemo();
  return (
    <AppChrome tab="quests">
      <div className="lpa-page-title">
        <img src="/assets/quests/quest-board-180.webp" alt="" width={76} height={76} />
        <div>
          <small>{t.questsKicker}</small>
          <h1>{t.questsTitle}</h1>
        </div>
      </div>
      <article className="lpa-quest lpa-quest--done">
        <div className="lpa-quest-head">
          <h2>{t.room}</h2>
          <span className="lpa-status lpa-status--ok">{t.approved}</span>
        </div>
        <p>{t.roomDetail}</p>
        <div className="lpa-rewards">
          <CoinPill amount={10} />
          <span className="lpa-xp">
            <GameIcon name="xp" size={16} /> 15 XP
          </span>
        </div>
        <span className="lpa-stamp">{t.approvedBy}</span>
      </article>
      <article className="lpa-quest">
        <div className="lpa-quest-head">
          <h2>{t.table}</h2>
          <span className="lpa-status">{t.available}</span>
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
          <strong>{t.toast}</strong> {t.toastEnd}
        </span>
      </div>
    </AppChrome>
  );
}

function AccountStep() {
  const t = useDemo();
  return (
    <AppChrome tab="money">
      <MoneyTabs on={0} />
      <section className="lpa-passbook">
        <div className="lpa-passbook-head">
          <span>{t.account}</span>
          <CoinArt size={48} />
        </div>
        <p className="lpa-passbook-balance">
          {t.balanceStart} <strong>42</strong> {t.coins}
        </p>
        <p className="lpa-passbook-week">
          {t.week} <b>+22</b> {t.earned}, <b>−10</b> {t.spent}
        </p>
      </section>
      <h2 className="lpa-heading">{t.latest}</h2>
      <div className="money-lines lpa-lines">
        <div className="lpa-line-new">
          <MoneyLineRow line={line("q1", "entree", t.lines[0], 10, today())} when="day" />
        </div>
        <MoneyLineRow line={line("r1", "sortie", t.lines[1], -10, today())} when="day" />
        <MoneyLineRow line={line("q2", "entree", t.lines[2], 10, yesterday())} when="day" />
        <MoneyLineRow line={line("a1", "entree", t.lines[3], 2, yesterday())} when="day" />
      </div>
    </AppChrome>
  );
}

function VaultStep() {
  const t = useDemo();
  return (
    <AppChrome tab="money">
      <MoneyTabs on={1} />
      <section className="lpa-vault">
        <ChestArt state="full" size={170} />
        <h1>{t.vault}</h1>
        <p className="lpa-vault-balance">
          <strong>90</strong> {t.coins}
        </p>
      </section>
      <div className="lpa-transfer">
        <div>
          <span>{t.account}</span>
          <strong>42 → 22</strong>
        </div>
        <div>
          <span>{t.vault}</span>
          <strong>70 → 90</strong>
        </div>
      </div>
      <div className="lpa-prime">
        <img src="/assets/objects/coin-sprout-128.webp" alt="" width={48} height={48} />
        <span>
          <small>{t.mondayBonus}</small>
          <strong>{t.bonus}</strong>
        </span>
      </div>
    </AppChrome>
  );
}

function GoalStep() {
  const t = useDemo();
  return (
    <AppChrome tab="money">
      <MoneyTabs on={1} />
      <h2 className="lpa-heading">{t.goals}</h2>
      <article className="lpa-goal lpa-goal--main">
        <div className="lpa-goal-head">
          <strong>
            {t.iceCream} <span>{t.shop}</span>
          </strong>
          <span>{t.of(90, 100)}</span>
        </div>
        <ProgressBar value={90} max={100} />
        <p>{t.missing}</p>
      </article>
      <article className="lpa-goal">
        <div className="lpa-goal-head">
          <strong>{t.book}</strong>
          <span>{t.of(0, 50)}</span>
        </div>
        <ProgressBar value={0} max={50} />
        <p>{t.next}</p>
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
  const t = useDemo();
  return (
    <AppChrome tab="money">
      <MoneyTabs on={2} />
      <section className="lpa-observatory">
        <img src="/assets/objects/telescope-256.webp" alt="" width={92} height={92} />
        <div>
          <small>{t.observatory}</small>
          <h1>{t.investments}</h1>
          <p>{t.year}</p>
        </div>
      </section>
      <section className="lpa-chart">
        <div className="lpa-chart-head">
          <span>{t.game}</span>
          <strong>
            23 <small>{t.placed}</small>
          </strong>
        </div>
        <svg viewBox="0 0 340 110" aria-hidden="true">
          <path d={CURVE} className="lpa-chart-line" />
        </svg>
        <span className="lpa-sim">{t.simulation}</span>
      </section>
      <ul className="lpa-supports">
        <li>
          <span>{t.safe}</span>
          <b>{t.barely}</b>
        </li>
        <li>
          <span>{t.companies}</span>
          <b className="is-up">{t.more}</b>
        </li>
        <li>
          <span>{t.world}</span>
          <b className="is-down">{t.less}</b>
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
