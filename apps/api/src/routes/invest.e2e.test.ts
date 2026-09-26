import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

type Invest = {
  gate: string;
  allowedSupports?: string[];
  orchard: { gate: string; run: null | { mode: string; value: number; feesPaid: number; contributed: number; monthlyPlan: number } };
  run: null | { id: string; value: number; statements: { index: number; seen: boolean }[]; unseen: number; pendingOperations: number; clock: { revealedSteps: number }; scenarioRevealed: string | null };
};

describe.skipIf(!process.env.DATABASE_URL)("placements école : moteur, relevés, isolation", () => {
  it("s'ouvre après un premier dépôt au coffre, fige la partie et révèle le marché rendez-vous par rendez-vous", async () => {
    const code = `invest-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const other = await prisma.household.create({ data: { name: `${code}-autre` } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Papa", passwordHash: "test" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Inès", ageBand: "AGE_10_12", avatarId: "aventurier-02", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      const get = async () => (await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as Invest;
      const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: "POST", headers: kid, body: JSON.stringify(body) });

      expect((await get()).gate).toBe("locked");
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 10, type: "PARENT_BONUS", actorId: user.id, idempotencyKey: `${code}-bonus` } });
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 5, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-lock` } });
      const onboarding = await get();
      expect(onboarding.gate).toBe("onboarding");
      expect(onboarding.allowedSupports).toEqual(["SECURISE", "PRETER", "MONDE", "ENTREPRISES"]);

      expect((await post("/child/invest/start", { allocation: { SECURISE: 40, ENTREPRISES: 50 }, idempotencyKey: randomUUID() })).status).toBe(400);
      expect((await post("/child/invest/start", { allocation: { SECURISE: 42, ENTREPRISES: 58 }, idempotencyKey: randomUUID() })).status).toBe(400);
      const key = randomUUID();
      const started = await post("/child/invest/start", { allocation: { SECURISE: 40, ENTREPRISES: 60 }, idempotencyKey: key });
      expect(started.status).toBe(201);
      expect((await post("/child/invest/start", { allocation: { SECURISE: 40, ENTREPRISES: 60 }, idempotencyKey: key })).status).toBe(200);
      expect(await prisma.simulationRun.count({ where: { childId: child.id } })).toBe(1);
      let state = await get();
      expect(state.run).toMatchObject({ value: 100, statements: [], clock: { revealedSteps: 0 }, scenarioRevealed: null });

      // Trois jours plus tard (rythme Standard : un relevé de 6 mois par jour à 17 h).
      await prisma.simulationRun.updateMany({ where: { childId: child.id }, data: { startedAt: new Date(Date.now() - 3 * 86_400_000) } });
      const raw = await (await fetch(`${base}/child/invest`, { headers: kid })).text();
      expect(raw).not.toMatch(/seed|marketPath|scenario"|CROISSANCE|CRISE|STAGNATION/);
      state = JSON.parse(raw) as Invest;
      expect(state.run!.statements.length).toBeGreaterThanOrEqual(2);
      expect(state.run!.clock.revealedSteps).toBe(state.run!.statements.length * 6);
      const snapshots = await prisma.simulationSnapshot.count();
      await get();
      expect(await prisma.simulationSnapshot.count()).toBe(snapshots);

      expect((await post("/child/invest/rebalance", { allocation: { SECURISE: 50, PRETER: 25, MONDE: 25 }, idempotencyKey: randomUUID() })).status).toBe(201);
      expect((await get()).run!.pendingOperations).toBe(1);
      expect((await post("/child/invest/rebalance", { allocation: { SECURISE: 100 }, idempotencyKey: randomUUID() })).status).toBe(409);

      expect(state.orchard.gate).toBe("locked");
      const last = state.run!.statements.at(-1)!.index;
      expect((await post(`/child/invest/statements/${last}/seen`, {})).status).toBe(200);
      expect((await get()).run!.unseen).toBe(0);

      // Le verger (assurance-vie simulée) s'ouvre après un premier bilan lu : frais d'exemple de 2 % sur versement.
      expect((await get()).orchard.gate).toBe("onboarding");
      const orchard = await post("/child/invest/orchard/start", { allocation: { SECURISE: 50, MONDE: 50 }, monthly: 2, idempotencyKey: randomUUID() });
      expect(orchard.status).toBe(201);
      const opened = (await get()).orchard.run!;
      expect(opened).toMatchObject({ mode: "ASSURANCE_VIE", value: 98, feesPaid: 2, contributed: 100, monthlyPlan: 2 });
      await prisma.simulationRun.updateMany({ where: { childId: child.id, mode: "ASSURANCE_VIE" }, data: { startedAt: new Date(Date.now() - 2 * 86_400_000) } });
      const grown = (await get()).orchard.run!;
      expect(grown.contributed).toBeGreaterThan(100);
      expect(grown.feesPaid).toBeGreaterThan(2);

      const view = (await (await fetch(`${base}/household/children/${child.id}/invest`, { headers: parent })).json()) as { run: { value: number } };
      expect(view.run.value).toBe((await get()).run!.value);
      const saved = await fetch(`${base}/household/children/${child.id}/invest-settings`, { method: "PUT", headers: parent, body: JSON.stringify({ enabled: false, rhythm: "RAPIDE", horizonMonths: 120 }) });
      expect(saved.status).toBe(200);
      expect((await get()).gate).toBe("disabled");
      const stranger = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: other.id, role: "PARENT_ADMIN" })}` };
      expect((await fetch(`${base}/household/children/${child.id}/invest`, { headers: stranger })).status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.deleteMany({ where: { id: { in: [household.id, other.id] } } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
