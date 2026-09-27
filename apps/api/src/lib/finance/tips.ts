// Encarts pédagogiques contextuels (docs/FINANCIAL_EDUCATION.md §5) : un « feuillet de la
// bibliothèque » par écran au plus, une seule fois par enfant, détecté par le serveur à partir de
// ce qui est vraiment arrivé à ses pièces ou à son placement. Toutes les valeurs viennent d'ici.
import { prisma } from "../prisma.js";
import { readLedger, type MoneyLine } from "../money.js";
import { NOTIONS, type Band } from "./notions.js";
import { locale } from "../i18n.js";

export type TipScreen = "home" | "history" | "vault" | "bilan" | "verger" | "support" | "patrimoine";
type Vars = Record<string, string | number>;

/** Ce qu'un bilan expose au moteur d'encarts (extrait de `runView`). */
export interface RunFacts {
  mode: "MIROIR" | "ASSURANCE_VIE";
  fundedAmount: number | null;
  finished: boolean;
  value: number;
  contributed: number;
  feesPaid: number;
  monthlyPlan: number;
  revealedSteps: number;
  statements: { step: number; value: number }[];
  series: { step: number; value: number; contributed: number }[];
  bySupport: Record<string, number>;
  actualAllocation: Record<string, number>;
  targetAllocation: Record<string, number>;
  lastStatement: null | { startValue: number; endValue: number; performance: number; bySupportChange: Record<string, number> };
  priceIndex: number | null;
}

export interface TipContext {
  childId: string;
  band: Band;
  support?: string;
  run?: RunFacts;
  ledger?: MoneyLine[];
  goals?: { title: string; targetCoins: number; achievedAt: Date | null }[];
}

interface TipDef {
  code: string;
  screen: TipScreen;
  /** Mot introduit (titre du feuillet), s'il y en a un. */
  title?: Partial<Record<Band, string>>;
  notions: string[];
  young: string | null;
  old: string | null;
  /** Conditions remplies → variables du message ; `null` : pas d'encart. */
  detect: (ctx: TipContext) => Vars | null;
}

const SUPPORT_NAMES_BY = {
  fr: { SECURISE: "Sécurisé", PRETER: "Prêter", MONDE: "Panier Monde", ENTREPRISES: "Entreprises" } as Record<string, string>,
  en: { SECURISE: "Safe", PRETER: "Lending", MONDE: "World basket", ENTREPRISES: "Companies" } as Record<string, string>,
};
const REAL_WORD_BY = {
  fr: { SECURISE: "une épargne sécurisée", PRETER: "des obligations", MONDE: "un fonds", ENTREPRISES: "des actions" } as Record<string, string>,
  en: { SECURISE: "secure savings", PRETER: "bonds", MONDE: "a fund", ENTREPRISES: "shares" } as Record<string, string>,
};
const supportName = (code: string) => SUPPORT_NAMES_BY[locale()][code] ?? code;
const realWord = (code: string) => REAL_WORD_BY[locale()][code] ?? (locale() === "en" ? "an investment" : "un placement");
const intl = () => (locale() === "en" ? "en-GB" : "fr-FR");
const percentSign = (text: string) => (locale() === "en" ? `${text}%` : `${text} %`);
const unitWord = (funded: boolean) => (locale() === "en" ? (funded ? "coins" : "practice units") : funded ? "pièces" : "unités école");
const STRONG = 0.1;
const QUIET = 0.01;

