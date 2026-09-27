import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireParent, requireChild, childSession, parentSession } from "../middleware/requireAuth.js";
import { recordWalletTransaction } from "../lib/ledger.js";
import { grantXp } from "../lib/xp.js";
import { checkAndAwardBadges } from "../lib/badges.js";

export const questsRouter = Router();
questsRouter.use(attachSession);

// ---------------------------------------------------------------------------
// Parent : création / gestion des quêtes
// ---------------------------------------------------------------------------

// L'XP d'une quête suit sa difficulté ; le parent ne saisit jamais la valeur (spec : plafond serveur).
const XP_BY_DIFFICULTY: Record<"FACILE" | "MOYENNE" | "IMPORTANTE" | "EXCEPTIONNELLE", number> = {
  FACILE: 10,
  MOYENNE: 15,
  IMPORTANTE: 25,
  EXCEPTIONNELLE: 40,
};

const createQuestSchema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  category: z.enum(["MAISON", "AUTONOMIE", "APPRENTISSAGE", "ENTRAIDE", "CREATIVITE", "ECOLE", "JARDIN", "ANIMAUX"]),
  difficulty: z.enum(["FACILE", "MOYENNE", "IMPORTANTE", "EXCEPTIONNELLE"]).default("FACILE"),
  rewardCoins: z.number().int().min(0).default(0),
  boosterDefinitionId: z.string().uuid().optional(),
  recurrence: z.enum(["UNIQUE", "QUOTIDIENNE", "HEBDOMADAIRE"]).default("UNIQUE"),
  dueAt: z.string().datetime().optional(),
  validationRequired: z.boolean().default(true),
});

questsRouter.post("/quests", requireParent, validateBody(createQuestSchema), async (req, res) => {
  const householdId = req.session!.householdId;
  const child = await prisma.childProfile.findUnique({ where: { id: req.body.childId } });
  if (!child || child.householdId !== householdId) {
    return res.status(404).json({ error: "Enfant introuvable dans ce foyer" });
  }
  if (req.body.boosterDefinitionId) {
    const definition = await prisma.boosterDefinition.findFirst({
      where: { id: req.body.boosterDefinitionId, universe: { active: true, householdGrants: { some: { householdId } } } },
    });
    if (!definition) return res.status(400).json({ error: "Booster indisponible pour ce foyer" });
  }

  const quest = await prisma.quest.create({
    data: {
      householdId,
      creatorId: parentSession(req).userId,
      childId: req.body.childId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      difficulty: req.body.difficulty,
      rewardCoins: req.body.rewardCoins,
      rewardXp: XP_BY_DIFFICULTY[req.body.difficulty as keyof typeof XP_BY_DIFFICULTY],
      boosterDefinitionId: req.body.boosterDefinitionId,
      recurrence: req.body.recurrence,
      dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
      validationRequired: req.body.validationRequired,
      status: "DISPONIBLE",
    },
  });

  res.status(201).json({ quest });
});

