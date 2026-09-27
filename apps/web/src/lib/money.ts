// Types et formats de « Mon trésor » (voir docs/FINANCIAL_EDUCATION.md §11).
import type { ChestState } from "../art/ChestArt";
import { defineCopy, pick } from "../i18n";
import { dateFormatter } from "../i18n/format";

export type Place = "account" | "vault";
export type LineKind = "entree" | "sortie" | "transfert" | "remboursement" | "correction" | "bonus_epargne" | "prime_coffre";

export interface MoneyLine {
  id: string;
  transactionId: string;
  place: Place;
  kind: LineKind;
  label: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  reason: string | null;
  author: string;
  pending: boolean;
}

export interface GoalView {
  id: string;
  title: string;
  targetCoins: number;
  /** Récompense de la boutique visée, s'il y en a une. */
  rewardId: string | null;
  present: number;
  missing: number;
  reached: boolean;
  achievedAt: string | null;
}

export type VaultMode = "FREE" | "PARENT_APPROVAL" | "MIN_DAYS" | "GOAL_ONLY";

export interface WeekSummary {
  since: string;
  entrees: number;
  sorties: number;
  difference: number;
  misDeCote: number;
  repris: number;
}

/** Prime du coffre, calculée par le serveur (le client ne fait que l'afficher). */
export interface VaultPrimePreview {
  active: boolean;
  /** Pièces à garder toute la semaine pour gagner une pièce. */
  step: number;
  weeklyCap: number;
  balance: number;
  /** Lundi prochain : pièces restées depuis lundi dernier et prime assurée si rien ne sort. */
  next: { at: string; kept: number; amount: number } | null;
  /** Pièces rangées cette semaine : elles comptent à partir de lundi. */
  countsFromNextWeek: number;
  /** Si rien ne bouge : prochains lundis, prime et solde du coffre après. */
  projection: { at: string; prime: number; balance: number }[];
  example: { kept: number; prime: number };
}

export interface MoneyOverview {
  ageBand: "AGE_8_9" | "AGE_10_12";
  balances: { available: number; vault: number };
  week: WeekSummary;
  recent: MoneyLine[];
  goals: GoalView[];
  vault: {
    mode: VaultMode;
    minDays: number | null;
    withdrawableNow: number;
    needsApproval: number;
    locked: number;
    nextUnlockAt: string | null;
    pendingRequest: { id: string; amount: number; createdAt: string } | null;
    prime: VaultPrimePreview;
  };
}

const COPY = defineCopy({
  fr: {
    coins: (n: number) => `${n} ${Math.abs(n) < 2 ? "pièce" : "pièces"}`,
    kinds: {
      entree: "Entrée",
      sortie: "Sortie",
      transfert: "Transfert",
      remboursement: "Remboursement",
      correction: "Correction",
      bonus_epargne: "Bonus d'épargne",
      prime_coffre: "Prime du coffre",
    } as Record<LineKind, string>,
    today: "Aujourd'hui",
    yesterday: "Hier",
    at: (day: string, time: string) => `${day} à ${time}`,
  },
  en: {
    coins: (n: number) => `${n} ${Math.abs(n) === 1 ? "coin" : "coins"}`,
    kinds: {
      entree: "Money in",
      sortie: "Money out",
      transfert: "Transfer",
      remboursement: "Refund",
      correction: "Correction",
      bonus_epargne: "Savings bonus",
      prime_coffre: "Vault bonus",
    },
    today: "Today",
    yesterday: "Yesterday",
    at: (day: string, time: string) => `${day} at ${time}`,
  },
});

/** « 0 pièce », « 1 pièce », « 2 pièces » ; « 0 coins », « 1 coin », « 2 coins ». */
export function pieces(n: number) {
  return pick(COPY).coins(n);
}

/** Signe toujours écrit : « +15 », « −30 » (vrai signe moins, U+2212). */
export function signed(n: number) {
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
}

/** Nom d'un type de ligne : « Entrée », « Sortie »… */
export function kindWord(kind: LineKind) {
  return pick(COPY).kinds[kind];
}

/** Une clé par intention de transfert : un double appui n'en crée pas deux. */
export function intentKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

/** État du coffre 3D selon l'avancée vers le premier objectif. */
export function chestStateFor(vault: number, goals: GoalView[]): ChestState {
  const goal = goals[0];
  // Sans objectif, le coffre reflète simplement la quantité mise de côté.
  if (!goal) return vault <= 0 ? "closed" : vault < 30 ? "low" : vault < 100 ? "full" : "almost";
  if (vault <= 0) return "empty";
  const ratio = goal.present / goal.targetCoins;
  if (ratio >= 1) return "reached";
  if (ratio >= 0.8) return "almost";
  if (ratio >= 0.34) return "full";
  return "low";
}

const DAY = dateFormatter({ weekday: "long", day: "numeric", month: "long" });
const WEEKDAY = dateFormatter({ weekday: "long" });
const TIME = dateFormatter({ hour: "2-digit", minute: "2-digit" });

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « Aujourd'hui », « Hier », « Mardi » ; au-delà d'une semaine, « mardi 14 octobre ». */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return pick(COPY).today;
  if (sameDay(d, yesterday)) return pick(COPY).yesterday;
  const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return capital(WEEKDAY.format(d));
  return capital(DAY.format(d));
}

export function timeLabel(iso: string) {
  return TIME.format(new Date(iso));
}

export function fullDate(iso: string) {
  const d = new Date(iso);
  return pick(COPY).at(DAY.format(d), TIME.format(d));
}

/** Regroupe des lignes (déjà triées du plus récent au plus ancien) par jour. */
export function groupByDay(lines: MoneyLine[]) {
  const groups: { day: string; lines: MoneyLine[] }[] = [];
  for (const line of lines) {
    const day = dayLabel(line.createdAt);
    const last = groups.at(-1);
    if (last && last.day === day) last.lines.push(line);
    else groups.push({ day, lines: [line] });
  }
  return groups;
}
