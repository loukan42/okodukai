import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("repère de prix boutique : moyenne hebdomadaire du foyer", () => {
  it("moyenne les quêtes et l'argent de poche des 4 dernières semaines, tous enfants confondus, jamais les cadeaux ni les transferts", async () => {
    const code = `test-${randomUUID()}`;
    let householdId: string | undefined;
    let userId: string | undefined;
    const server = createApp().listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const household = await prisma.household.create({ data: { name: code } });
      householdId = household.id;
      const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Parent test", passwordHash: "test" } });
      userId = user.id;
      await prisma.householdMembership.create({ data: { householdId, userId, role: "PARENT_ADMIN" } });
      const emma = await prisma.childProfile.create({ data: { householdId, displayName: "Emma test", ageBand: "AGE_8_9", avatarId: "test", pinHash: "test" } });
      const lucas = await prisma.childProfile.create({ data: { householdId, displayName: "Lucas test", ageBand: "AGE_10_12", avatarId: "test", pinHash: "test" } });
      const emmaWallet = await prisma.wallet.create({ data: { childId: emma.id } });
      const lucasWallet = await prisma.wallet.create({ data: { childId: lucas.id } });

      const recent = (amount: number, type: "QUEST_REWARD" | "ALLOWANCE" | "GIFT", walletId: string) =>
        prisma.walletTransaction.create({ data: { walletId, amount, type, actorId: userId!, idempotencyKey: `test:${randomUUID()}` } });
      const old = (amount: number, walletId: string) =>
        prisma.walletTransaction.create({ data: { walletId, amount, type: "QUEST_REWARD", actorId: userId!, idempotencyKey: `test:${randomUUID()}`, createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } });

      await recent(40, "QUEST_REWARD", emmaWallet.id);
      await recent(20, "ALLOWANCE", lucasWallet.id);
      await recent(1000, "GIFT", lucasWallet.id); // jamais compté : ce n'est ni une quête ni l'argent de poche.
      await old(500, emmaWallet.id); // hors fenêtre de 4 semaines.

      const parentCookie = `okodukai_session=${signSession({ kind: "parent", userId, householdId, role: "PARENT_ADMIN" })}`;
      const res = await fetch(`${base}/household/earnings-reference`, { headers: { cookie: parentCookie } });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { weeklyAverage: number };
      // (40 + 20) / 4 semaines = 15.
      expect(body.weeklyAverage).toBe(15);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (householdId) await prisma.household.delete({ where: { id: householdId } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
    }
  }, 15000);
});
