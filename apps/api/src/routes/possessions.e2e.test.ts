import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("Mon mois en pièces et Tout ce que je possède", () => {
  it("résume le mois écoulé une seule fois et garde deux totaux séparés", async () => {
    const code = `possessions-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    try {
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Inès", ageBand: "AGE_10_12", avatarId: "aventurier-02", pinHash: "test" } });
      const young = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Tom", ageBand: "AGE_8_9", avatarId: "aventurier-03", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      const lastMonth = new Date(Date.now() - 40 * 86_400_000);
      await prisma.walletTransaction.createMany({
        data: [
          { walletId: wallet.id, amount: 30, type: "QUEST_REWARD", actorId: child.id, idempotencyKey: `${code}-1`, createdAt: lastMonth },
          { walletId: wallet.id, amount: 10, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-2`, createdAt: lastMonth },
          { walletId: wallet.id, amount: 1, type: "PARENT_BONUS", actorId: child.id, idempotencyKey: `${code}-3` },
        ],
      });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}` };

      // Le mois « il y a 40 jours » est au moins le mois précédent ; s'il est plus ancien, pas de volet.
      const month = (await (await fetch(`${base}/child/money/month-summary`, { headers: kid })).json()) as { summary: null | { text: string } };
      if (month.summary) {
        expect(month.summary.text).toMatch(/tu as reçu 30 pièces, dépensé 0 pièce et mis 10 pièces dans ton coffre\.$/);
        expect(((await (await fetch(`${base}/child/money/month-summary`, { headers: kid })).json()) as { summary: unknown }).summary).toBeNull();
      }

      const mine = (await (await fetch(`${base}/child/invest/possessions`, { headers: kid })).json()) as { coins: { account: number; vault: number; investments: number | null; total: number }; units: { investments: number | null; total: number }; xpAwarded: number };
      expect(mine.coins).toEqual({ account: 21, vault: 10, investments: null, total: 31 });
      expect(mine.units).toMatchObject({ investments: null, total: 0 });
      expect(mine).not.toHaveProperty("total");
      expect(mine.xpAwarded).toBe(5);
      const tom = { cookie: `okodukai_session=${signSession({ kind: "child", childId: young.id, householdId: household.id })}` };
      expect((await fetch(`${base}/child/invest/possessions`, { headers: tom })).status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
    }
  });
});
