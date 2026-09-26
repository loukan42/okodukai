import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

type Money = {
  balances: { available: number; vault: number };
  goals: { title: string; present: number; missing: number; reached: boolean }[];
  vault: { mode: string; withdrawableNow: number; needsApproval: number; pendingRequest: { amount: number } | null };
  week: { entrees: number; misDeCote: number; repris: number };
};
type Line = { transactionId: string; label: string; kind: string; amount: number; balanceBefore: number; balanceAfter: number; place: string };

describe.skipIf(!process.env.DATABASE_URL)("Mon argent : compte, coffre, règles et relevé", () => {
  it("transfère sans doublon, applique la règle du coffre et tient un relevé signé", async () => {
    const code = `money-${randomUUID()}`;
    const ids: { households: string[]; users: string[] } = { households: [], users: [] };
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const household = await prisma.household.create({ data: { name: code, onboardingCompletedAt: new Date() } });
      ids.households.push(household.id);
      const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Maman", passwordHash: "test" } });
      ids.users.push(user.id);
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léa", ageBand: "AGE_10_12", avatarId: "aventurier-04", pinHash: "test" } });
      await prisma.wallet.create({ data: { childId: child.id } });

      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      const post = (path: string, headers: Record<string, string>, body: unknown) => fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
      const money = async () => (await (await fetch(`${base}/child/money`, { headers: kid })).json()) as Money;

      expect((await post(`/household/children/${child.id}/wallet/adjust`, parent, { amount: 100, direction: "credit", reason: "Argent de départ" })).status).toBe(200);

      // Double appui : la même clé ne crée qu'un seul transfert.
      const k1 = randomUUID();
      expect((await post("/child/savings/lock", kid, { amount: 30, idempotencyKey: k1 })).status).toBe(200);
      expect((await post("/child/savings/lock", kid, { amount: 30, idempotencyKey: k1 })).status).toBe(200);
      expect((await money()).balances).toEqual({ available: 70, vault: 30 });

      const tooMuch = await post("/child/savings/lock", kid, { amount: 500, idempotencyKey: randomUUID() });
      expect(tooMuch.status).toBe(400);
      expect(await tooMuch.json()).toMatchObject({ code: "INSUFFICIENT_ACCOUNT", available: 70 });

      expect((await post("/child/savings/goals", kid, { title: "Vélo", targetCoins: 50 })).status).toBe(201);
      expect((await money()).goals[0]).toMatchObject({ title: "Vélo", present: 30, missing: 20, reached: false });

      // Règle « validation parentale » : les pièces déposées avant restent libres.
      expect((await fetch(`${base}/household/children/${child.id}/vault-rule`, { method: "PUT", headers: parent, body: JSON.stringify({ mode: "PARENT_APPROVAL" }) })).status).toBe(200);
      expect((await post("/child/savings/lock", kid, { amount: 10, idempotencyKey: randomUUID() })).status).toBe(200);
      let state = await money();
      expect(state.balances).toEqual({ available: 60, vault: 40 });
      expect(state.vault).toMatchObject({ mode: "PARENT_APPROVAL", withdrawableNow: 30, needsApproval: 10 });

      const request = await post("/child/savings/unlock", kid, { amount: 35, idempotencyKey: randomUUID() });
      expect(request.status).toBe(202);
      const k5 = randomUUID();
      expect((await post("/child/savings/unlock", kid, { amount: 5, idempotencyKey: k5 })).status).toBe(200);
      expect((await post("/child/savings/unlock", kid, { amount: 5, idempotencyKey: k5 })).status).toBe(200);
      expect((await post("/child/savings/unlock", kid, { amount: 10, idempotencyKey: randomUUID() })).status).toBe(200);
      state = await money();
      expect(state.balances).toEqual({ available: 75, vault: 25 });
      expect(state.vault.pendingRequest).toMatchObject({ amount: 35 });
      const second = await post("/child/savings/unlock", kid, { amount: 20, idempotencyKey: randomUUID() });
      expect(second.status).toBe(409);
      expect(await second.json()).toMatchObject({ code: "REQUEST_PENDING" });

      // Le parent accepte, mais le coffre ne contient plus 35 : la demande est refusée.
      const pending = (await (await fetch(`${base}/household/vault-requests`, { headers: parent })).json()) as { requests: { id: string; amount: number }[] };
      expect(pending.requests).toHaveLength(1);
      expect((await post(`/household/vault-requests/${pending.requests[0].id}/decision`, parent, { decision: "approve" })).status).toBe(409);

      const again = await post("/child/savings/unlock", kid, { amount: 20, idempotencyKey: randomUUID() });
      expect(again.status).toBe(202);
      const pending2 = (await (await fetch(`${base}/household/vault-requests`, { headers: parent })).json()) as { requests: { id: string }[] };
      expect((await post(`/household/vault-requests/${pending2.requests[0].id}/decision`, parent, { decision: "approve" })).status).toBe(200);
      state = await money();
      expect(state.balances).toEqual({ available: 95, vault: 5 });
      expect(state.week).toMatchObject({ entrees: 100, misDeCote: 40, repris: 35 });

      // Relevé de Mon compte : le plus récent d'abord, signé, avec le solde après.
      const history = (await (await fetch(`${base}/child/money/history?place=account`, { headers: kid })).json()) as { items: Line[]; balance: number };
      expect(history.balance).toBe(95);
      expect(history.items[0]).toMatchObject({ label: "Depuis Mon coffre", kind: "transfert", amount: 20, balanceBefore: 75, balanceAfter: 95 });
      expect(history.items.at(-1)).toMatchObject({ label: "Correction de Maman", kind: "correction", amount: 100, balanceAfter: 100 });
      const incoming = (await (await fetch(`${base}/child/money/history?place=account&filter=in`, { headers: kid })).json()) as { items: Line[] };
      expect(incoming.items.map((l) => l.amount)).toEqual([100]);
      const detail = (await (await fetch(`${base}/child/money/lines/${history.items[0].transactionId}`, { headers: kid })).json()) as { lines: Line[] };
      expect(detail.lines.map((l) => [l.place, l.amount])).toEqual([["vault", -20], ["account", 20]]);

      // Isolation des foyers : un autre parent ne voit pas cet enfant.
      const other = await prisma.household.create({ data: { name: `${code}-autre` } });
      ids.households.push(other.id);
      const stranger = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: other.id, role: "PARENT_ADMIN" })}` };
      expect((await fetch(`${base}/household/children/${child.id}/vault-rule`, { headers: stranger })).status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.deleteMany({ where: { id: { in: ids.households } } });
      await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    }
  });
});
