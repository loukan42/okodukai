// Prime du coffre (docs/SAVINGS_VAULT_SPEC.md) : chaque lundi à 8 h (Paris), Mon coffre donne une
// pièce pour chaque tranche de `step` pièces restées dedans toute la semaine écoulée (le plus petit
// solde de la semaine : ranger le dimanche et reprendre le lundi ne rapporte rien), au plus
// `weeklyCap`. La prime va dans Mon coffre, donc elle compte pour la semaine suivante.
// Comme l'argent de poche, elle est rattrapée à la lecture, datée du lundi où elle était due, une
// seule fois par lundi (clé d'idempotence). Le parent la règle ou l'arrête (VaultPrime).
import { Prisma, type VaultPrime, type WalletTransactionType } from "@prisma/client";
import { nextWeeklyDates, weeklyDueDates } from "./allowance.js";
import { DuplicateTransactionError, recordWalletTransaction, VAULT_TYPES, vaultDelta } from "./ledger.js";
import { prisma } from "./prisma.js";

const MONDAY = 1;
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** Choix proposés au parent (l'API accepte toute valeur raisonnable). */
export const PRIME_STEPS = [5, 10, 20, 50];
export const PRIME_CAPS = [5, 10, 20, 50];

export interface VaultMove {
  type: WalletTransactionType;
  amount: number;
  createdAt: Date;
}

type PrimeRule = Pick<VaultPrime, "step" | "weeklyCap">;

export const primeKey = (childId: string, due: Date) => `vault-prime:${childId}:${due.toISOString().slice(0, 10)}`;

/** Prime d'une semaine pour `kept` pièces restées toute la semaine. */
export function primeFor(kept: number, rule: PrimeRule) {
  if (rule.step <= 0) return 0;
  return Math.max(0, Math.min(rule.weeklyCap, Math.floor(kept / rule.step)));
}

/** Plus petit solde de Mon coffre entre `from` et `to` (exclu) : les pièces restées tout ce temps. */
export function keptBetween(moves: VaultMove[], from: Date, to: Date) {
  const sorted = [...moves].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const start = from.getTime();
  const end = to.getTime();
  let balance = 0;
  let i = 0;
  for (; i < sorted.length && sorted[i].createdAt.getTime() <= start; i++) balance += vaultDelta(sorted[i]);
  let min = balance;
  for (; i < sorted.length && sorted[i].createdAt.getTime() < end; i++) {
    balance += vaultDelta(sorted[i]);
    min = Math.min(min, balance);
  }
  return Math.max(0, min);
}

/** Règle du foyer pour cet enfant ; créée active avec les valeurs par défaut au premier passage. */
export async function vaultPrimeRule(childId: string) {
  await prisma.vaultPrime.createMany({ data: [{ childId }], skipDuplicates: true });
  return prisma.vaultPrime.findUniqueOrThrow({ where: { childId } });
}

async function vaultMoves(walletId: string): Promise<VaultMove[]> {
  return prisma.walletTransaction.findMany({
    where: { walletId, type: { in: VAULT_TYPES } },
    select: { type: true, amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Verse les primes dues depuis le dernier passage. Renvoie le nombre de primes versées et leur total. */
export async function applyVaultPrime(childId: string, now = new Date()) {
  const rule = await vaultPrimeRule(childId);
  const none = { count: 0, coins: 0, step: rule.step };
  if (!rule.active) return none;
  const from = rule.checkedUntil && rule.checkedUntil > rule.since ? rule.checkedUntil : rule.since;
  const due = weeklyDueDates(MONDAY, from, now).filter((d) => d.getTime() > from.getTime());
  if (due.length === 0) return none;
  const wallet = await prisma.wallet.findUnique({ where: { childId } });
  if (!wallet) return none;
  const moves = await vaultMoves(wallet.id);
  const keys = due.map((d) => primeKey(childId, d));
  const done = new Set((await prisma.walletTransaction.findMany({ where: { idempotencyKey: { in: keys } }, select: { idempotencyKey: true } })).map((t) => t.idempotencyKey));
  let count = 0;
  let coins = 0;
  for (const [i, date] of due.entries()) {
    if (done.has(keys[i])) continue;
    const start = new Date(Math.max(date.getTime() - WEEK, rule.since.getTime()));
    const amount = primeFor(keptBetween(moves, start, date), rule);
    if (amount === 0) continue;
    try {
      await prisma.$transaction((tx) =>
        recordWalletTransaction(tx, {
          walletId: wallet.id,
          amount,
          type: "VAULT_PRIME",
          actorId: rule.updatedById ?? childId,
          idempotencyKey: keys[i],
          sourceType: "vault_prime",
          reason: `1 pièce pour ${rule.step} pièces gardées toute la semaine`,
          createdAt: date,
        })
      );
      count++;
      coins += amount;
    } catch (err) {
      // Deux lectures simultanées : l'autre a versé la même prime (même calcul, même clé).
      if (!(err instanceof DuplicateTransactionError) && !(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
    // La prime entre dans Mon coffre : elle compte pour la semaine suivante.
    moves.push({ type: "VAULT_PRIME", amount, createdAt: date });
  }
  await prisma.vaultPrime.update({ where: { childId }, data: { checkedUntil: due[due.length - 1] } });
  return { count, coins, step: rule.step };
}

export interface PrimePreview {
  active: boolean;
  step: number;
  weeklyCap: number;
  /** Solde actuel de Mon coffre. */
  balance: number;
  /** Lundi prochain : pièces restées depuis lundi dernier, et la prime qu'elles donneront si rien ne sort. */
  next: { at: string; kept: number; amount: number } | null;
  /** Pièces rangées cette semaine : elles comptent à partir de la semaine prochaine. */
  countsFromNextWeek: number;
  /** Si rien ne bouge : les prochains lundis, la prime et le solde du coffre après. */
  projection: { at: string; prime: number; balance: number }[];
  /** Exemple pour expliquer la règle (« 30 pièces gardées → 3 pièces »). */
  example: { kept: number; prime: number };
}

/** Ce que Mon coffre rapportera si rien ne bouge (calcul serveur, le client n'affiche que ça). */
export function primePreview(moves: VaultMove[], rule: VaultPrime, now: Date, weeks = 4): PrimePreview {
  const balance = moves.reduce((sum, m) => sum + (m.createdAt.getTime() <= now.getTime() ? vaultDelta(m) : 0), 0);
  const base = { active: rule.active, step: rule.step, weeklyCap: rule.weeklyCap, balance, example: { kept: rule.step * 3, prime: primeFor(rule.step * 3, rule) } };
  if (!rule.active) return { ...base, next: null, countsFromNextWeek: 0, projection: [] };
  const lastMonday = weeklyDueDates(MONDAY, new Date(now.getTime() - 8 * DAY), now).at(-1);
  const periodStart = new Date(Math.max(lastMonday?.getTime() ?? 0, rule.since.getTime()));
  const kept = keptBetween(moves, periodStart, new Date(now.getTime() + 1));
  const upcoming = nextWeeklyDates(MONDAY, now, weeks);
  const projection: PrimePreview["projection"] = [];
  let running = balance;
  for (const [i, at] of upcoming.entries()) {
    const prime = primeFor(i === 0 ? kept : running, rule);
    running += prime;
    projection.push({ at: at.toISOString(), prime, balance: running });
  }
  return {
    ...base,
    next: upcoming[0] ? { at: upcoming[0].toISOString(), kept, amount: projection[0]?.prime ?? 0 } : null,
    countsFromNextWeek: Math.max(0, balance - kept),
    projection,
  };
}

/** Aperçu pour un enfant (lecture seule : à appeler après `applyVaultPrime`). */
export async function vaultPrimeView(childId: string, now = new Date()) {
  const [rule, wallet] = await Promise.all([vaultPrimeRule(childId), prisma.wallet.findUnique({ where: { childId } })]);
  const moves = wallet ? await vaultMoves(wallet.id) : [];
  return primePreview(moves, rule, now);
}
