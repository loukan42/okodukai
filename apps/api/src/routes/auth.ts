import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, signDevice, signSession, verifyDevice, verifyDeviceDetails, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../lib/auth.js";
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
import { locale, tr } from "../lib/i18n.js";
import { googleClientId, verifyGoogleCredential } from "../lib/googleSignIn.js";

export const authRouter = Router();
authRouter.use(attachSession);

const cookieOptions = SESSION_COOKIE_OPTIONS;
const googleCredentialSchema = z.object({ credential: z.string().min(100).max(10000) });

function googleRequest(req: import("express").Request): boolean {
  // Le jeton vient de notre fetch JSON sur la même origine. Un formulaire tiers ne
  // peut pas envoyer cet en-tête ; un fetch tiers serait arrêté par le preflight CORS.
  return req.header("x-requested-with") === "XMLHttpRequest";
}

/** Un parent connecté sur cet appareil en fait un appareil familial (profils enfants et PIN). */
function rememberDevice(res: import("express").Response, householdId: string, parentUserId?: string) {
  res.cookie(DEVICE_COOKIE, signDevice(householdId, parentUserId), DEVICE_COOKIE_OPTIONS);
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
    if (!existing.passwordLoginEnabled) return res.status(401).json({ error: "Ce compte utilise la connexion Google." });
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
    rememberDevice(res, membership.householdId, existing.id);
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
      // La langue choisie sur l'écran de création du compte devient celle de la famille.
      const household = await tx.household.create({ data: { name: tr("Ma famille", "My family"), locale: locale() } });
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
  rememberDevice(res, created.household.id, created.user.id);
  res.status(201).json({ outcome: "created", onboardingCompleted: false });
});

authRouter.get("/google/client", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ clientId: googleClientId() });
});

/** Connexion d'un compte Google déjà associé, ou création d'un nouveau foyer. */
authRouter.post("/google/continue", validateBody(googleCredentialSchema), async (req, res) => {
  if (!googleRequest(req)) return res.status(403).json({ error: "Requête Google non autorisée" });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const identity = await verifyGoogleCredential(req.body.credential);
  if (!identity) return res.status(401).json({ error: "Connexion Google invalide" });

  const linked = await prisma.user.findUnique({
    where: { googleSub: identity.sub },
    include: { memberships: { include: { household: true }, orderBy: { createdAt: "asc" } } },
  });
  if (linked) {
    const membership = linked.memberships[0];
    if (!membership) return res.status(403).json({ error: "Aucun foyer associé" });
    res.cookie(SESSION_COOKIE, signSession({ kind: "parent", userId: linked.id, householdId: membership.householdId, role: membership.role }), cookieOptions);
    rememberDevice(res, membership.householdId, linked.id);
    return res.json({ outcome: "signed_in", onboardingCompleted: Boolean(membership.household.onboardingCompletedAt) });
  }

  // Ne pas associer automatiquement un compte créé par mot de passe : son adresse
  // n'a jamais été vérifiée. Le parent le fait après s'être connecté à ce compte.
  const existing = await findUserByEmail(identity.email);
  if (existing) return res.status(409).json({ error: "Connectez-vous avec votre mot de passe, puis associez Google dans l'onglet Compte." });

  const passwordHash = await argon2.hash(randomBytes(32).toString("base64url"));
  const created = await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: { name: tr("Ma famille", "My family"), locale: locale() } });
    const user = await tx.user.create({ data: { email: identity.email, passwordHash, passwordLoginEnabled: false, googleSub: identity.sub, displayName: identity.name } });
    await tx.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
    const starterUniverse = await tx.universe.findFirst({
      where: { active: true, boosterDefinitions: { some: {} }, cards: { some: { active: true } } },
      orderBy: { sortOrder: "asc" },
    });
    if (starterUniverse) await tx.householdUniverse.create({ data: { householdId: household.id, universeId: starterUniverse.id } });
    await tx.auditLog.create({ data: { householdId: household.id, actorUserId: user.id, action: "household_created", targetType: "Household", targetId: household.id } });
    return { user, household };
  }).catch((err: unknown) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
    throw err;
  });
  if (!created) return res.status(409).json({ error: "Ce compte vient d'être créé. Réessayez de vous connecter." });

  res.cookie(SESSION_COOKIE, signSession({ kind: "parent", userId: created.user.id, householdId: created.household.id, role: "PARENT_ADMIN" }), cookieOptions);
  rememberDevice(res, created.household.id, created.user.id);
  return res.status(201).json({ outcome: "created", onboardingCompleted: false });
});

