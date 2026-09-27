import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";
import { createRun } from "../lib/invest.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const EMPTY_ALLOCATION = { SECURISE: 25, PRETER: 25, MONDE: 25, ENTREPRISES: 25 };

describe.skipIf(!process.env.DATABASE_URL)("clôture des anciennes parties en unités école", () => {
  it("clôt une fois la partie MIROIR jamais financée par le portefeuille, jamais le verger", async () => {
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
      const child = await prisma.childProfile.create({ data: { householdId, displayName: "Enfant test", ageBand: "AGE_10_12", avatarId: "test", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      // hasSaved: l'observatoire n'est visible qu'après un premier dépôt au coffre.
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 10, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `test:${randomUUID()}` } });

      const legacyMirror = await prisma.$transaction((tx) =>
        createRun(tx, { childId: child.id, householdId: householdId!, rhythm: "STANDARD", horizonMonths: 120, allocation: EMPTY_ALLOCATION, idempotencyKey: `test:${randomUUID()}` })
      );
      const legacyOrchard = await prisma.$transaction((tx) =>
        createRun(tx, { childId: child.id, householdId: householdId!, rhythm: "STANDARD", horizonMonths: 120, allocation: EMPTY_ALLOCATION, mode: "ASSURANCE_VIE", idempotencyKey: `test:${randomUUID()}` })
      );

      const childCookie = `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId })}`;

      const first = await fetch(`${base}/child/invest`, { headers: { cookie: childCookie } });
      expect(first.status).toBe(200);
      const firstBody = (await first.json()) as { legacyClosed: boolean; gate: string };
      expect(firstBody.legacyClosed).toBe(true);
      expect(firstBody.gate).not.toBe("open");

      const closedMirror = await prisma.simulationRun.findUniqueOrThrow({ where: { id: legacyMirror.id } });
      expect(closedMirror.status).toBe("ARRETEE");
      expect(closedMirror.finishedAt).not.toBeNull();

      // Le verger garde ses unités école par choix de produit : jamais clos par cette règle.
      const untouchedOrchard = await prisma.simulationRun.findUniqueOrThrow({ where: { id: legacyOrchard.id } });
      expect(untouchedOrchard.status).toBe("EN_COURS");

      const second = await fetch(`${base}/child/invest`, { headers: { cookie: childCookie } });
      const secondBody = (await second.json()) as { legacyClosed: boolean };
      expect(secondBody.legacyClosed).toBe(false);

      const games = await fetch(`${base}/child/invest/games`, { headers: { cookie: childCookie } });
      const { games: list } = (await games.json()) as { games: { id: string }[] };
      expect(list.some((g) => g.id === legacyMirror.id)).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (householdId) await prisma.household.delete({ where: { id: householdId } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
    }
  }, 15000);
});
