import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import type { VaultPrime } from "@prisma/client";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";
import { weeklyDueDates } from "../lib/allowance.js";
import { keptBetween, primeFor, primePreview, type VaultMove } from "../lib/vaultPrime.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const rule = { step: 10, weeklyCap: 10 };
const lock = (amount: number, at: string): VaultMove => ({ type: "SAVINGS_LOCK", amount, createdAt: new Date(at) });
const unlock = (amount: number, at: string): VaultMove => ({ type: "SAVINGS_UNLOCK", amount, createdAt: new Date(at) });

describe("prime du coffre : calcul", () => {
  it("donne 1 pièce pour 10 pièces, plafonnée par semaine", () => {
    expect(primeFor(9, rule)).toBe(0);
    expect(primeFor(40, rule)).toBe(4);
    expect(primeFor(49, rule)).toBe(4);
    expect(primeFor(150, rule)).toBe(10);
    expect(primeFor(40, { step: 20, weeklyCap: 10 })).toBe(2);
  });

  it("ne compte que les pièces restées toute la semaine", () => {
    // Semaine du lundi 21 au lundi 28 septembre 2026 (8 h à Paris = 6 h UTC).
    const from = new Date("2026-09-21T06:00:00Z");
    const to = new Date("2026-09-28T06:00:00Z");
    expect(keptBetween([lock(40, "2026-09-10T10:00:00Z"), unlock(30, "2026-09-23T10:00:00Z"), lock(30, "2026-09-25T10:00:00Z")], from, to)).toBe(10);
    // Ranger le dimanche soir et reprendre le lundi ne rapporte rien.
    expect(keptBetween([lock(100, "2026-09-27T19:00:00Z"), unlock(100, "2026-09-28T07:00:00Z")], from, to)).toBe(0);
    // Ce qui arrive pile au lundi de versement compte pour la semaine qui commence.
    expect(keptBetween([lock(20, "2026-09-21T06:00:00Z")], from, to)).toBe(20);
  });

  it("annonce la prime de lundi et ce que devient le coffre si rien ne bouge", () => {
    const vaultPrime = { childId: "x", active: true, step: 10, weeklyCap: 10, since: new Date("2026-01-01T00:00:00Z"), checkedUntil: null, updatedById: null, updatedAt: new Date() } satisfies VaultPrime;
    const now = new Date("2026-09-30T12:00:00Z"); // mercredi
    const preview = primePreview([lock(40, "2026-09-20T10:00:00Z"), lock(20, "2026-09-29T10:00:00Z")], vaultPrime, now);
    expect(preview.balance).toBe(60);
    expect(preview.next).toEqual({ at: "2026-10-05T06:00:00.000Z", kept: 40, amount: 4 });
    expect(preview.countsFromNextWeek).toBe(20);
    expect(preview.projection.map((p) => [p.prime, p.balance])).toEqual([
      [4, 64],
      [6, 70],
      [7, 77],
      [7, 84],
    ]);
    expect(primePreview([], { ...vaultPrime, active: false }, now)).toMatchObject({ active: false, next: null, projection: [] });
  });
});

describe.skipIf(!process.env.DATABASE_URL)("prime du coffre : versement", () => {
  it("verse chaque lundi dû une seule fois, en cumulant, et suit le réglage du parent", async () => {
    const code = `prime-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const other = await prisma.household.create({ data: { name: `${code}-autre` } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Maman", passwordHash: "test" } });
    const stranger = await prisma.user.create({ data: { email: `${code}-autre@example.test`, displayName: "Autre", passwordHash: "test" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      await prisma.householdMembership.create({ data: { householdId: other.id, userId: stranger.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Inès", ageBand: "AGE_8_9", avatarId: "aventurier-03", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}` };
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      const outsider = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: stranger.id, householdId: other.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      type Money = { balances: { vault: number }; vault: { prime: { active: boolean; next: { amount: number } | null } } };
      const money = async () => (await (await fetch(`${base}/child/money`, { headers: kid })).json()) as Money;

      // Active par défaut, sans rien régler.
      const fresh = await money();
      expect(fresh.vault.prime.active).toBe(true);
      expect(fresh.balances.vault).toBe(0);

      // 40 pièces rangées il y a plus de trois semaines ; la prime compte depuis trois semaines.
      const since = new Date(Date.now() - 21 * 86_400_000 + 3_600_000);
      await prisma.walletTransaction.create({
        data: { walletId: wallet.id, amount: 40, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-lock`, createdAt: new Date(Date.now() - 22 * 86_400_000) },
      });
      await prisma.vaultPrime.update({ where: { childId: child.id }, data: { since, checkedUntil: null } });
      const mondays = weeklyDueDates(1, since, new Date()).filter((d) => d > since).length;
      expect(mondays).toBeGreaterThanOrEqual(2);

      const after = await money();
      expect(after.balances.vault).toBe(40 + 4 * mondays);
      expect((await money()).balances.vault).toBe(40 + 4 * mondays);
      expect(await prisma.walletTransaction.count({ where: { walletId: wallet.id, type: "VAULT_PRIME" } })).toBe(mondays);

      const history = (await (await fetch(`${base}/child/money/history?place=vault`, { headers: kid })).json()) as { items: { label: string; amount: number }[] };
      expect(history.items[0]).toMatchObject({ label: "Prime du coffre", amount: 4 });
      const notes = await prisma.notification.findMany({ where: { childId: child.id, type: "vault_prime" } });
      expect(notes).toHaveLength(1);
      expect(notes[0].payload).toMatchObject({ amount: 4 * mondays, weeks: mondays, step: 10 });

      // Un autre foyer ne voit ni ne règle rien.
      expect((await fetch(`${base}/household/children/${child.id}/vault-prime`, { headers: outsider })).status).toBe(404);
      const forbidden = await fetch(`${base}/household/children/${child.id}/vault-prime`, { method: "PUT", headers: outsider, body: JSON.stringify({ active: false, step: 10, weeklyCap: 10 }) });
      expect(forbidden.status).toBe(404);

      // Arrêtée : plus rien, même en remontant le temps.
      const stop = await fetch(`${base}/household/children/${child.id}/vault-prime`, { method: "PUT", headers: parent, body: JSON.stringify({ active: false, step: 10, weeklyCap: 10 }) });
      expect(stop.status).toBe(200);
      await prisma.vaultPrime.update({ where: { childId: child.id }, data: { checkedUntil: null } });
      expect((await money()).balances.vault).toBe(40 + 4 * mondays);
      expect((await money()).vault.prime).toMatchObject({ active: false, next: null });

      // Réactivée : repart de maintenant, sans rattraper les semaines arrêtées.
      const res = await fetch(`${base}/household/children/${child.id}/vault-prime`, { method: "PUT", headers: parent, body: JSON.stringify({ active: true, step: 20, weeklyCap: 5 }) });
      const body = (await res.json()) as { prime: { step: number; weeklyCap: number } };
      expect(body.prime).toMatchObject({ step: 20, weeklyCap: 5 });
      expect((await prisma.vaultPrime.findUniqueOrThrow({ where: { childId: child.id } })).since.getTime()).toBeGreaterThan(Date.now() - 60_000);
      expect((await money()).balances.vault).toBe(40 + 4 * mondays);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.household.delete({ where: { id: other.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, stranger.id] } } });
    }
  });
});