/** Association volontaire depuis une session parent du compte existant. */
authRouter.post("/google/link", validateBody(googleCredentialSchema), async (req, res) => {
  if (req.session?.kind !== "parent") return res.status(401).json({ error: "Authentification parent requise" });
  if (!googleRequest(req)) return res.status(403).json({ error: "Requête Google non autorisée" });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const identity = await verifyGoogleCredential(req.body.credential);
  if (!identity) return res.status(401).json({ error: "Connexion Google invalide" });
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(401).json({ error: "Non authentifié" });
  if (user.googleSub === identity.sub) return res.json({ linked: true });
  if (user.googleSub || user.email.toLowerCase() !== identity.email) {
    return res.status(409).json({ error: "Choisissez le compte Google avec la même adresse e-mail." });
  }
  try {
    const linked = await prisma.user.updateMany({ where: { id: user.id, googleSub: null }, data: { googleSub: identity.sub } });
    if (linked.count !== 1) return res.status(409).json({ error: "Un compte Google est déjà associé à ce compte." });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "Ce compte Google est déjà associé à un autre compte." });
    }
    throw err;
  }
  res.json({ linked: true });
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
    rememberDevice(res, req.session.householdId, req.session.userId);
    return res.json({
      kind: "parent",
      user: { id: user.id, email: user.email, displayName: user.displayName },
      householdId: req.session.householdId,
      household: { name: household.name, onboardingCompleted: Boolean(household.onboardingCompletedAt), locale: household.locale },
      role: req.session.role,
      isPlatformAdmin: user.isPlatformAdmin,
      hasGoogleLogin: Boolean(user.googleSub),
      hasPasswordLogin: user.passwordLoginEnabled,
      hasParentPin: Boolean(user.parentPinHash),
    });
  }

  const child = await prisma.childProfile.findUnique({ where: { id: req.session.childId }, include: { household: { select: { locale: true } } } });
  if (!child) return res.status(401).json({ error: "Non authentifié" });
  return res.json({
    kind: "child",
    child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId, ageBand: pedagogyBand(child) },
    householdId: req.session.householdId,
    // L'espace enfant suit la langue choisie par le parent (pas de choix de langue côté enfant).
    locale: child.household.locale,
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

const parentPinSchema = z.object({ password: z.string().min(1).optional(), credential: z.string().min(100).max(10000).optional(), pin: z.string().regex(/^\d{4}$/) });

/** Le parent définit son code sur une session parent, après vérification du mot de passe. */
authRouter.post("/parent-pin", validateBody(parentPinSchema), async (req, res) => {
  if (req.session?.kind !== "parent") return res.status(403).json({ error: "Accès parent requis" });
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(401).json({ error: "Non authentifié" });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const check = await throttledVerify(parentThrottleKey(user.email), PARENT_PASSWORD, async () => {
    if (req.body.credential && googleRequest(req) && user.googleSub) {
      const identity = await verifyGoogleCredential(req.body.credential);
      return identity?.sub === user.googleSub;
    }
    if (!req.body.password || !user.passwordLoginEnabled) return false;
    return argon2.verify(user.passwordHash, req.body.password);
  });
  if (!check.ok) {
    if (check.retryAfterMs) return tooManyParentAttempts(res, check.retryAfterMs);
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  await prisma.user.update({ where: { id: user.id }, data: { parentPinHash: await argon2.hash(req.body.pin) } });
  rememberDevice(res, req.session.householdId, user.id);
  res.json({ ok: true });
});

/** Téléphone partagé : la session parent choisit le profil sans saisir le PIN de l'enfant. */
authRouter.post("/switch-child/:childId", async (req, res) => {
  if (req.session?.kind !== "parent") return res.status(403).json({ error: "Accès parent requis" });
  const user = await prisma.user.findUnique({ where: { id: req.session.userId }, select: { parentPinHash: true } });
  if (!user?.parentPinHash) return res.status(409).json({ error: "Définissez d'abord votre code parent." });
  const child = await prisma.childProfile.findFirst({ where: { id: req.params.childId, householdId: req.session.householdId } });
  if (!child) return res.status(404).json({ error: "Profil introuvable" });
  rememberDevice(res, child.householdId, req.session.userId);
  res.cookie(SESSION_COOKIE, signSession({ kind: "child", childId: child.id, householdId: child.householdId }), cookieOptions);
  res.json({ child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId } });
});

const exitWithPinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

/** Seul l'appareil où ce parent s'est authentifié peut utiliser son code de retour. */
authRouter.post("/exit-child-mode/pin", validateBody(exitWithPinSchema), async (req, res) => {
  if (req.session?.kind !== "child") return res.status(403).json({ error: "Espace enfant requis" });
  const device = verifyDeviceDetails(req.cookies?.[DEVICE_COOKIE]);
  if (!device?.parentUserId || device.householdId !== req.session.householdId) return res.status(403).json({ error: "Connectez-vous avec le mot de passe parent sur cet appareil." });
  const membership = await prisma.householdMembership.findUnique({ where: { householdId_userId: { householdId: device.householdId, userId: device.parentUserId } } });
  const user = membership ? await prisma.user.findUnique({ where: { id: device.parentUserId } }) : null;
  if (!user?.parentPinHash) return res.status(403).json({ error: "Code parent indisponible" });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyPinAttempts(res, blocked);
  const check = await throttledVerify(`parent-pin:${user.id}`, CHILD_PIN, () => argon2.verify(user.parentPinHash!, req.body.pin));
  if (!check.ok) {
    if (check.retryAfterMs) return tooManyPinAttempts(res, check.retryAfterMs);
    return res.status(401).json({ error: "Code incorrect" });
  }
  res.cookie(SESSION_COOKIE, signSession({ kind: "parent", userId: user.id, householdId: membership!.householdId, role: membership!.role }), cookieOptions);
  res.json({ ok: true });
});

/** Retour parent sur l'appareil partagé avec son compte Google si le PIN est oublié. */
authRouter.post("/exit-child-mode/google", validateBody(googleCredentialSchema), async (req, res) => {
  if (req.session?.kind !== "child") return res.status(403).json({ error: "Espace enfant requis" });
  if (!googleRequest(req)) return res.status(403).json({ error: "Requête Google non autorisée" });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const identity = await verifyGoogleCredential(req.body.credential);
  if (!identity) return res.status(401).json({ error: "Connexion Google invalide" });
  const user = await prisma.user.findUnique({ where: { googleSub: identity.sub } });
  if (!user) return res.status(403).json({ error: "Aucun foyer associé" });
  const membership = await prisma.householdMembership.findUnique({
    where: { householdId_userId: { householdId: req.session.householdId, userId: user.id } },
  });
  if (!membership) return res.status(403).json({ error: "Aucun foyer associé" });
  res.cookie(SESSION_COOKIE, signSession({ kind: "parent", userId: user.id, householdId: membership.householdId, role: membership.role }), cookieOptions);
  rememberDevice(res, membership.householdId, user.id);
  res.json({ ok: true });
});

const inviteTtlMs = 24 * 60 * 60 * 1000;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Lien individuel, aléatoire, valable 24 h et utilisable une seule fois. */
authRouter.post("/child-link/create/:childId", async (req, res) => {
  if (req.session?.kind !== "parent") return res.status(403).json({ error: "Accès parent requis" });
  const child = await prisma.childProfile.findFirst({ where: { id: req.params.childId, householdId: req.session.householdId } });
  if (!child) return res.status(404).json({ error: "Profil introuvable" });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + inviteTtlMs);
  await prisma.childDeviceInvite.create({ data: { tokenHash: tokenHash(token), householdId: child.householdId, childId: child.id, createdById: req.session.userId, expiresAt } });
  res.status(201).json({ token, expiresAt: expiresAt.toISOString(), childName: child.displayName });
});

