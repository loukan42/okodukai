import { Router } from "express";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, signDevice, signSession, verifyDevice, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../lib/auth.js";
import { validateBody } from "../lib/validation.js";
import { signedClientIp } from "../lib/clientIp.js";
import {
  CHILD_PIN,
  IP_AUTH,
  ipThrottleKey,
  takeAttempt,
  tooManyFromAddress,
  PARENT_PASSWORD,
  childPinThrottleKey,
  parentThrottleKey,
  throttledVerify,
  tooManyParentAttempts,
  tooManyPinAttempts,
} from "../lib/throttle.js";
import { attachSession } from "../middleware/requireAuth.js";

export const authRouter = Router();
authRouter.use(attachSession);

const cookieOptions = SESSION_COOKIE_OPTIONS;

/** Un parent connecté sur cet appareil en fait un appareil familial (profils enfants et PIN). */
function rememberDevice(res: import("express").Response, householdId: string) {
  res.cookie(DEVICE_COOKIE, signDevice(householdId), DEVICE_COOKIE_OPTIONS);
}
/**
 * Limite par adresse (seulement derrière le relais signé) : chaque essai compte, succès compris,
 * pour que des essais répartis sur beaucoup de comptes ou de PIN restent bornés. `null` : on continue.
 */
async function addressLimit(req: import("express").Request) {
  const ip = signedClientIp(req);
  if (!ip) return null;
  const attempt = await takeAttempt(ipThrottleKey(ip), IP_AUTH);
  return attempt.allowed ? null : attempt.retryAfterMs;
}

const DEVICE_REQUIRED = "Un parent doit d'abord se connecter sur cet appareil.";

/** Les comptes créés avant la normalisation peuvent contenir des majuscules : recherche insensible à la casse. */
function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { memberships: { include: { household: true }, orderBy: { createdAt: "asc" } } },
  });
}

const continueSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

/**
 * Point d'entrée unique « Créer un compte ou se connecter » : si l'email existe, on
 * vérifie le mot de passe et on connecte ; sinon on crée le compte et un foyer
 * provisoire (« Ma famille »), personnalisé ensuite pendant l'accueil.
 * Contrepartie assumée : la réponse révèle si un email a déjà un compte.
 */
authRouter.post("/continue", validateBody(continueSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof continueSchema>;
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const existing = await findUserByEmail(email);

  if (existing) {
    const check = await throttledVerify(parentThrottleKey(email), PARENT_PASSWORD, () => argon2.verify(existing.passwordHash, password));
    if (!check.ok) {
      if (check.retryAfterMs) return tooManyParentAttempts(res, check.retryAfterMs);
      return res.status(401).json({ error: "Ce mot de passe ne correspond pas à ce compte." });
    }
    const membership = existing.memberships[0];
    if (!membership) {
      return res.status(403).json({ error: "Aucun foyer n'est associé à ce compte." });
    }
    const token = signSession({ kind: "parent", userId: existing.id, householdId: membership.householdId, role: membership.role });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    rememberDevice(res, membership.householdId);
    return res.json({ outcome: "signed_in", onboardingCompleted: Boolean(membership.household.onboardingCompletedAt) });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Pour créer votre compte, choisissez un mot de passe d'au moins 8 caractères." });
  }

  const passwordHash = await argon2.hash(password);
  const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const displayName = localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1, 40) : "Parent";

  const created = await prisma
    .$transaction(async (tx) => {
      const household = await tx.household.create({ data: { name: "Ma famille" } });
      const user = await tx.user.create({ data: { email, passwordHash, displayName } });
      await tx.householdMembership.create({
        data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" },
      });
      const starterUniverse = await tx.universe.findFirst({
        where: { active: true, boosterDefinitions: { some: {} }, cards: { some: { active: true } } },
        orderBy: { sortOrder: "asc" },
      });
      if (starterUniverse) {
        await tx.householdUniverse.create({ data: { householdId: household.id, universeId: starterUniverse.id } });
      }
      await tx.auditLog.create({
        data: {
          householdId: household.id,
          actorUserId: user.id,
          action: "household_created",
          targetType: "Household",
          targetId: household.id,
        },
      });
      return { user, household };
    })
    .catch((err: unknown) => {
      // Deux envois simultanés du même email : le second tombe sur la contrainte d'unicité.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
      throw err;
    });

  if (!created) {
    return res.status(409).json({ error: "Ce compte vient d'être créé. Réessayez de vous connecter." });
  }

  const token = signSession({ kind: "parent", userId: created.user.id, householdId: created.household.id, role: "PARENT_ADMIN" });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  rememberDevice(res, created.household.id);
  res.status(201).json({ outcome: "created", onboardingCompleted: false });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure });
  res.status(204).end();
});

