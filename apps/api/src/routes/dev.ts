import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../lib/auth.js";
import { validateBody } from "../lib/validation.js";
import { seedDatabase } from "../lib/devSeed.js";

/**
 * Routes réservées au développement local : connexion instantanée sur les comptes
 * de démonstration (sans mot de passe ni PIN) et réinitialisation du jeu de données.
 * Montées uniquement hors production — voir la garde dans app.ts.
 */
export const devRouter = Router();

devRouter.get("/dev/accounts", async (_req, res) => {
  const households = await prisma.household.findMany({
    include: {
      memberships: { include: { user: true } },
      children: true,
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    households: households.map((h) => ({
      id: h.id,
      name: h.name,
      parents: h.memberships.map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
      })),
      children: h.children.map((c) => ({
        childId: c.id,
        displayName: c.displayName,
        avatarId: c.avatarId,
        ageBand: c.ageBand,
      })),
    })),
  });
});

const loginAsParentSchema = z.object({ userId: z.string().uuid() });

devRouter.post("/dev/login-as-parent", validateBody(loginAsParentSchema), async (req, res) => {
  const membership = await prisma.householdMembership.findFirst({ where: { userId: req.body.userId } });
  if (!membership) return res.status(404).json({ error: "Utilisateur introuvable" });

  const token = signSession({
    kind: "parent",
    userId: membership.userId,
    householdId: membership.householdId,
    role: membership.role,
  });
  res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  res.json({ ok: true, householdId: membership.householdId });
});

const loginAsChildSchema = z.object({ childId: z.string().uuid() });

devRouter.post("/dev/login-as-child", validateBody(loginAsChildSchema), async (req, res) => {
  const child = await prisma.childProfile.findUnique({ where: { id: req.body.childId } });
  if (!child) return res.status(404).json({ error: "Profil introuvable" });

  const token = signSession({ kind: "child", childId: child.id, householdId: child.householdId });
  res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  res.json({ ok: true, householdId: child.householdId });
});

devRouter.post("/dev/reseed", async (_req, res) => {
  const result = await seedDatabase(prisma);
  res.json({
    ok: true,
    householdId: result.household.id,
    parents: [
      { email: result.sophie.email, displayName: result.sophie.displayName },
      { email: result.thomas.email, displayName: result.thomas.displayName },
    ],
  });
});
