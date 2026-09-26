// Limitation des tentatives de connexion (mot de passe parent, PIN enfant). Les compteurs vivent en
// base et non en mémoire : l'API tourne en serverless (Vercel), chaque requête peut tomber sur une
// instance neuve. L'essai est compté *avant* la vérification, sous verrou de ligne : des requêtes
// lancées en parallèle ne peuvent pas dépasser le quota. Un succès efface le compteur.
import type { AuthThrottle } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "./prisma.js";

export interface ThrottleRule {
  /** Essais permis par fenêtre ; le dernier déclenche le blocage s'il échoue. */
  maxAttempts: number;
  windowMs: number;
  /** Durée du premier blocage, doublée à chaque blocage suivant jusqu'au plafond. */
  lockMs: number;
  maxLockMs: number;
}

const MINUTE = 60_000;

/** Compte parent (connexion et sortie du mode enfant partagent le même compteur). */
export const PARENT_PASSWORD: ThrottleRule = { maxAttempts: 10, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE, maxLockMs: 60 * MINUTE };
/** PIN enfant à 4 chiffres : peu d'essais, premier blocage court pour un enfant qui se trompe. */
export const CHILD_PIN: ThrottleRule = { maxAttempts: 5, windowMs: 15 * MINUTE, lockMs: 5 * MINUTE, maxLockMs: 60 * MINUTE };

/** Un jour après la fin du dernier blocage, les blocages passés sont oubliés. */
const LOCKOUT_MEMORY_MS = 24 * 60 * MINUTE;

/** Une adresse (via le relais signé) : les essais répartis sur beaucoup de comptes. Jamais remis à zéro par un succès. */
export const IP_AUTH: ThrottleRule = { maxAttempts: 30, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE, maxLockMs: 60 * MINUTE };

export const parentThrottleKey = (email: string) => `parent:${email.trim().toLowerCase()}`;
export const ipThrottleKey = (ip: string) => `ip:${ip}`;
export const childPinThrottleKey = (childId: string) => `child-pin:${childId}`;

type ThrottleState = Pick<AuthThrottle, "attempts" | "windowStartedAt" | "lockedUntil" | "lockouts">;

/** `lockedMs` : l'essai est permis, mais s'il échoue le compte est bloqué pour cette durée. */
export type AttemptOutcome = { allowed: true; lockedMs: number | null } | { allowed: false; retryAfterMs: number };

/** Règle pure (testée sans base) : fait passer le compteur d'un essai. */
export function registerAttempt(state: ThrottleState, rule: ThrottleRule, now: Date): { state: ThrottleState; outcome: AttemptOutcome } {
  const t = now.getTime();
  if (state.lockedUntil && state.lockedUntil.getTime() > t) {
    return { state, outcome: { allowed: false, retryAfterMs: state.lockedUntil.getTime() - t } };
  }
  let { attempts, windowStartedAt, lockouts } = state;
  let lockedUntil = state.lockedUntil;
  if (lockedUntil && t - lockedUntil.getTime() >= LOCKOUT_MEMORY_MS) lockouts = 0;
  if (t - windowStartedAt.getTime() >= rule.windowMs) {
    attempts = 0;
    windowStartedAt = now;
  }
  attempts += 1;
  if (attempts < rule.maxAttempts) {
    return { state: { attempts, windowStartedAt, lockedUntil, lockouts }, outcome: { allowed: true, lockedMs: null } };
  }
  // Dernier essai de la fenêtre : le blocage est posé tout de suite (un succès l'efface) et la
  // fenêtre suivante commence à sa fin.
  lockouts += 1;
  const lockedMs = Math.min(rule.lockMs * 2 ** (lockouts - 1), rule.maxLockMs);
  lockedUntil = new Date(t + lockedMs);
  return { state: { attempts: 0, windowStartedAt: lockedUntil, lockedUntil, lockouts }, outcome: { allowed: true, lockedMs } };
}

export async function takeAttempt(key: string, rule: ThrottleRule): Promise<AttemptOutcome> {
  return prisma.$transaction(async (tx) => {
    await tx.authThrottle.createMany({ data: [{ key }], skipDuplicates: true });
    await tx.$queryRaw`SELECT "key" FROM "AuthThrottle" WHERE "key" = ${key} FOR UPDATE`;
    const row = await tx.authThrottle.findUniqueOrThrow({ where: { key } });
    const { state, outcome } = registerAttempt(row, rule, new Date());
    if (outcome.allowed) await tx.authThrottle.update({ where: { key }, data: state });
    return outcome;
  });
}

/**
 * Vérifie un secret sous quota. En cas d'échec, `retryAfterMs` n'est renseigné que si le compte
 * est (ou vient d'être) bloqué : la route répond alors 429 au lieu de 401.
 */
export async function throttledVerify(
  key: string,
  rule: ThrottleRule,
  verify: () => Promise<boolean>
): Promise<{ ok: true } | { ok: false; retryAfterMs: number | null }> {
  const attempt = await takeAttempt(key, rule);
  if (!attempt.allowed) return { ok: false, retryAfterMs: attempt.retryAfterMs };
  if (!(await verify())) return { ok: false, retryAfterMs: attempt.lockedMs };
  await prisma.authThrottle.deleteMany({ where: { key } });
  return { ok: true };
}

function minutes(ms: number) {
  const n = Math.max(1, Math.ceil(ms / MINUTE));
  return `${n} minute${n > 1 ? "s" : ""}`;
}

export function tooManyParentAttempts(res: Response, retryAfterMs: number) {
  res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({ error: `Trop de tentatives pour ce compte. Réessayez dans ${minutes(retryAfterMs)}.` });
}

export function tooManyFromAddress(res: Response, retryAfterMs: number) {
  res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({ error: `Trop de tentatives depuis cet appareil. Réessayez dans ${minutes(retryAfterMs)}.` });
}

export function tooManyPinAttempts(res: Response, retryAfterMs: number) {
  res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({ error: `Trop d'essais pour l'instant. Tu pourras réessayer dans ${minutes(retryAfterMs)}.` });
}
