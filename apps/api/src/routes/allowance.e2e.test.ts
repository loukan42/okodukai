import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";
import { allowanceDueDates } from "../lib/allowance.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe("argent de poche : dates dues", () => {
  it("tombe le jour choisi à 8 h, heure de Paris, jamais avant le réglage", () => {
    // Mercredi 23 septembre 2026, 10 h à Paris ; réglage « lundi ».
    const startsAt = new Date("2026-09-23T08:00:00Z");
    const due = allowanceDueDates(1, startsAt, new Date("2026-10-06T12:00:00Z"));
    expect(due.map((d) => d.toISOString())).toEqual(["2026-09-28T06:00:00.000Z", "2026-10-05T06:00:00.000Z"]);
    expect(allowanceDueDates(1, startsAt, new Date("2026-09-27T12:00:00Z"))).toEqual([]);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("argent de poche et cadeaux", () => {
  it("rattrape les semaines dues sans doublon et range les cadeaux à part", async () => {
    const code = `allowance-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Papa", passwordHash: "test" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Zoé", ageBand: "AGE_8_9", avatarId: "aventurier-02", pinHash: "test" } });
      await prisma.wallet.create({ data: { childId: child.id } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}` };
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      const money = async () => (await (await fetch(`${base}/child/money`, { headers: kid })).json()) as { balances: { available: number }; recent: { label: string; amount: number }[] };

      expect((await fetch(`${base}/household/children/${child.id}/allowance`, { method: "PUT", headers: parent, body: JSON.stringify({ amount: 5, weekday: 3, active: true }) })).status).toBe(200);
      expect((await money()).balances.available).toBe(0);
      // Trois semaines plus tôt : trois mercredis sont passés (ou deux, selon l'heure) ; jamais de doublon.
      await prisma.allowanceSchedule.update({ where: { childId: child.id }, data: { startsAt: new Date(Date.now() - 21 * 86_400_000) } });
      const first = (await money()).balances.available;
      expect([10, 15]).toContain(first);
      expect((await money()).balances.available).toBe(first);
      expect((await money()).recent[0].label).toBe("Argent de poche de Papa");

      const gift = await fetch(`${base}/household/children/${child.id}/gift`, { method: "POST", headers: parent, body: JSON.stringify({ amount: 20, reason: "Anniversaire, de Mamie" }) });
      expect(gift.status).toBe(201);
      const after = await money();
      expect(after.balances.available).toBe(first + 20);
      expect(after.recent[0]).toMatchObject({ label: "Cadeau : Anniversaire, de Mamie", amount: 20 });

      // Arrêté : plus rien n'est versé.
      await fetch(`${base}/household/children/${child.id}/allowance`, { method: "PUT", headers: parent, body: JSON.stringify({ amount: 5, weekday: 3, active: false }) });
      await prisma.allowanceSchedule.update({ where: { childId: child.id }, data: { startsAt: new Date(Date.now() - 60 * 86_400_000) } });
      expect((await money()).balances.available).toBe(first + 20);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
