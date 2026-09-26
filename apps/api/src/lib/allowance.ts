// Argent de poche automatique (docs/RESTE_A_FAIRE.md P2.10) : un versement chaque semaine, au jour
// choisi par le parent, à 8 h (heure de Paris). L'API tourne en serverless, sans tâche planifiée :
// les versements dus sont rattrapés à la lecture du compte, datés du jour où ils étaient dus, avec
// une clé d'idempotence par date (jamais deux fois le même versement).
import { Prisma } from "@prisma/client";
import type { RhythmDefinition } from "./financeSim/index.js";
import { listRendezVous } from "./financeSim/index.js";
import { DuplicateTransactionError, recordWalletTransaction } from "./ledger.js";
import { prisma } from "./prisma.js";

const TIME_ZONE = "Europe/Paris";
const WEEK = 7 * 24 * 60 * 60 * 1000;
/** Au plus deux ans de rattrapage d'un coup (un compte rouvert après une très longue absence). */
const MAX_CATCH_UP = 104;

/** 1 = lundi … 7 = dimanche (réglage parent) → jour du calendrier du moteur (0 = dimanche). */
const weeklyRhythm = (weekday: number): RhythmDefinition => ({
  code: "LONG",
  daysOfWeek: [weekday % 7],
  minutesOfDay: [8 * 60],
  monthsPerRendezVous: 1,
  minLeadMinutes: 0,
});

export function allowanceDueDates(weekday: number, startsAt: Date, now: Date) {
  const weeks = Math.min(MAX_CATCH_UP, Math.ceil((now.getTime() - startsAt.getTime()) / WEEK) + 1);
  if (weeks <= 0) return [];
  return listRendezVous(weeklyRhythm(weekday), startsAt, weeks, { timeZone: TIME_ZONE }).filter((d) => d.getTime() <= now.getTime());
}

export const allowanceKey = (childId: string, due: Date) => `allowance:${childId}:${due.toISOString().slice(0, 10)}`;

/** Verse l'argent de poche dû depuis le dernier passage. Renvoie le nombre de versements faits. */
export async function applyAllowance(childId: string, now = new Date()) {
  const schedule = await prisma.allowanceSchedule.findUnique({ where: { childId } });
  if (!schedule || !schedule.active || schedule.amount <= 0) return 0;
  const due = allowanceDueDates(schedule.weekday, schedule.startsAt, now);
  if (due.length === 0) return 0;
  const wallet = await prisma.wallet.findUnique({ where: { childId } });
  if (!wallet) return 0;
  const keys = due.map((d) => allowanceKey(childId, d));
  const done = new Set((await prisma.walletTransaction.findMany({ where: { idempotencyKey: { in: keys } }, select: { idempotencyKey: true } })).map((t) => t.idempotencyKey));
  let paid = 0;
  for (const [i, date] of due.entries()) {
    if (done.has(keys[i])) continue;
    try {
      await prisma.$transaction((tx) =>
        recordWalletTransaction(tx, {
          walletId: wallet.id,
          amount: schedule.amount,
          type: "ALLOWANCE",
          actorId: schedule.updatedById ?? childId,
          idempotencyKey: keys[i],
          sourceType: "allowance",
          createdAt: date,
        })
      );
      paid++;
    } catch (err) {
      // Deux lectures simultanées : l'autre a déjà versé ce jour-là.
      if (!(err instanceof DuplicateTransactionError) && !(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  return paid;
}
