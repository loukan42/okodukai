// Encarts pédagogiques contextuels (docs/FINANCIAL_EDUCATION.md §5) : un « feuillet de la
// bibliothèque » par écran au plus, une seule fois par enfant, détecté par le serveur à partir de
// ce qui est vraiment arrivé à ses pièces ou à son placement. Toutes les valeurs viennent d'ici.
import { prisma } from "../prisma.js";
import { readLedger, type MoneyLine } from "../money.js";
import { NOTIONS, type Band } from "./notions.js";

export type TipScreen = "home" | "history" | "vault" | "bilan" | "verger" | "support" | "patrimoine";
type Vars = Record<string, string | number>;

/** Ce qu'un bilan expose au moteur d'encarts (extrait de `runView`). */
export interface RunFacts {
  mode: "MIROIR" | "ASSURANCE_VIE";
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

const SUPPORT_NAMES: Record<string, string> = { SECURISE: "Sécurisé", PRETER: "Prêter", MONDE: "Panier Monde", ENTREPRISES: "Entreprises" };
const REAL_WORD: Record<string, string> = { SECURISE: "une épargne sécurisée", PRETER: "des obligations", MONDE: "un fonds", ENTREPRISES: "des actions" };
const STRONG = 0.1;
const QUIET = 0.01;

const fmt = (n: number, band: Band) =>
  band === "young" ? String(Math.round(n)) : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (fraction: number) => `${fraction >= 0 ? "+" : "−"}${Math.abs(fraction * 100).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
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
      return l ? { parent: l.author, signe: l.amount < 0 ? "−" : "+", n: Math.abs(l.amount), raison: l.reason ?? "pas de raison indiquée" } : null;
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
    young: "Tes {n} pièces sont dans Mon coffre. Tu as toujours autant de pièces en tout : elles ont changé de place. Cela s'appelle un transfert.",
    old: "Tes {n} pièces sont dans Mon coffre. Tu as toujours autant de pièces en tout : elles ont changé de place. Cela s'appelle un transfert.",
    detect: (c) => {
      const l = first(c.ledger, (x) => x.place === "vault" && x.kind === "transfert" && x.amount > 0);
      return l ? { n: l.amount } : null;
    },
  },
  {
    code: "T04", screen: "vault", title: { young: "Objectif", old: "Objectif" }, notions: ["objectif"],
    young: "Ton objectif : {titre}, {cible} pièces. Chaque pièce mise dans Mon coffre t'en rapproche.",
    old: "Ton objectif : {titre}, {cible} pièces. Chaque pièce mise dans Mon coffre t'en rapproche.",
    detect: (c) => (c.goals?.[0] ? { titre: c.goals[0].title, cible: c.goals[0].targetCoins } : null),
  },
  {
    code: "T05", screen: "vault", title: { young: "Épargner", old: "Épargne" }, notions: ["epargne"],
    young: "Objectif atteint : {cible} pièces dans Mon coffre. Tu as mis de côté pour plus tard : cela s'appelle épargner. Pour utiliser ces pièces, remets-les d'abord sur Mon compte.",
    old: "Objectif atteint : {cible} pièces dans Mon coffre. Tu as mis de côté pour plus tard : cela s'appelle épargner. L'argent mis de côté s'appelle l'épargne. Pour utiliser ces pièces, remets-les d'abord sur Mon compte.",
    detect: (c) => {
      const g = c.goals?.find((x) => x.achievedAt);
      return g ? { cible: g.targetCoins } : null;
    },
  },
  // -- Mes placements école (§5.3) -------------------------------------------
  {
    code: "T25", screen: "bilan", notions: [],
    young: "Ton placement vaut moins qu'au relevé d'avant. Ce n'est pas une erreur de ta part. Tes pièces n'ont pas bougé.",
    old: "Ton placement vaut moins qu'au relevé d'avant. Ce n'est pas une erreur de ta part. Tes pièces n'ont pas bougé.",
    detect: (c) => (c.run?.lastStatement && c.run.lastStatement.endValue < c.run.lastStatement.startValue ? {} : null),
  },
  {
    code: "T28", screen: "bilan", title: { old: "Perte réalisée" }, notions: [],
    young: "C'est une grosse baisse. Ça arrive avec certains placements. Tu n'as rien à faire tout de suite.",
    old: "C'est une forte baisse. Ça arrive. Tu n'as rien à décider tout de suite. Si tu changes de support maintenant, la baisse devient définitive pour la partie déplacée : on dit que la perte est réalisée.",
    detect: (c) => (c.run?.lastStatement && c.run.lastStatement.performance <= -STRONG ? {} : null),
  },
  {
    code: "T26", screen: "bilan", title: { old: "Moins-value latente" }, notions: ["latent"],
    young: "Ton placement vaut moins qu'au départ : {v} au lieu de {depart}. Il peut encore bouger, dans un sens ou dans l'autre. Tes pièces ne sont pas touchées.",
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
    detect: (c) => (c.run?.lastStatement ? { p: pct(c.run.lastStatement.performance), abs: Math.abs(c.run.lastStatement.performance * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) } : null),
  },
  {
    code: "T23", screen: "bilan", title: { young: "Monter", old: "Monter" }, notions: ["hausse_baisse"],
    young: "Ton placement a monté cette fois. Ça ne veut pas dire qu'il montera toujours.",
    old: "Ton placement a monté cette fois. Ça ne veut pas dire qu'il montera toujours.",
    detect: (c) => (c.run?.lastStatement && c.run.lastStatement.endValue > c.run.lastStatement.startValue ? {} : null),
  },
  {
    code: "T24", screen: "bilan", title: { young: "Baisser", old: "Volatilité" }, notions: ["hausse_baisse", "volatilite"],
    young: "{support} a baissé cette fois. Certains placements montent et descendent avec le temps.",
    old: "{support} a baissé cette fois. Certains placements montent et descendent avec le temps. Ces mouvements s'appellent la volatilité. Plus le niveau de risque est élevé, plus ils peuvent être forts.",
    detect: (c) => {
      const down = Object.entries(c.run?.lastStatement?.bySupportChange ?? {}).find(([, d]) => d < -0.005);
      return down ? { support: SUPPORT_NAMES[down[0]] ?? down[0] } : null;
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
    old: "Des frais ont été retirés : {f} unité en tout depuis le début. C'est le prix de la gestion de ton placement. Ils sont retirés un peu chaque mois, même quand le placement baisse.",
    detect: (c) => (c.run && c.run.feesPaid > 0 ? { f: fmt(c.run.feesPaid, c.band) } : null),
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
        if (Math.abs(actual - target) >= 10) return { support: SUPPORT_NAMES[code] ?? code, p0: `${Math.round(target)} %`, p1: `${Math.round(actual)} %` };
      }
      return null;
    },
  },
  {
    code: "T39", screen: "bilan", title: { old: "Versement programmé" }, notions: ["versement_regulier"],
    young: null,
    old: "Des unités école sont arrivées et ont été placées selon ta répartition : tu as versé {verse} en tout. Ajouter un peu à intervalles réguliers s'appelle un versement programmé.",
    detect: (c) => (c.run && c.run.monthlyPlan > 0 && c.run.contributed > 100.005 ? { verse: fmt(c.run.contributed, c.band) } : null),
  },
  {
    code: "T40", screen: "bilan", title: { old: "Versé, valeur" }, notions: ["verse_vs_valeur"],
    young: null,
    old: "Attention à ne pas confondre : tu as versé {verse}, ton portefeuille vaut {v}. Seule la différence ({d}) vient des mouvements des placements.",
    detect: (c) =>
      c.run && c.run.contributed > 100.005
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
    detect: (c) => (c.support ? { mot: REAL_WORD[c.support] ?? "un placement" } : null),
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
    old: "Tout ce que tu possèdes s'appelle ton patrimoine. Ici, il est en deux parties qui ne s'additionnent pas : les pièces et les unités école.",
    detect: () => ({}),
  },
  {
    code: "T45", screen: "verger", title: { old: "Assurance-vie" }, notions: ["assurance_vie"],
    young: null,
    old: "Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, on choisit des supports, comme dans l'observatoire.",
    detect: () => ({}),
  },
];

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
  const template = tip[ctx.band];
  if (!template) return null;
  const vars = tip.detect(ctx);
  if (!vars) return null;
  return { code: tip.code, title: tip.title?.[ctx.band] ?? null, message: fill(template, vars), notions: tip.notions.filter((n) => ctx.band === "old" || !NOTIONS[n]?.old) };
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