authRouter.get("/me", async (req, res) => {
  if (!req.session) return res.status(401).json({ error: "Non authentifié" });

  if (req.session.kind === "parent") {
    const [user, household] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.session.userId } }),
      prisma.household.findUnique({ where: { id: req.session.householdId } }),
    ]);
    if (!user || !household) return res.status(401).json({ error: "Non authentifié" });
    // Un parent déjà connecté (avant l'arrivée de ce cookie) rend l'appareil familial sans rien refaire.
    rememberDevice(res, req.session.householdId);
    return res.json({
      kind: "parent",
      user: { id: user.id, email: user.email, displayName: user.displayName },
      householdId: req.session.householdId,
      household: { name: household.name, onboardingCompleted: Boolean(household.onboardingCompletedAt) },
      role: req.session.role,
    });
  }

  const child = await prisma.childProfile.findUnique({ where: { id: req.session.childId } });
  if (!child) return res.status(401).json({ error: "Non authentifié" });
  return res.json({
    kind: "child",
    child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId, ageBand: pedagogyBand(child) },
    householdId: req.session.householdId,
  });
});

// -- Sélection de profil enfant sur l'appareil familial --------------------

authRouter.get("/households/:householdId/children", async (req, res) => {
  if (verifyDevice(req.cookies?.[DEVICE_COOKIE]) !== req.params.householdId) return res.status(403).json({ error: DEVICE_REQUIRED });
  const children = await prisma.childProfile.findMany({
    where: { householdId: req.params.householdId },
    select: { id: true, displayName: true, avatarId: true, ageBand: true },
  });
  res.json({ children });
});

const childLoginSchema = z.object({ pin: z.string().length(4) });

authRouter.post(
  "/households/:householdId/children/:childId/login",
  validateBody(childLoginSchema),
  async (req, res) => {
    if (verifyDevice(req.cookies?.[DEVICE_COOKIE]) !== req.params.householdId) return res.status(403).json({ error: DEVICE_REQUIRED });
    const blocked = await addressLimit(req);
    if (blocked) return tooManyPinAttempts(res, blocked);
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, householdId: req.params.householdId },
    });
    if (!child) return res.status(404).json({ error: "Profil introuvable" });

    const check = await throttledVerify(childPinThrottleKey(child.id), CHILD_PIN, () => argon2.verify(child.pinHash, req.body.pin));
    if (!check.ok) {
      if (check.retryAfterMs) return tooManyPinAttempts(res, check.retryAfterMs);
      return res.status(401).json({ error: "Code incorrect" });
    }

    const token = signSession({ kind: "child", childId: child.id, householdId: child.householdId });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.json({ child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId } });
  }
);

/** Le parent ressaisit son mot de passe pour repasser en mode administration. */
const exitChildModeSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

authRouter.post("/exit-child-mode", validateBody(exitChildModeSchema), async (req, res) => {
  const { email, password } = req.body;
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });
  // Même compteur que la connexion : l'enfant sur l'appareil ne peut pas deviner le mot de passe.
  const check = await throttledVerify(parentThrottleKey(email), PARENT_PASSWORD, () => argon2.verify(user.passwordHash, password));
  if (!check.ok) {
    if (check.retryAfterMs) return tooManyParentAttempts(res, check.retryAfterMs);
    return res.status(401).json({ error: "Identifiants invalides" });
  }
  const membership = user.memberships[0];
  if (!membership) return res.status(403).json({ error: "Aucun foyer associé" });

  const token = signSession({
    kind: "parent",
    userId: user.id,
    householdId: membership.householdId,
    role: membership.role,
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  rememberDevice(res, membership.householdId);
  res.json({ ok: true });
});
