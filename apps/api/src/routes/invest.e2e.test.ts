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

  it("programme des versements sous plafond et respecte la pause parentale", async () => {
    const code = `invest-plan-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Maman", passwordHash: "test" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Nora", ageBand: "AGE_10_12", avatarId: "aventurier-03", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 5, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-lock` } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      type Run = { paused: boolean; monthlyPlan: number; contributed: number; pendingOperations: number; statements: unknown[]; clock: { nextRendezVousAt: string | null } };
      const get = async () => (await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as { run: Run };
      const plan = (body: unknown) => fetch(`${base}/child/invest/contributions`, { method: "POST", headers: kid, body: JSON.stringify(body) });
      const allocation = { SECURISE: 50, MONDE: 50 };

      expect((await fetch(`${base}/child/invest/start`, { method: "POST", headers: kid, body: JSON.stringify({ allocation, idempotencyKey: randomUUID() }) })).status).toBe(201);
      expect((await plan({ amountPerMonth: 10, allocation, idempotencyKey: randomUUID() })).status).toBe(409);
      const settings = await fetch(`${base}/household/children/${child.id}/invest-settings`, { method: "PUT", headers: parent, body: JSON.stringify({ enabled: true, rhythm: "STANDARD", horizonMonths: 120, contributionsEnabled: true, contributionCap: 150 }) });
      expect(settings.status).toBe(200);
      expect((await plan({ amountPerMonth: 10, idempotencyKey: randomUUID() })).status).toBe(400);
      expect((await plan({ amountPerMonth: 10, allocation, idempotencyKey: randomUUID() })).status).toBe(201);
      expect((await plan({ amountPerMonth: 5, allocation, idempotencyKey: randomUUID() })).status).toBe(409);
      expect((await get()).run.pendingOperations).toBe(1);

      // Un an simulé plus tard : 10 unités par mois, jamais au-delà du plafond de 150.
      await prisma.simulationRun.updateMany({ where: { childId: child.id }, data: { startedAt: new Date(Date.now() - 4 * 86_400_000) } });
      let state = (await get()).run;
      expect(state.monthlyPlan).toBe(10);
      expect(state.contributed).toBeGreaterThan(100);
      expect(state.contributed).toBeLessThanOrEqual(150);
      await prisma.simulationRun.updateMany({ where: { childId: child.id }, data: { startedAt: new Date(Date.now() - 12 * 86_400_000) } });
      expect((await get()).run.contributed).toBe(150);

      // Pause (qui commence maintenant) : plus de prochain relevé annoncé, rien de nouveau n'est
      // révélé ; à la reprise, l'horloge repart sans rattraper (le saut est testé dans clock.test.ts).
      const count = (await get()).run.statements.length;
      expect((await fetch(`${base}/household/children/${child.id}/invest-pause`, { method: "POST", headers: parent, body: JSON.stringify({ paused: true }) })).status).toBe(200);
      state = (await get()).run;
      expect(state).toMatchObject({ paused: true, clock: { nextRendezVousAt: null } });
      expect(state.statements.length).toBe(count);
      expect((await plan({ amountPerMonth: 0, idempotencyKey: randomUUID() })).status).toBe(409);
      expect((await fetch(`${base}/household/children/${child.id}/invest-pause`, { method: "POST", headers: parent, body: JSON.stringify({ paused: false }) })).status).toBe(200);
      state = (await get()).run;
      expect(state.paused).toBe(false);
      expect(state.clock.nextRendezVousAt).not.toBeNull();
      expect(await prisma.investPause.count({ where: { childId: child.id, to: { not: null } } })).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("donne +20 XP à la première répartition et au bilan final lu, une seule fois chacun", async () => {
    const code = `invest-xp-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    try {
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 5, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-lock` } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      type Run = { status: string; unseen: number; completionXp: number; statements: { index: number }[] };
      const get = async () => (await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as { gate: string; run: Run | null };
      const post = async (path: string, body: unknown) => {
        const res = await fetch(`${base}${path}`, { method: "POST", headers: kid, body: JSON.stringify(body) });
        return { status: res.status, body: (await res.json()) as { xpAwarded?: number; run: Run | null } };
      };
      const xp = async () => (await prisma.childProfile.findUniqueOrThrow({ where: { id: child.id } })).currentXp;

      const key = randomUUID();
      const allocation = { SECURISE: 40, ENTREPRISES: 60 };
      const started = await post("/child/invest/start", { allocation, idempotencyKey: key });
      expect(started).toMatchObject({ status: 201, body: { xpAwarded: 20 } });
      expect(await post("/child/invest/start", { allocation, idempotencyKey: key })).toMatchObject({ status: 200, body: { xpAwarded: 20 } });
      expect(await xp()).toBe(20);

      // Partie de 5 ans au rythme Standard (6 mois par jour) : terminée après 10 relevés.
      await prisma.simulationRun.updateMany({ where: { childId: child.id }, data: { startedAt: new Date(Date.now() - 12 * 86_400_000) } });
      const finished = (await get()).run!;
      expect(finished).toMatchObject({ status: "TERMINEE", completionXp: 0 });
      expect(finished.unseen).toBeGreaterThan(1);

      // Un bilan intermédiaire lu ne suffit pas : il faut arriver au bilan final.
      expect((await post(`/child/invest/statements/${finished.statements[0].index}/seen`, {})).body.run!.completionXp).toBe(0);
      const last = finished.statements.at(-1)!.index;
      expect((await post(`/child/invest/statements/${last}/seen`, {})).body.run!.completionXp).toBe(20);
      await post(`/child/invest/statements/${last}/seen`, {});
      expect(await xp()).toBe(40);

      // Bilan final : frise des décisions ; pas de « autres choix » en 8-9.
      const report = ((await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as { run: { id: string; finalReport: { years: number; decisions: unknown[]; alternatives: unknown } } }).run;
      expect(report.finalReport).toMatchObject({ years: 5, alternatives: null });
      expect(report.finalReport.decisions.length).toBeGreaterThanOrEqual(1);

      // Nouvelle partie : l'XP de première répartition n'est pas redonnée.
      await post("/child/invest/new-game", {});
      const games = (await (await fetch(`${base}/child/invest/games`, { headers: kid })).json()) as { games: { id: string; story: string | null; years: number }[] };
      expect(games.games).toHaveLength(1);
      expect(games.games[0]).toMatchObject({ id: report.id, years: 5 });
      expect(games.games[0].story).toEqual(expect.any(String));
      expect((await fetch(`${base}/child/invest/games/${report.id}`, { headers: kid })).status).toBe(200);
      expect((await get()).gate).toBe("onboarding");
      expect(await post("/child/invest/start", { allocation, idempotencyKey: randomUUID() })).toMatchObject({ status: 201, body: { xpAwarded: 0 } });
      expect(await xp()).toBe(40);
      expect(await prisma.xpTransaction.count({ where: { childId: child.id, sourceType: "FINANCE_LEARNING" } })).toBe(2);
      // La partie en cours n'a pas de bilan final consultable.
      const current = ((await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as { run: { id: string } }).run;
      expect((await fetch(`${base}/child/invest/games/${current.id}`, { headers: kid })).status).toBe(409);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
    }
  });
});