const fmt = (n: number, band: Band) =>
  band === "young" ? String(Math.round(n)) : n.toLocaleString(intl(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (fraction: number) => `${fraction >= 0 ? "+" : "−"}${percentSign(Math.abs(fraction * 100).toLocaleString(intl(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}`;
const first = (lines: MoneyLine[] | undefined, test: (l: MoneyLine) => boolean) => lines?.find(test) ?? null;

const TIPS: TipDef[] = [
  // -- Mon compte et Mon coffre (§5.2) --------------------------------------
  {
    code: "T01", screen: "home", title: { young: "Entrée, solde", old: "Entrée, solde" }, notions: ["entree", "solde"],
    young: "Des pièces sont arrivées sur ton compte : c'est une entrée. Ce que tu as sur ton compte s'appelle ton solde.",
    old: "Des pièces sont arrivées sur ton compte : c'est une entrée. Ce que tu as sur ton compte s'appelle ton solde.",
    detect: (c) => (first(c.ledger, (l) => l.place === "account" && l.kind === "entree") ? {} : null),
  },
  {
    code: "T08", screen: "history", title: { young: "Historique", old: "Historique" }, notions: ["historique"],
    young: "Ici, tu vois tout ce qui est entré et sorti de ton compte. C'est ton historique.",
    old: "Ici, tu vois tout ce qui est entré et sorti de ton compte. C'est ton historique. À la banque, on reçoit la même chose : un relevé de compte.",
    detect: () => ({}),
  },
  {
    code: "T02", screen: "history", title: { young: "Sortie", old: "Sortie" }, notions: ["sortie"],
    young: "Des pièces sont sorties de ton compte : c'est une sortie. Ton solde est passé de {avant} à {apres}.",
    old: "Des pièces sont sorties de ton compte : c'est une sortie. Ton solde est passé de {avant} à {apres}.",
    detect: (c) => {
      const l = first(c.ledger, (x) => x.place === "account" && x.kind === "sortie");
      return l ? { avant: l.balanceBefore, apres: l.balanceAfter } : null;
    },
  },
  {
    code: "T09", screen: "history", notions: [],
    young: "{parent} a corrigé ton compte : {signe}{n} pièces. Raison : {raison}. L'ancienne ligne reste visible : un historique ne s'efface pas.",
    old: "{parent} a corrigé ton compte : {signe}{n} pièces. Raison : {raison}. L'ancienne ligne reste visible : un historique ne s'efface pas.",
    detect: (c) => {
      const l = first(c.ledger, (x) => x.kind === "correction");
      return l ? { parent: l.author, signe: l.amount < 0 ? "−" : "+", n: Math.abs(l.amount), raison: l.reason ?? (locale() === "en" ? "no reason given" : "pas de raison indiquée") } : null;
    },
  },
  {
    code: "T10", screen: "history", title: { young: "Remboursement", old: "Remboursement" }, notions: [],
    young: "Une demande n'a pas été acceptée. Tes {n} pièces sont revenues sur ton compte : c'est un remboursement.",
    old: "Une demande n'a pas été acceptée. Tes {n} pièces sont revenues sur ton compte : c'est un remboursement.",
    detect: (c) => {
      const l = first(c.ledger, (x) => x.kind === "remboursement");
      return l ? { n: l.amount } : null;
    },
  },
  {
    code: "T03", screen: "vault", title: { young: "Transfert", old: "Transfert" }, notions: ["transfert"],
    young: "Tu as mis {n} pièces dans ton coffre. Elles ont changé de place, mais ton total reste le même. C'est un transfert.",
    old: "Tu as mis {n} pièces dans ton coffre. Elles ont changé de place, mais ton total reste le même. C'est un transfert.",
    detect: (c) => {
      const l = first(c.ledger, (x) => x.place === "vault" && x.kind === "transfert" && x.amount > 0);
      return l ? { n: l.amount } : null;
    },
  },
  {
    code: "T04", screen: "vault", title: { young: "Objectif", old: "Objectif" }, notions: ["objectif"],
    young: "Tu veux mettre {cible} pièces de côté pour {titre}. Chaque pièce rangée dans ton coffre t'en rapproche.",
    old: "Tu veux mettre {cible} pièces de côté pour {titre}. Chaque pièce rangée dans ton coffre t'en rapproche.",
    detect: (c) => (c.goals?.[0] ? { titre: c.goals[0].title, cible: c.goals[0].targetCoins } : null),
  },
  {
    code: "T05", screen: "vault", title: { young: "Épargner", old: "Épargne" }, notions: ["epargne"],
    young: "Tu as atteint ton objectif de {cible} pièces dans le coffre. Mettre des pièces de côté, c'est épargner. Pour les utiliser, reprends-les sur ton compte.",
    old: "Tu as atteint ton objectif de {cible} pièces dans le coffre. Mettre des pièces de côté, c'est épargner. Cet argent de côté s'appelle l'épargne. Pour l'utiliser, reprends-le sur ton compte.",
    detect: (c) => {
      const g = c.goals?.find((x) => x.achievedAt);
      return g ? { cible: g.targetCoins } : null;
    },
  },
  // -- Mes placements école (§5.3) -------------------------------------------
  // T23 (première hausse) et T25 (première baisse, réassurance) ne sont pas des feuillets : la phrase
  // principale de chaque bilan les porte déjà mot pour mot (Invest.tsx, Statement), à chaque fois.
  {
    code: "T28", screen: "bilan", title: { old: "Perte réalisée" }, notions: [],
    young: "C'est une grosse baisse. Ça arrive avec certains placements. Tu n'as rien à faire tout de suite.",
    old: "C'est une forte baisse. Ça arrive. Tu n'as rien à décider tout de suite. Si tu changes de support maintenant, la baisse devient définitive pour la partie déplacée : on dit que la perte est réalisée.",
    detect: (c) => (c.run?.lastStatement && c.run.lastStatement.performance <= -STRONG ? {} : null),
  },
  {
    code: "T26", screen: "bilan", title: { old: "Moins-value latente" }, notions: ["latent"],
    young: "Ton placement vaut {v}, contre {depart} au départ. Sa valeur peut encore monter ou baisser.",
    old: "Ton portefeuille vaut moins que ce que tu as versé. On parle de moins-value. Tant que tu ne changes rien, elle peut encore évoluer : on dit qu'elle est latente.",
    detect: (c) => (c.run && c.run.statements.length > 0 && c.run.value < c.run.contributed - 0.005 ? { v: fmt(c.run.value, c.band), depart: fmt(c.run.contributed, c.band) } : null),
  },
  {
    code: "T26b", screen: "bilan", title: { old: "Plus-value latente" }, notions: ["latent"],
    young: null,
    old: "Ton portefeuille vaut plus que ce que tu as versé : c'est une plus-value. Tant que tu ne changes rien, elle peut encore évoluer : elle est latente.",
    detect: (c) => (c.run && c.run.statements.length > 0 && c.run.value > c.run.contributed + 0.005 ? {} : null),
  },
  {
    code: "T22", screen: "bilan", title: { young: "Relevé", old: "Relevé" }, notions: ["releve"],
    young: "Voici ton premier relevé. On regarde ce qui a changé depuis ta répartition.",
    old: "Voici ton premier relevé. On regarde ce qui a changé depuis ta répartition.",
    detect: (c) => (c.run && c.run.statements.length >= 1 && c.run.statements.length <= 2 ? {} : null),
  },
  {
    code: "T30", screen: "bilan", title: { old: "Pour cent" }, notions: ["pourcentage"],
    young: null,
    old: "{p}, ça veut dire : {abs} unités de plus (ou de moins) pour 100 unités. Tes 100 unités de départ, c'était 100 %.",
    detect: (c) => (c.run?.lastStatement ? { p: pct(c.run.lastStatement.performance), abs: Math.abs(c.run.lastStatement.performance * 100).toLocaleString(intl(), { maximumFractionDigits: 1 }) } : null),
  },
  {
    code: "T24", screen: "bilan", title: { young: "Baisser", old: "Volatilité" }, notions: ["hausse_baisse", "volatilite"],
    young: "{support} a baissé cette fois. Certains placements montent et descendent avec le temps.",
    old: "{support} a baissé cette fois. Certains placements montent et descendent avec le temps. Ces mouvements s'appellent la volatilité. Plus le niveau de risque est élevé, plus ils peuvent être forts.",
    detect: (c) => {
      const down = Object.entries(c.run?.lastStatement?.bySupportChange ?? {}).find(([, d]) => d < -0.005);
      return down ? { support: supportName(down[0]) } : null;
    },
  },
  {
    code: "T27", screen: "bilan", title: { old: "Diversification" }, notions: ["concentration", "diversification"],
    young: "Certains ont monté, d'autres ont baissé. Au total, ton placement a peu bougé. C'est l'avantage de ne pas tout mettre au même endroit.",
    old: "Certains supports ont monté, d'autres ont baissé. Au total, ton portefeuille a peu bougé : c'est l'effet de ta diversification.",
    detect: (c) => {
      const s = c.run?.lastStatement;
      if (!s) return null;
      const changes = Object.values(s.bySupportChange);
      return changes.some((d) => d > 0.005) && changes.some((d) => d < -0.005) && Math.abs(s.performance) < QUIET ? {} : null;
    },
  },
  {
    code: "T31", screen: "bilan", title: { old: "Rendement" }, notions: ["rendement"],
    young: "Une année s'est écoulée dans ta partie. Ton placement est passé de {debut} à {fin}.",
    old: "Une année simulée s'est écoulée. Ton portefeuille a changé de {p} sur l'année : c'est son rendement. Un rendement peut être positif ou négatif.",
    detect: (c) => {
      const s = c.run?.series;
      const start = s?.find((x) => x.step === 0);
      const year = s?.find((x) => x.step === 12);
      return start && year ? { debut: fmt(start.value, c.band), fin: fmt(year.value, c.band), p: pct(year.value / start.value - 1) } : null;
    },
  },
  {
    code: "T34", screen: "bilan", title: { old: "Frais de gestion" }, notions: ["frais"],
    young: null,
    old: "Depuis le début, {f} ont été retirés pour la gestion de ton placement. Ces frais sont prélevés chaque mois, même quand sa valeur baisse.",
    detect: (c) => (c.run && c.run.feesPaid > 0 ? { f: `${fmt(c.run.feesPaid, c.band)} ${unitWord(c.run.fundedAmount !== null)}` } : null),
  },
  {
    code: "T35", screen: "bilan", title: { old: "Inflation" }, notions: ["inflation"],
    young: null,
    old: "La liste du marché coûtait 100 unités école. Elle en coûte maintenant {b}. Quand la plupart des prix montent avec le temps, on parle d'inflation.",
    detect: (c) => (c.run && c.run.revealedSteps >= 12 && c.run.priceIndex && c.run.priceIndex > 100.5 ? { b: fmt(c.run.priceIndex, c.band) } : null),
  },
  {
    code: "T38", screen: "bilan", title: { old: "Rééquilibrer" }, notions: ["reequilibrage"],
    young: null,
    old: "Ta répartition a bougé toute seule : {support} représentait {p0}, il représente maintenant {p1}. Les supports n'ont pas évolué au même rythme. Revenir à ta répartition choisie s'appelle rééquilibrer.",
    detect: (c) => {
      if (!c.run) return null;
      for (const [code, target] of Object.entries(c.run.targetAllocation)) {
        const actual = c.run.actualAllocation[code] ?? 0; // en %, comme la cible
        if (Math.abs(actual - target) >= 10) return { support: supportName(code), p0: percentSign(String(Math.round(target))), p1: percentSign(String(Math.round(actual))) };
      }
      return null;
    },
  },
  {
    code: "T39", screen: "bilan", title: { old: "Versement programmé" }, notions: ["versement_regulier"],
    young: null,
    old: "Tu as versé {verse} en tout selon la répartition choisie. Ajouter un montant à intervalles réguliers s'appelle un versement programmé.",
    detect: (c) => (c.run && c.run.monthlyPlan > 0 && c.run.contributed > (c.run.fundedAmount ?? 100) + 0.005 ? { verse: `${fmt(c.run.contributed, c.band)} ${unitWord(c.run.fundedAmount !== null)}` } : null),
  },
  {
    code: "T40", screen: "bilan", title: { old: "Versé, valeur" }, notions: ["verse_vs_valeur"],
    young: null,
    old: "Tu as versé {verse}. Ton placement vaut maintenant {v}. La différence, {d}, vient de l'évolution de sa valeur et des frais.",
    detect: (c) =>
      c.run && c.run.contributed > (c.run.fundedAmount ?? 100) + 0.005
        ? { verse: fmt(c.run.contributed, c.band), v: fmt(c.run.value, c.band), d: `${c.run.value >= c.run.contributed ? "+" : "−"}${fmt(Math.abs(c.run.value - c.run.contributed), c.band)}` }
        : null,
  },
  {
    code: "T46", screen: "bilan", notions: [],
    young: "Ta partie est terminée. Voici tout ce qui s'est passé, et tout ce que tu as appris.",
    old: "Ta partie est terminée. Voici tout ce qui s'est passé, et tout ce que tu as appris.",
    detect: (c) => (c.run?.finished ? {} : null),
  },
  // -- Fiches, patrimoine, verger ---------------------------------------------
  {
    code: "T42", screen: "support", title: { old: "Dans la vraie vie" }, notions: ["obligation", "action", "fonds"],
    young: null,
    old: "Dans la vraie vie, on appelle ça {mot}.",
    detect: (c) => (c.support ? { mot: realWord(c.support) } : null),
  },
  {
    code: "T41", screen: "support", title: { young: "Attendre longtemps", old: "Horizon" }, notions: ["temps_long", "horizon"],
    young: "Certains supports sont faits pour attendre longtemps. Sur peu de temps, ils peuvent être plus bas qu'au départ au moment où tu regardes.",
    old: "Le temps que tu prévois d'attendre avant d'utiliser un placement s'appelle l'horizon. Sur un horizon court, un support qui bouge beaucoup a plus de risques d'être en baisse au moment où tu en as besoin. Attendre longtemps ne garantit rien, mais laisse aux hauts et aux bas le temps de se compenser, parfois.",
    detect: (c) => (c.support ? {} : null),
  },
  {
    code: "T44", screen: "patrimoine", title: { old: "Patrimoine" }, notions: ["patrimoine"],
    young: null,
    old: "Tout ce que tu possèdes s'appelle ton patrimoine. Les pièces de ton compte, de ton coffre et de tes placements s'additionnent. Les unités école du verger sont affichées à part.",
    detect: () => ({}),
  },
  {
    code: "T45", screen: "verger", title: { old: "Assurance-vie" }, notions: ["assurance_vie"],
    young: null,
    old: "Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, on choisit des supports, comme dans l'observatoire.",
    detect: () => ({}),
  },
];


/** Versions anglaises des encarts (même code). Les mots entre accolades sont remplis par `detect`. */
const EN: Record<string, { title?: Partial<Record<Band, string>>; young: string | null; old: string | null }> = {
  T01: {
    title: { young: "Money in, balance", old: "Money in, balance" },
    young: "Coins have arrived in your account: that's money in. What you have in your account is called your balance.",
    old: "Coins have arrived in your account: that's money in. What you have in your account is called your balance.",
  },
  T08: {
    title: { young: "History", old: "History" },
    young: "Here you can see everything that came into and went out of your account. That's your history.",
    old: "Here you can see everything that came into and went out of your account. That's your history. Banks send people the same thing: a bank statement.",
  },
  T02: {
    title: { young: "Money out", old: "Money out" },
    young: "Coins have left your account: that's money out. Your balance went from {avant} to {apres}.",
    old: "Coins have left your account: that's money out. Your balance went from {avant} to {apres}.",
  },
  T09: {
    young: "{parent} corrected your account: {signe}{n} coins. Reason: {raison}. The old line stays visible: a history is never erased.",
    old: "{parent} corrected your account: {signe}{n} coins. Reason: {raison}. The old line stays visible: a history is never erased.",
  },
  T10: {
    title: { young: "Refund", old: "Refund" },
    young: "A request wasn't accepted. Your {n} coins came back to your account: that's a refund.",
    old: "A request wasn't accepted. Your {n} coins came back to your account: that's a refund.",
  },
  T03: {
    title: { young: "Transfer", old: "Transfer" },
    young: "You put {n} coins in your vault. They moved to another place, but your total is the same. That's a transfer.",
    old: "You put {n} coins in your vault. They moved to another place, but your total is the same. That's a transfer.",
  },
  T04: {
    title: { young: "Goal", old: "Goal" },
    young: "You want to put {cible} coins aside for {titre}. Every coin in your vault brings you closer.",
    old: "You want to put {cible} coins aside for {titre}. Every coin in your vault brings you closer.",
  },
  T05: {
    title: { young: "Saving", old: "Savings" },
    young: "You reached your goal of {cible} coins in the vault. Putting coins aside is called saving. To use them, take them back to your account.",
    old: "You reached your goal of {cible} coins in the vault. Putting coins aside is called saving, and the money you've put aside is your savings. To use it, take it back to your account.",
  },
  T28: {
    title: { old: "Realised loss" },
    young: "That's a big drop. It happens with some investments. You don't need to do anything right now.",
    old: "That's a big drop. It happens. You don't have to decide anything right now. If you switch holdings now, the drop becomes permanent for the part you move: that's called realising a loss.",
  },
  T26: {
    title: { old: "Paper loss" },
    young: "Your investment is worth {v}, compared with {depart} at the start. Its value can still go up or down.",
    old: "Your portfolio is worth less than you paid in. That's a loss. As long as you don't change anything, it can still change: it's only a loss on paper.",
  },
  T26b: {
    title: { old: "Paper gain" },
    young: null,
    old: "Your portfolio is worth more than you paid in: that's a gain. As long as you don't change anything, it can still change: it's only a gain on paper.",
  },
  T22: {
    title: { young: "Statement", old: "Statement" },
    young: "Here's your first statement. Let's look at what changed since you made your split.",
    old: "Here's your first statement. Let's look at what changed since you made your split.",
  },
  T30: {
    title: { old: "Per cent" },
    young: null,
    old: "{p} means {abs} units more (or less) for every 100 units. Your 100 starting units were 100%.",
  },
  T24: {
    title: { young: "Going down", old: "Volatility" },
    young: "{support} went down this time. Some investments go up and down over time.",
    old: "{support} went down this time. Some investments go up and down over time. These movements are called volatility. The higher the risk level, the bigger they can be.",
  },
  T27: {
    title: { old: "Diversification" },
    young: "Some went up and others went down. Overall, your investment barely moved. That's the good thing about not putting everything in one place.",
    old: "Some holdings went up and others went down. Overall, your portfolio barely moved: that's your diversification at work.",
  },
  T31: {
    title: { old: "Return" },
    young: "A year has gone by in your game. Your investment went from {debut} to {fin}.",
    old: "A simulated year has gone by. Your portfolio changed by {p} over the year: that's its return. A return can be positive or negative.",
  },
  T34: {
    title: { old: "Management fees" },
    young: null,
    old: "Since the start, {f} have been taken for managing your investment. These fees come out every month, even when its value goes down.",
  },
  T35: {
    title: { old: "Inflation" },
    young: null,
    old: "The market list used to cost 100 practice units. Now it costs {b}. When most prices go up over time, it's called inflation.",
  },
  T38: {
    title: { old: "Rebalancing" },
    young: null,
    old: "Your split has shifted on its own: {support} was {p0} and is now {p1}. The holdings didn't grow at the same pace. Going back to the split you chose is called rebalancing.",
  },
  T39: {
    title: { old: "Regular deposit" },
    young: null,
    old: "You've paid in {verse} in total, using the split you chose. Adding an amount at regular intervals is called a regular deposit.",
  },
  T40: {
    title: { old: "Paid in, value" },
    young: null,
    old: "You've paid in {verse}. Your investment is now worth {v}. The difference, {d}, comes from changes in its value and from fees.",
  },
  T46: {
    young: "Your game is over. Here's everything that happened, and everything you learned.",
    old: "Your game is over. Here's everything that happened, and everything you learned.",
  },
  T42: {
    title: { old: "In real life" },
    young: null,
    old: "In real life, this is called {mot}.",
  },
  T41: {
    title: { young: "Waiting a long time", old: "Time horizon" },
    young: "Some holdings are made for waiting a long time. Over a short time, they can be lower than at the start when you look.",
    old: "The time you plan to wait before using an investment is called the time horizon. Over a short horizon, a holding that moves a lot is more likely to be down just when you need it. Waiting a long time doesn't guarantee anything, but it sometimes gives the ups and downs time to even out.",
  },
  T44: {
    title: { old: "Wealth" },
    young: null,
    old: "Everything you own is called your wealth. The coins in your account, your vault and your investments all add up. The orchard's practice units are shown separately.",
  },
  T45: {
    title: { old: "Life insurance" },
    young: null,
    old: "Life insurance is a wrapper for investing over many years. Inside it, you choose holdings, like in the observatory.",
  },
};

/** Modèles de l'encart dans la langue de la requête. */
function templates(tip: TipDef) {
  return locale() === "en" && EN[tip.code] ? { ...tip, ...EN[tip.code] } : tip;
}

/**
 * Priorité d'affichage (§5.1) : (1) réassurance T25, T28 → (2) séparation des monnaies T26 → (3) nouvelle
 * notion, dans l'ordre des chapitres → (4) le reste.
 */
function priority(tip: TipDef) {
  if (tip.code === "T25" || tip.code === "T28") return 0;
  if (tip.code === "T26" || tip.code === "T26b") return 1;
  const chapters = tip.notions.map((n) => NOTIONS[n]?.chapter).filter((c): c is number => Boolean(c));
  return chapters.length ? 2 + Math.min(...chapters) / 10 : 4;
}

const fill = (template: string, vars: Vars) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

export interface TipView {
  code: string;
  title: string | null;
  message: string;
  notions: string[];
}

export function tipByCode(code: string) {
  return TIPS.find((t) => t.code === code) ?? null;
}

/** Rend un encart pour cette tranche, ou `null` s'il ne s'applique pas (tranche « — » ou condition absente). */
export function renderTip(tip: TipDef, ctx: TipContext): TipView | null {
  const text = templates(tip);
  const template = text[ctx.band];
  if (!template) return null;
  const vars = tip.detect(ctx);
  if (!vars) return null;
  return { code: tip.code, title: text.title?.[ctx.band] ?? null, message: fill(template, vars), notions: tip.notions.filter((n) => ctx.band === "old" || !NOTIONS[n]?.old) };
}

/**
 * Feuillet déjà lu, redit dans la langue courante (carnet) : le titre toujours, le message seulement
 * s'il n'a pas de nombre à remplir. Sinon le texte gardé au journal reste affiché.
 */
export function replayTip(code: string, band: Band, stored: { title: string | null; message: string }) {
  const tip = tipByCode(code);
  if (!tip) return stored;
  const text = templates(tip);
  const template = text[band] ?? text[band === "young" ? "old" : "young"];
  return {
    title: text.title?.[band] ?? stored.title,
    message: template && !template.includes("{") ? template : stored.message,
  };
}

/** Charge ce dont les encarts d'un écran ont besoin (ledger, objectifs). */
export async function loadTipContext(childId: string, band: Band, screen: TipScreen, extra: Partial<TipContext> = {}): Promise<TipContext> {
  const ctx: TipContext = { childId, band, ...extra };
  if (screen === "home" || screen === "history" || screen === "vault") {
    const wallet = await prisma.wallet.findUnique({ where: { childId } });
    ctx.ledger = wallet ? (await readLedger(prisma, wallet.id)).lines : [];
  }
  if (screen === "vault") {
    ctx.goals = await prisma.savingsGoal.findMany({ where: { childId }, orderBy: { createdAt: "asc" }, select: { title: true, targetCoins: true, achievedAt: true } });
  }
  return ctx;
}

/** L'encart à montrer sur cet écran : le plus prioritaire parmi ceux qui ne sont pas encore au journal. */
export async function nextTip(ctx: TipContext, screen: TipScreen): Promise<TipView | null> {
  const logged = new Set((await prisma.financeTipLog.findMany({ where: { childId: ctx.childId }, select: { tipCode: true } })).map((t) => t.tipCode));
  const candidates = TIPS.filter((t) => t.screen === screen && !logged.has(t.code) && !(t.code === "T26b" && logged.has("T26"))).sort((a, b) => priority(a) - priority(b));
  for (const tip of candidates) {
    const view = renderTip(tip, ctx);
    if (view) return view;
  }
  return null;
}
