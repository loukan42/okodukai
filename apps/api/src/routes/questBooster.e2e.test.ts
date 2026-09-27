import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("quest booster journey", () => {
  it("grants one unopened pack every third validated quest and opens it once", async () => {
    const code = `test-${randomUUID()}`;
    let householdId: string | undefined;
    let userId: string | undefined;
    let universeId: string | undefined;
    const server = createApp().listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const household = await prisma.household.create({ data: { name: code } });
      householdId = household.id;
      const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Parent test", passwordHash: "test" } });
      userId = user.id;
      await prisma.householdMembership.create({ data: { householdId, userId, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId, displayName: "Enfant test", ageBand: "AGE_8_9", avatarId: "test", pinHash: "test" } });
      await prisma.wallet.create({ data: { childId: child.id } });
      const universe = await prisma.universe.create({ data: { code, title: "Univers test" } });
      universeId = universe.id;
      await prisma.householdUniverse.create({ data: { householdId, universeId } });
      await prisma.card.create({ data: { universeId, cardNumber: 1, name: "Carte test", rarity: "COMMUNE" } });
      await prisma.boosterDefinition.create({ data: { universeId, code: `booster-${code}`, title: "Booster test", cardCount: 1, slotConfig: { slots: [{ weights: { COMMUNE: 100 } }] } } });
      const parentCookie = `okodukai_session=${signSession({ kind: "parent", userId, householdId, role: "PARENT_ADMIN" })}`;
      const childCookie = `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId })}`;

      let lastCompletionId = "";
      for (let i = 0; i < 3; i += 1) {
        const quest = await prisma.quest.create({ data: { householdId, creatorId: userId, childId: child.id, title: `Quête test ${i}`, category: "MAISON", rewardCoins: 3, rewardXp: 4, status: "EN_ATTENTE_VALIDATION" } });
        const completion = await prisma.questCompletion.create({ data: { questId: quest.id, childId: child.id } });
        lastCompletionId = completion.id;
        const review = await fetch(`${base}/quest-completions/${completion.id}/review`, { method: "POST", headers: { cookie: parentCookie, "content-type": "application/json" }, body: JSON.stringify({ decision: "VALIDEE" }) });
        expect(review.status).toBe(200);
        const boosterCountSoFar = await prisma.boosterInstance.count({ where: { childId: child.id } });
        expect(boosterCountSoFar).toBe(i === 2 ? 1 : 0);
      }
      const repeatReview = await fetch(`${base}/quest-completions/${lastCompletionId}/review`, { method: "POST", headers: { cookie: parentCookie, "content-type": "application/json" }, body: JSON.stringify({ decision: "VALIDEE" }) });
      expect(repeatReview.status).toBe(409);

      const inventory = await fetch(`${base}/child/boosters`, { headers: { cookie: childCookie } });
      const { boosters } = await inventory.json() as { boosters: { id: string }[] };
      expect(boosters).toHaveLength(1);
      const firstOpen = await fetch(`${base}/child/boosters/${boosters[0].id}/open`, { method: "POST", headers: { cookie: childCookie } });
      expect(firstOpen.status).toBe(200);
      const firstResult = await firstOpen.json() as { cards: { name: string }[]; alreadyOpened: boolean };
      expect(firstResult).toMatchObject({ alreadyOpened: false, cards: [{ name: "Carte test", isNew: true }] });
      const secondOpen = await fetch(`${base}/child/boosters/${boosters[0].id}/open`, { method: "POST", headers: { cookie: childCookie } });
      expect(secondOpen.status).toBe(200);
      expect(await secondOpen.json()).toMatchObject({ alreadyOpened: true, cards: [{ name: "Carte test", isNew: true }] });
      expect(await prisma.childCard.count({ where: { childId: child.id } })).toBe(1);
      expect(await prisma.boosterInstance.count({ where: { childId: child.id } })).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (householdId) await prisma.household.delete({ where: { id: householdId } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
      if (universeId) await prisma.universe.delete({ where: { id: universeId } });
    }
  }, 15000);
});