const inviteTokenSchema = z.string().regex(/^[\w-]{43}$/);
authRouter.get("/child-link/:token", async (req, res) => {
  if (!inviteTokenSchema.safeParse(req.params.token).success) return res.status(404).json({ error: "Lien invalide" });
  const invite = await prisma.childDeviceInvite.findUnique({ where: { tokenHash: tokenHash(req.params.token) }, include: { child: { select: { displayName: true, avatarId: true } } } });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return res.status(404).json({ error: "Ce lien a expiré ou a déjà été utilisé." });
  res.json({ childName: invite.child.displayName, avatarId: invite.child.avatarId });
});

const redeemInviteSchema = z.object({ token: inviteTokenSchema, pin: z.string().regex(/^\d{4}$/) });
authRouter.post("/child-link/redeem", validateBody(redeemInviteSchema), async (req, res) => {
  const invite = await prisma.childDeviceInvite.findUnique({ where: { tokenHash: tokenHash(req.body.token) }, include: { child: true } });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return res.status(404).json({ error: "Ce lien a expiré ou a déjà été utilisé." });
  const blocked = await addressLimit(req);
  if (blocked) return tooManyPinAttempts(res, blocked);
  const check = await throttledVerify(childPinThrottleKey(invite.childId), CHILD_PIN, () => argon2.verify(invite.child.pinHash, req.body.pin));
  if (!check.ok) {
    if (check.retryAfterMs) return tooManyPinAttempts(res, check.retryAfterMs);
    return res.status(401).json({ error: "Code incorrect" });
  }
  const consumed = await prisma.childDeviceInvite.updateMany({ where: { id: invite.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (consumed.count !== 1) return res.status(409).json({ error: "Ce lien a déjà été utilisé." });
  rememberDevice(res, invite.householdId);
  res.cookie(SESSION_COOKIE, signSession({ kind: "child", childId: invite.childId, householdId: invite.householdId }), cookieOptions);
  res.json({ child: { id: invite.childId, displayName: invite.child.displayName, avatarId: invite.child.avatarId } });
});

/** Le parent ressaisit son mot de passe pour repasser en mode administration. */
const exitChildModeSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

authRouter.post("/exit-child-mode", validateBody(exitChildModeSchema), async (req, res) => {
  const { email, password } = req.body;
  const blocked = await addressLimit(req);
  if (blocked) return tooManyFromAddress(res, blocked);
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Identifiants invalides" });
  if (!user.passwordLoginEnabled) return res.status(401).json({ error: "Ce compte utilise la connexion Google." });
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
  rememberDevice(res, membership.householdId, user.id);
  res.json({ ok: true });
});
