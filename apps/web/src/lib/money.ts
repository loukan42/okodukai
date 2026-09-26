// Types et formats de « Mon argent » (voir docs/FINANCIAL_EDUCATION.md §11).
import type { ChestState } from "../art/ChestArt";

export type Place = "account" | "vault";
export type LineKind = "entree" | "sortie" | "transfert" | "remboursement" | "correction" | "bonus_epargne";

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
  };
}

const plural = new Intl.PluralRules("fr");

/** « 0 pièce », « 1 pièce », « 2 pièces ». */
export function pieces(n: number) {
  return `${n} ${plural.select(Math.abs(n)) === "one" ? "pièce" : "pièces"}`;
}

/** Signe toujours écrit : « +15 », « −30 » (vrai signe moins, U+2212). */
export function signed(n: number) {
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
}

export const KIND_WORD: Record<LineKind, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  transfert: "Transfert",
  remboursement: "Remboursement",
  correction: "Correction",
  bonus_epargne: "Bonus d'épargne",
};

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

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « Aujourd'hui », « Hier », « Mardi » ; au-delà d'une semaine, « mardi 14 octobre ». */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return capital(WEEKDAY.format(d));
  return capital(DAY.format(d));
}

export function timeLabel(iso: string) {
  return TIME.format(new Date(iso));
}

export function fullDate(iso: string) {
  const d = new Date(iso);
  return `${DAY.format(d)} à ${TIME.format(d)}`;
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
