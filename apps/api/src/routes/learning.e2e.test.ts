import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("modules pédagogiques : le serveur corrige", () => {
  it("ne révèle pas la réponse, refuse l'XP sur une mauvaise réponse et ne la donne qu'une fois", async () => {
    const code = `learn-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const module = await prisma.learningModule.create({
      data: {
        code,
        order: 999,
        title: "Module test",
        subtitle: "Test",
        rewardXp: 15,
        content: { situation: "S", choice: { a: "A", b: "B" }, consequence: "C", explanation: "E", vocabulary: "V", quiz: { question: "Q ?", options: ["Non", "Oui", "Peut-être"], answerIndex: 1, explanation: "Parce que." } },
      },
    });
    try {
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Tom", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };

      const list = (await (await fetch(`${base}/child/learning/modules`, { headers: kid })).json()) as { modules: { id: string; content: { quiz: Record<string, unknown> } }[] };
      const mine = list.modules.find((m) => m.id === module.id)!;
      expect(mine.content.quiz).toEqual({ question: "Q ?", options: ["Non", "Oui", "Peut-être"] });

      const answer = (choice: number) => fetch(`${base}/child/learning/modules/${module.id}/complete`, { method: "POST", headers: kid, body: JSON.stringify({ choice }) }).then((r) => r.json());
      // L'ancien client envoyait { correct: true } : ce n'est plus accepté.
      const forged = await fetch(`${base}/child/learning/modules/${module.id}/complete`, { method: "POST", headers: kid, body: JSON.stringify({ correct: true }) });
      expect(forged.status).toBe(400);

      expect(await answer(0)).toEqual({ correct: false, explanation: "Parce que.", xpAwarded: 0 });
      expect(await answer(1)).toEqual({ correct: true, explanation: "Parce que.", xpAwarded: 15 });
      expect(await answer(1)).toEqual({ correct: true, explanation: "Parce que.", xpAwarded: 0 });
      expect((await prisma.childProfile.findUniqueOrThrow({ where: { id: child.id } })).currentXp).toBe(15);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.learningModule.delete({ where: { id: module.id } });
    }
  });
});