questsRouter.get("/quests", requireParent, async (req, res) => {
  const householdId = req.session!.householdId;
  const quests = await prisma.quest.findMany({
    where: { householdId, active: true },
    include: { child: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ quests });
});

questsRouter.patch("/quests/:id", requireParent, async (req, res) => {
  const householdId = req.session!.householdId;
  const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
  if (!quest || quest.householdId !== householdId) return res.status(404).json({ error: "Quête introuvable" });

  const updateSchema = createQuestSchema.partial().extend({ active: z.boolean().optional() });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Requête invalide" });
  if (parsed.data.boosterDefinitionId) {
    const definition = await prisma.boosterDefinition.findFirst({
      where: { id: parsed.data.boosterDefinitionId, universe: { active: true, householdGrants: { some: { householdId } } } },
    });
    if (!definition) return res.status(400).json({ error: "Booster indisponible pour ce foyer" });
  }

  const updated = await prisma.quest.update({
    where: { id: quest.id },
    data: {
      ...parsed.data,
      ...(parsed.data.difficulty ? { rewardXp: XP_BY_DIFFICULTY[parsed.data.difficulty] } : {}),
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
    },
  });
  res.json({ quest: updated });
});

const reviewSchema = z.object({
  decision: z.enum(["VALIDEE", "A_REFAIRE", "REFUSEE"]),
  note: z.string().max(300).optional(),
});

questsRouter.post(
  "/quest-completions/:id/review",
  requireParent,
  validateBody(reviewSchema),
  async (req, res, next) => {
    const householdId = req.session!.householdId;
    const completion = await prisma.questCompletion.findUnique({
      where: { id: req.params.id },
      include: { quest: true, child: { include: { wallet: true } } },
    });

    if (!completion || completion.quest.householdId !== householdId) {
      return res.status(404).json({ error: "Déclaration introuvable" });
    }
    if (completion.status !== "EN_ATTENTE") {
      return res.status(409).json({ error: "Cette déclaration a déjà été traitée" });
    }

    // Un booster toutes les trois quêtes validées (audit du 27/09 : un par quête
    // épuisait la collection en ~2 mois). Une quête peut demander un univers précis ;
    // sinon on tourne parmi les univers activés par le foyer.
    let boosterDefinitionId: string | undefined;
    let grantsBooster = false;
    if (req.body.decision === "VALIDEE") {
      const validatedCount = await prisma.questCompletion.count({ where: { childId: completion.childId, status: "VALIDEE" } });
      grantsBooster = (validatedCount + 1) % 3 === 0;
      if (grantsBooster) {
        const definitions = await prisma.boosterDefinition.findMany({
          where: { universe: { active: true, householdGrants: { some: { householdId } }, cards: { some: { active: true } } } },
          orderBy: { code: "asc" },
          select: { id: true },
        });
        if (definitions.length === 0) {
          return res.status(409).json({ error: "Activez un univers de cartes avant de valider cette quête." });
        }
        const earnedPacks = await prisma.boosterInstance.count({ where: { childId: completion.childId, sourceType: "quest_reward" } });
        boosterDefinitionId = definitions.some((definition) => definition.id === completion.quest.boosterDefinitionId)
          ? completion.quest.boosterDefinitionId!
          : definitions[earnedPacks % definitions.length].id;
      }
    }

    try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.questCompletion.updateMany({
        where: { id: completion.id, status: "EN_ATTENTE" },
        data: {
          status: req.body.decision,
          reviewedAt: new Date(),
          reviewedById: parentSession(req).userId,
          note: req.body.note,
        },
      });
      if (claimed.count !== 1) throw new Error("QUEST_ALREADY_REVIEWED");
      const updatedCompletion = await tx.questCompletion.findUniqueOrThrow({ where: { id: completion.id } });

      let newQuestStatus = completion.quest.status;
      if (req.body.decision === "VALIDEE") {
        newQuestStatus = "VALIDEE";

        if (completion.quest.rewardCoins > 0 && completion.child.wallet) {
          await recordWalletTransaction(tx, {
            walletId: completion.child.wallet.id,
            amount: completion.quest.rewardCoins,
            type: "QUEST_REWARD",
            actorId: parentSession(req).userId,
            idempotencyKey: `quest-completion:${completion.id}:coins`,
            sourceType: "quest_completion",
            sourceId: completion.id,
          });
        }

        if (completion.quest.rewardXp > 0) {
          await grantXp(tx, {
            childId: completion.childId,
            amount: completion.quest.rewardXp,
            sourceType: "QUEST",
            sourceId: completion.id,
            idempotencyKey: `quest-completion:${completion.id}:xp`,
          });
        }

        if (grantsBooster) {
          await tx.boosterInstance.create({
            data: {
              childId: completion.childId,
              definitionId: boosterDefinitionId!,
              sourceType: "quest_reward",
              sourceId: completion.id,
            },
          });
        }

        if (completion.quest.recurrence === "UNIQUE") {
          await tx.quest.update({ where: { id: completion.quest.id }, data: { active: false } });
        } else {
          await tx.quest.update({ where: { id: completion.quest.id }, data: { status: "DISPONIBLE" } });
        }

        await checkAndAwardBadges(tx, completion.childId, householdId);
      } else if (req.body.decision === "A_REFAIRE") {
        newQuestStatus = "A_REFAIRE";
        await tx.quest.update({ where: { id: completion.quest.id }, data: { status: "A_REFAIRE" } });
      } else {
        newQuestStatus = "REFUSEE";
        await tx.quest.update({ where: { id: completion.quest.id }, data: { status: "DISPONIBLE" } });
      }

      await tx.notification.create({
        data: {
          householdId,
          audience: "CHILD",
          childId: completion.childId,
          type: `quest_${req.body.decision.toLowerCase()}`,
          // Montants repris tels que crédités : l'écran de fête de l'enfant les affiche sans rien recalculer.
          payload: {
            questId: completion.quest.id,
            questTitle: completion.quest.title,
            ...(req.body.decision === "VALIDEE"
              ? { rewardCoins: completion.quest.rewardCoins, rewardXp: completion.quest.rewardXp, boosters: grantsBooster ? 1 : 0 }
              : {}),
          },
        },
      });

      return { completion: updatedCompletion, questStatus: newQuestStatus };
    });

    res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "QUEST_ALREADY_REVIEWED") {
        return res.status(409).json({ error: "Cette déclaration a déjà été traitée" });
      }
      return next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Enfant : consulter / accepter / déclarer terminé
// ---------------------------------------------------------------------------

questsRouter.get("/child/quests", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const quests = await prisma.quest.findMany({
    where: { childId, active: true },
    orderBy: { createdAt: "desc" },
    include: {
      completions: { where: { status: "EN_ATTENTE" }, take: 1 },
    },
  });
  res.json({ quests });
});

questsRouter.post("/child/quests/:id/accept", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
  if (!quest || quest.childId !== childId) return res.status(404).json({ error: "Quête introuvable" });
  if (quest.status !== "DISPONIBLE" && quest.status !== "A_REFAIRE") {
    return res.status(409).json({ error: "Cette quête n'est pas disponible" });
  }

  const updated = await prisma.quest.update({ where: { id: quest.id }, data: { status: "ACCEPTEE" } });
  res.json({ quest: updated });
});

questsRouter.post("/child/quests/:id/complete", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
  if (!quest || quest.childId !== childId) return res.status(404).json({ error: "Quête introuvable" });
  if (quest.status !== "ACCEPTEE" && quest.status !== "EN_COURS") {
    return res.status(409).json({ error: "Cette quête doit d'abord être acceptée" });
  }

  const existingPending = await prisma.questCompletion.findFirst({
    where: { questId: quest.id, status: "EN_ATTENTE" },
  });
  if (existingPending) {
    return res.status(409).json({ error: "Une déclaration est déjà en attente de validation" });
  }

  const [completion] = await prisma.$transaction([
    prisma.questCompletion.create({ data: { questId: quest.id, childId } }),
    prisma.quest.update({ where: { id: quest.id }, data: { status: "EN_ATTENTE_VALIDATION" } }),
    prisma.notification.create({
      data: {
        householdId: quest.householdId,
        audience: "PARENT",
        type: "quest_completed",
        payload: { questId: quest.id, questTitle: quest.title, childId },
      },
    }),
  ]);

  res.status(201).json({ completion });
});
