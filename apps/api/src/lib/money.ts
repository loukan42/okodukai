// « Mon argent » : lecture du ledger comme un relevé bancaire (lignes signées par lieu,
// soldes après chaque mouvement, résumé de la semaine), remplissage des objectifs et
// règles de retrait de Mon coffre. Tout est calculé côté serveur à partir des
// transactions immuables ; voir docs/FINANCIAL_EDUCATION.md §11.
import type { Prisma, VaultRuleMode, WalletTransaction } from "@prisma/client";
import { prisma } from "./prisma.js";

type Client = Prisma.TransactionClient | typeof prisma;

export type Place = "account" | "vault";
export type LineKind = "entree" | "sortie" | "transfert" | "remboursement" | "correction" | "bonus_epargne" | "prime_coffre";

export interface MoneyLine {
  id: string;
  transactionId: string;
  place: Place;
  kind: LineKind;
  /** Ce qui s'est passé, avec la source nommée (titre de quête, de récompense…). */
  label: string;
  /** Montant signé du point de vue du lieu regardé. */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  reason: string | null;
  author: string;
  /** Achat encore en attente de validation par un parent. */
  pending: boolean;
}

interface Sources {
  quests: Map<string, string>;
  rewards: Map<string, { title: string; status: string }>;
  people: Map<string, string>;
}

async function loadSources(client: Client, txns: WalletTransaction[]): Promise<Sources> {
  const completionIds = txns.filter((t) => t.sourceType === "quest_completion" && t.sourceId).map((t) => t.sourceId!);
  const redemptionIds = txns.filter((t) => t.sourceType === "reward_redemption" && t.sourceId).map((t) => t.sourceId!);
  const actorIds = [...new Set(txns.map((t) => t.actorId))];
  const [completions, redemptions, users] = await Promise.all([
    completionIds.length ? client.questCompletion.findMany({ where: { id: { in: completionIds } }, select: { id: true, quest: { select: { title: true } } } }) : [],
    redemptionIds.length ? client.rewardRedemption.findMany({ where: { id: { in: redemptionIds } }, select: { id: true, status: true, reward: { select: { title: true } } } }) : [],
    actorIds.length ? client.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } }) : [],
  ]);
  return {
    quests: new Map(completions.map((c) => [c.id, c.quest.title])),
    rewards: new Map(redemptions.map((r) => [r.id, { title: r.reward.title, status: r.status }])),
    people: new Map(users.map((u) => [u.id, u.displayName])),
  };
}

/** Effets d'une transaction : (lieu, montant signé, nature, libellé) pour chaque lieu touché. */
function effects(t: WalletTransaction, s: Sources): { place: Place; amount: number; kind: LineKind; label: string; pending?: boolean }[] {
  const parent = s.people.get(t.actorId);
  const quest = t.sourceId ? s.quests.get(t.sourceId) : undefined;
  const reward = t.sourceId ? s.rewards.get(t.sourceId) : undefined;
  switch (t.type) {
    case "QUEST_REWARD":
      return [{ place: "account", amount: t.amount, kind: "entree", label: quest ? `Quête « ${quest} »` : "Quête" }];
    case "PARENT_BONUS":
      return [{ place: "account", amount: t.amount, kind: "entree", label: parent ? `Bonus de ${parent}` : "Bonus" }];
    case "PARENT_ADJUSTMENT":
      return [{ place: "account", amount: t.direction === "debit" ? -t.amount : t.amount, kind: "correction", label: parent ? `Correction de ${parent}` : "Correction" }];
    case "REWARD_PURCHASE":
      return [{ place: "account", amount: -t.amount, kind: "sortie", label: reward ? `Récompense « ${reward.title} »` : "Récompense", pending: reward?.status === "DEMANDEE" }];
    case "REWARD_REFUND":
      return [{ place: "account", amount: t.amount, kind: "remboursement", label: reward ? `Remboursement « ${reward.title} »` : "Remboursement" }];
    case "SAVINGS_LOCK":
      return [
        { place: "account", amount: -t.amount, kind: "transfert", label: "Vers le Coffre magique" },
        { place: "vault", amount: t.amount, kind: "transfert", label: "Depuis ton compte" },
      ];
    case "SAVINGS_UNLOCK":
      return [
        { place: "vault", amount: -t.amount, kind: "transfert", label: "Vers ton compte" },
        { place: "account", amount: t.amount, kind: "transfert", label: "Depuis le Coffre magique" },
      ];
    case "ALLOWANCE":
      return [{ place: "account", amount: t.amount, kind: "entree", label: parent ? `Argent de poche de ${parent}` : "Argent de poche" }];
    case "GIFT":
      return [{ place: "account", amount: t.amount, kind: "entree", label: t.reason ? `Cadeau : ${t.reason}` : "Cadeau" }];
    case "SAVINGS_BONUS":
      return [{ place: "vault", amount: t.amount, kind: "bonus_epargne", label: parent ? `Bonus d'épargne de ${parent}` : "Bonus d'épargne" }];
    case "VAULT_PRIME":
      return [{ place: "vault", amount: t.amount, kind: "prime_coffre", label: "Prime du coffre" }];
    case "INVEST_LOCK":
      return [{ place: "account", amount: -t.amount, kind: "transfert", label: "Vers les placements" }];
    case "INVEST_RETURN":
      return [{ place: "account", amount: t.amount, kind: "transfert", label: "Depuis les placements" }];
  }
}

