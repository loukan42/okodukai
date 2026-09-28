import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("objectifs d'épargne", () => {
  it("relie un objectif à une récompense du foyer (titre et prix du serveur) et le réordonne", async () => {
    const code = `goals-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const other = await prisma.household.create({ data: { name: `${code}-autre` } });
    try {
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      await prisma.wallet.create({ data: { childId: child.id } });
      const reward = await prisma.reward.create({ data: { householdId: household.id, title: "Sortie vélo", category: "EXPERIENCE", priceCoins: 40 } });
      const foreign = await prisma.reward.create({ data: { householdId: other.id, title: "Ailleurs", category: "OBJET", priceCoins: 5 } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      const create = (body: unknown) => fetch(`${base}/child/savings/goals`, { method: "POST", headers: kid, body: JSON.stringify(body) });
      const goals = async () => ((await (await fetch(`${base}/child/money`, { headers: kid })).json()) as { goals: { id: string; title: string; targetCoins: number; rewardId: string | null; illustrationKey: string | null }[] }).goals;

      expect((await create({ title: "Autre", targetCoins: 10, illustrationKey: "javascript:bad" })).status).toBe(400);
      expect((await create({ title: "x", targetCoins: 1, rewardId: foreign.id })).status).toBe(404);
      expect((await create({ title: "Pas le vrai titre", targetCoins: 1, rewardId: reward.id, illustrationKey: "book" })).status).toBe(201);
      expect((await create({ title: "Un livre", targetCoins: 25, illustrationKey: "book" })).status).toBe(201);
      let list = await goals();
      expect(list.map((g) => g.title)).toEqual(["Sortie vélo", "Un livre"]);
      expect(list[0]).toMatchObject({ targetCoins: 40, rewardId: reward.id, illustrationKey: null });
      expect(list[1].illustrationKey).toBe("book");

      const order = (goalIds: string[]) => fetch(`${base}/child/savings/goals/order`, { method: "POST", headers: kid, body: JSON.stringify({ goalIds }) });
      expect((await order([list[1].id])).status).toBe(400);
      expect((await order([list[1].id, list[0].id])).status).toBe(200);
      list = await goals();
      expect(list.map((g) => g.title)).toEqual(["Un livre", "Sortie vélo"]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.deleteMany({ where: { id: { in: [household.id, other.id] } } });
    }
  });
});
