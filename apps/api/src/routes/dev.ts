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

const grantBoostersSchema = z.object({ childId: z.string().uuid(), count: z.number().int().min(1).max(10) });

/** Donne des boosters à un enfant de démo (un univers activé du foyer au hasard) pour rejouer l'ouverture. */
devRouter.post("/dev/grant-boosters", validateBody(grantBoostersSchema), async (req, res) => {
  const child = await prisma.childProfile.findUnique({ where: { id: req.body.childId } });
  if (!child) return res.status(404).json({ error: "Profil introuvable" });
  const definitions = await prisma.boosterDefinition.findMany({
    where: { universe: { active: true, householdGrants: { some: { householdId: child.householdId } }, cards: { some: { active: true } } } },
  });
  if (definitions.length === 0) return res.status(409).json({ error: "Aucun univers activé pour ce foyer." });
  await prisma.boosterInstance.createMany({
    data: Array.from({ length: req.body.count }, () => ({
      childId: child.id,
      definitionId: definitions[Math.floor(Math.random() * definitions.length)].id,
      sourceType: "dev",
    })),
  });
  res.status(201).json({ ok: true });
});

/** Cartes réelles d'une rareté donnée, pour prévisualiser l'animation d'ouverture sans rien créditer. */
devRouter.get("/dev/sample-cards", async (req, res) => {
  const rarity = z.enum(["COMMUNE", "PEU_COMMUNE", "RARE", "EPIQUE", "LEGENDAIRE"]).safeParse(req.query.rarity);
  if (!rarity.success) return res.status(400).json({ error: "Rareté inconnue" });
  const [best, fillers] = await Promise.all([
    prisma.card.findMany({ where: { active: true, rarity: rarity.data, artworkUrl: { not: null } }, take: 40 }),
    prisma.card.findMany({ where: { active: true, rarity: { in: ["COMMUNE", "PEU_COMMUNE"] }, artworkUrl: { not: null } }, take: 40 }),
  ]);
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  if (best.length === 0) return res.status(404).json({ error: "Aucune carte de cette rareté" });
  const cards = [...Array.from({ length: 4 }, () => pick(fillers)).filter(Boolean), pick(best)];
  res.json({ cards: cards.map((card, index) => ({ ...card, isNew: index % 2 === 0 })) });
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