export interface Ledger {
  transactions: WalletTransaction[];
  lines: MoneyLine[];
  balances: { available: number; vault: number };
}

/** Relit tout le ledger d'un portefeuille, du plus ancien au plus récent, avec les soldes courants. */
export async function readLedger(client: Client, walletId: string): Promise<Ledger> {
  const transactions = await client.walletTransaction.findMany({ where: { walletId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const sources = await loadSources(client, transactions);
  const running: Record<Place, number> = { account: 0, vault: 0 };
  const lines: MoneyLine[] = [];
  for (const t of transactions) {
    for (const e of effects(t, sources)) {
      const before = running[e.place];
      running[e.place] += e.amount;
      lines.push({
        id: `${t.id}:${e.place}`,
        transactionId: t.id,
        place: e.place,
        kind: e.kind,
        label: e.label,
        amount: e.amount,
        balanceBefore: before,
        balanceAfter: running[e.place],
        createdAt: t.createdAt.toISOString(),
        reason: t.reason,
        author: sources.people.get(t.actorId) ?? "Toi",
        pending: Boolean(e.pending),
      });
    }
  }
  return { transactions, lines, balances: { available: running.account, vault: running.vault } };
}

/** Lundi 0 h, heure de Paris, de la semaine en cours. */
export function startOfWeekParis(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const sinceMidnightMs = (Number(get("hour")) * 3600 + Number(get("minute")) * 60 + Number(get("second"))) * 1000;
  return new Date(now.getTime() - sinceMidnightMs - weekday * 86_400_000 - (now.getTime() % 1000));
}

/** Résumé de la semaine pour Mon compte : les transferts ne sont ni des entrées ni des sorties. */
export function weekSummary(lines: MoneyLine[], now = new Date()) {
  const since = startOfWeekParis(now).getTime();
  const summary = { since: new Date(since).toISOString(), entrees: 0, sorties: 0, difference: 0, misDeCote: 0, repris: 0 };
  for (const l of lines) {
    if (l.place !== "account" || new Date(l.createdAt).getTime() < since) continue;
    if (l.kind === "transfert") {
      if (l.amount < 0) summary.misDeCote += -l.amount;
      else summary.repris += l.amount;
    } else if (l.amount >= 0) summary.entrees += l.amount;
    else summary.sorties += -l.amount;
  }
  summary.difference = summary.entrees - summary.sorties;
  return summary;
}

export interface GoalView {
  id: string;
  title: string;
  targetCoins: number;
  /** Récompense de la boutique visée par cet objectif, s'il y en a une. */
  rewardId: string | null;
  /** Part de Mon coffre attribuée à cet objectif (remplissage dans l'ordre). */
  present: number;
  missing: number;
  reached: boolean;
  achievedAt: string | null;
}

/** Mon coffre remplit les objectifs l'un après l'autre, dans leur ordre. */
export function allocateGoals(goals: { id: string; title: string; targetCoins: number; rewardId?: string | null; achievedAt: Date | null }[], vault: number): GoalView[] {
  let left = vault;
  return goals.map((g) => {
    const present = Math.max(0, Math.min(g.targetCoins, left));
    left -= present;
    return { id: g.id, title: g.title, targetCoins: g.targetCoins, rewardId: g.rewardId ?? null, present, missing: g.targetCoins - present, reached: present >= g.targetCoins, achievedAt: g.achievedAt?.toISOString() ?? null };
  });
}

export interface VaultAvailability {
  mode: VaultRuleMode;
  minDays: number | null;
  /** Pièces que l'enfant peut reprendre tout de suite. */
  withdrawableNow: number;
  /** Pièces qui demandent l'accord d'un parent. */
  needsApproval: number;
  /** Pièces bloquées jusqu'à une date ou jusqu'à l'objectif. */
  locked: number;
  /** Première date de déblocage (règle « durée minimale »). */
  nextUnlockAt: string | null;
}

/**
 * Qui peut reprendre quoi, dépôt par dépôt : les retraits consomment les dépôts les plus
 * anciens d'abord ; un dépôt fait avant l'entrée en vigueur de la règle reste libre.
 */
export function vaultAvailability(
  transactions: WalletTransaction[],
  rule: { mode: VaultRuleMode; minDays: number | null; since: Date } | null,
  firstGoal: GoalView | undefined,
  now = new Date()
): VaultAvailability {
  const mode = rule?.mode ?? "FREE";
  const lots: { remaining: number; at: Date }[] = [];
  for (const t of transactions) {
    if (t.type === "SAVINGS_LOCK" || t.type === "SAVINGS_BONUS") lots.push({ remaining: t.amount, at: t.createdAt });
    if (t.type === "SAVINGS_UNLOCK") {
      let left = t.amount;
      for (const lot of lots) {
        if (left <= 0) break;
        const take = Math.min(lot.remaining, left);
        lot.remaining -= take;
        left -= take;
      }
    }
  }
  const result: VaultAvailability = { mode, minDays: rule?.minDays ?? null, withdrawableNow: 0, needsApproval: 0, locked: 0, nextUnlockAt: null };
  let nextUnlock: number | null = null;
  for (const lot of lots) {
    if (lot.remaining <= 0) continue;
    const beforeRule = rule ? lot.at < rule.since : true;
    if (mode === "FREE" || beforeRule) {
      result.withdrawableNow += lot.remaining;
    } else if (mode === "MIN_DAYS") {
      const unlockAt = lot.at.getTime() + (rule?.minDays ?? 0) * 86_400_000;
      if (unlockAt <= now.getTime()) result.withdrawableNow += lot.remaining;
      else {
        result.locked += lot.remaining;
        nextUnlock = nextUnlock === null ? unlockAt : Math.min(nextUnlock, unlockAt);
      }
    } else if (mode === "GOAL_ONLY") {
      if (!firstGoal) result.needsApproval += lot.remaining;
      else if (firstGoal.reached) result.withdrawableNow += lot.remaining;
      else result.locked += lot.remaining;
    } else {
      result.needsApproval += lot.remaining;
    }
  }
  result.nextUnlockAt = nextUnlock === null ? null : new Date(nextUnlock).toISOString();
  return result;
}

/** Objectifs actifs d'un enfant, dans leur ordre de remplissage. */
export function activeGoals(client: Client, childId: string) {
  return client.savingsGoal.findMany({ where: { childId, archivedAt: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
}

// -- Mon mois en pièces (FINANCIAL_EDUCATION §8.2) : au calendrier réel, heure de Paris ------------

const MONTH_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });
/** « 2026-09 » : le mois (heure de Paris) d'un instant. */
export const monthKeyParis = (d: Date) => MONTH_KEY.format(d).slice(0, 7);
export function previousMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Entrées, sorties et pièces mises dans Mon coffre pendant un mois (les transferts ne sont ni l'un ni l'autre). */
export function monthSummary(lines: MoneyLine[], key: string) {
  const out = { entrees: 0, sorties: 0, misDeCote: 0 };
  for (const l of lines) {
    if (l.place !== "account" || monthKeyParis(new Date(l.createdAt)) !== key) continue;
    if (l.kind === "transfert") {
      if (l.amount < 0) out.misDeCote += -l.amount;
    } else if (l.amount >= 0) out.entrees += l.amount;
    else out.sorties += -l.amount;
  }
  return out;
}
