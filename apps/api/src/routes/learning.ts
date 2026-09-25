import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { attachSession, requireChild, childSession } from "../middleware/requireAuth.js";
import { grantXp } from "../lib/xp.js";

export const learningRouter = Router();
learningRouter.use(attachSession);

learningRouter.get("/child/learning/modules", requireChild, async (req, res) => {
  const childId = childSession(req).childId;
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });

  const modules = await prisma.learningModule.findMany({
    where: { active: true, OR: [{ ageBand: "ALL" }, { ageBand: child.ageBand }] },
    orderBy: { order: "asc" },
  });
  const progress = await prisma.learningProgress.findMany({ where: { childId } });
  const progressByModule = new Map(progress.map((p) => [p.moduleId, p]));

  res.json({
    modules: modules.map((m) => ({
      ...m,
      status: progressByModule.get(m.id)?.status ?? "NON_COMMENCE",
    })),
  });
});

const completeSchema = z.object({ correct: z.boolean() });

learningRouter.post(
  "/child/learning/modules/:id/complete",
  requireChild,
  validateBody(completeSchema),
  async (req, res) => {
    const childId = childSession(req).childId;
    const learningModule = await prisma.learningModule.findUnique({ where: { id: req.params.id } });
    if (!learningModule) return res.status(404).json({ error: "Module introuvable" });

    if (!req.body.correct) {
      await prisma.learningProgress.upsert({
        where: { childId_moduleId: { childId, moduleId: learningModule.id } },
        update: { status: "EN_COURS" },
        create: { childId, moduleId: learningModule.id, status: "EN_COURS" },
      });
      return res.json({ status: "EN_COURS", xpAwarded: 0 });
    }

    const idempotencyKey = `learning:${childId}:${learningModule.id}`;
    const result = await prisma.$transaction(async (tx) => {
      await tx.learningProgress.upsert({
        where: { childId_moduleId: { childId, moduleId: learningModule.id } },
        update: { status: "TERMINE", completedAt: new Date() },
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

    res.json({ status: "TERMINE", xpAwarded: result?.leveledUp !== undefined ? learningModule.rewardXp : 0 });
  }
);
