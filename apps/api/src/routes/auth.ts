import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../lib/auth.js";
import { validateBody } from "../lib/validation.js";
import { attachSession } from "../middleware/requireAuth.js";

export const authRouter = Router();
authRouter.use(attachSession);

const cookieOptions = SESSION_COOKIE_OPTIONS;

const registerSchema = z.object({
  householdName: z.string().min(1).max(80),
  parentName: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const { householdName, parentName, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
  }

  const passwordHash = await argon2.hash(password);

  const { user, household } = await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: { name: householdName } });
    const user = await tx.user.create({
      data: { email, passwordHash, displayName: parentName },
    });
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
  });

  const token = signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.status(201).json({ user: { id: user.id, email: user.email, displayName: user.displayName }, household });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const membership = user.memberships[0];
  if (!membership) {
    return res.status(403).json({ error: "Aucun foyer associé à ce compte" });
  }

  const token = signSession({
    kind: "parent",
    userId: user.id,
    householdId: membership.householdId,
    role: membership.role,
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, householdId: membership.householdId });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.get("/me", async (req, res) => {
  if (!req.session) return res.status(401).json({ error: "Non authentifié" });

  if (req.session.kind === "parent") {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) return res.status(401).json({ error: "Non authentifié" });
    return res.json({
      kind: "parent",
      user: { id: user.id, email: user.email, displayName: user.displayName },
      householdId: req.session.householdId,
      role: req.session.role,
    });
  }

  const child = await prisma.childProfile.findUnique({ where: { id: req.session.childId } });
  if (!child) return res.status(401).json({ error: "Non authentifié" });
  return res.json({
    kind: "child",
    child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId, ageBand: child.ageBand },
    householdId: req.session.householdId,
  });
});

// -- Sélection de profil enfant sur l'appareil familial --------------------

authRouter.get("/households/:householdId/children", async (req, res) => {
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
    const child = await prisma.childProfile.findFirst({
      where: { id: req.params.childId, householdId: req.params.householdId },
    });
    if (!child) return res.status(404).json({ error: "Profil introuvable" });

    const valid = await argon2.verify(child.pinHash, req.body.pin);
    if (!valid) return res.status(401).json({ error: "Code incorrect" });

    const token = signSession({ kind: "child", childId: child.id, householdId: child.householdId });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.json({ child: { id: child.id, displayName: child.displayName, avatarId: child.avatarId } });
  }
);

/** Le parent ressaisit son mot de passe pour repasser en mode administration. */
const exitChildModeSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/exit-child-mode", validateBody(exitChildModeSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
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
  res.json({ ok: true });
});
