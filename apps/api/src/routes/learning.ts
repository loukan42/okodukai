import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { pedagogyBand } from "../lib/pedagogy.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { grantXp } from "../lib/xp.js";
import { normalizeContent, publicContent, type ModuleContent } from "../lib/learning.js";
import { moduleText } from "../lib/i18n/content.js";

/** Contenu d'un module dans la langue de la requête (la bonne réponse reste celle du module). */
function localizedContent(code: string, content: ModuleContent): ModuleContent {
  const text = moduleText(code);
  if (!text) return content;
  return {
    situation: text.situation,
    choice: text.choice,
    consequence: text.consequence,
    explanation: text.explanation,
    vocabulary: text.vocabulary,
    quiz: { ...content.quiz, question: text.quiz.question, options: text.quiz.options, explanation: text.quiz.explanation },
  };
}

export const learningRouter = Router();
learningRouter.use(attachSession);

learningRouter.get("/child/learning/modules", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });

  const modules = await prisma.learningModule.findMany({
    where: { active: true, OR: [{ ageBand: "ALL" }, { ageBand: pedagogyBand(child) }] },
    orderBy: { order: "asc" },
  });
  const progress = await prisma.learningProgress.findMany({ where: { childId } });
  const progressByModule = new Map(progress.map((p) => [p.moduleId, p]));

  res.json({
    modules: modules.map((m) => ({
      ...m,
      title: moduleText(m.code)?.title ?? m.title,
      subtitle: moduleText(m.code)?.subtitle ?? m.subtitle,
      content: publicContent(localizedContent(m.code, normalizeContent(m.code, m.content))),
      status: progressByModule.get(m.id)?.status ?? "NON_COMMENCE",
    })),
  });
});

// L'enfant envoie l'index de la proposition choisie ; le serveur décide si c'est juste.
const completeSchema = z.object({ choice: z.number().int().min(0).max(9) });

learningRouter.post(
  "/child/learning/modules/:id/complete",
  requireChild,
  validateBody(completeSchema),
  async (req, res) => {
    const childId = childSession(req).childId;
    const learningModule = await prisma.learningModule.findUnique({ where: { id: req.params.id } });
    if (!learningModule || !learningModule.active) return res.status(404).json({ error: "Module introuvable" });
    const { quiz } = localizedContent(learningModule.code, normalizeContent(learningModule.code, learningModule.content));
    const correct = req.body.choice === quiz.answerIndex;

    if (!correct) {
      await prisma.learningProgress.upsert({
        where: { childId_moduleId: { childId, moduleId: learningModule.id } },
        update: {},
        create: { childId, moduleId: learningModule.id, status: "EN_COURS" },
      });
      return res.json({ correct: false, explanation: quiz.explanation, xpAwarded: 0 });
    }

    const idempotencyKey = `learning:${childId}:${learningModule.id}`;
    const already = await prisma.learningProgress.findUnique({ where: { childId_moduleId: { childId, moduleId: learningModule.id } } });
    const granted = await prisma.$transaction(async (tx) => {
      await tx.learningProgress.upsert({
        where: { childId_moduleId: { childId, moduleId: learningModule.id } },
        update: { status: "TERMINE", completedAt: already?.completedAt ?? new Date() },
        create: { childId, moduleId: learningModule.id, status: "TERMINE", completedAt: new Date() },
      });
      return grantXp(tx, {
        childId,
        amount: learningModule.rewardXp,
        sourceType: "LEARNING_MODULE",
        sourceId: learningModule.id,
        idempotencyKey,
      });
    });

    // L'XP n'est accordée qu'une fois par module (clé d'idempotence) : `granted` est nul au rejeu.
    res.json({ correct: true, explanation: quiz.explanation, xpAwarded: granted ? learningModule.rewardXp : 0 });
  }
);
