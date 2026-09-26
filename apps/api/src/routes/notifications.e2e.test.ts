import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { createRun } from "../lib/invest.js";
import { STATEMENT_READY, isQuietHour, notifyReadyStatements } from "../lib/statementNotifier.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe("« Ton relevé est prêt. » : horaires", () => {
  it("se tait la nuit (20 h – 8 h, heure de Paris)", () => {
    expect(isQuietHour(new Date("2026-10-01T20:30:00Z"))).toBe(true); // 22 h 30 à Paris
    expect(isQuietHour(new Date("2026-10-01T05:00:00Z"))).toBe(true); // 7 h
    expect(isQuietHour(new Date("2026-10-01T15:30:00Z"))).toBe(false); // 17 h 30
  });
});

describe.skipIf(!process.env.DATABASE_URL)("« Ton relevé est prêt. »", () => {
  it("prévient une fois par relevé et par jour, sans chiffre, seulement si le parent l'a activé", async () => {
    const code = `notify-${randomUUID()}`;
    const household = await prisma.household.create({ data: { name: code } });
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      const day = new Date("2026-10-01T13:00:00Z"); // 15 h à Paris
      await prisma.$transaction((tx) => createRun(tx, { childId: child.id, householdId: household.id, rhythm: "STANDARD", horizonMonths: 60, allocation: { SECURISE: 40, PRETER: 0, MONDE: 0, ENTREPRISES: 60 }, idempotencyKey: `${code}-run` }));
      await prisma.simulationRun.updateMany({ where: { childId: child.id }, data: { startedAt: new Date(day.getTime() - 3 * 86_400_000) } });
      const mine = () => prisma.notification.findMany({ where: { childId: child.id, type: "releve_pret" } });

      // Désactivé par défaut : rien.
      await notifyReadyStatements(day);
      expect(await mine()).toHaveLength(0);

      await prisma.investSettings.create({ data: { childId: child.id, notifyStatement: true } });
      expect((await notifyReadyStatements(new Date("2026-10-01T21:00:00Z"))).quiet).toBe(true);
      expect(await mine()).toHaveLength(0);
      await notifyReadyStatements(day);
      const sent = await mine();
      expect(sent).toHaveLength(1);
      expect(sent[0].payload).toEqual({ text: STATEMENT_READY });
      expect(await prisma.simulationSnapshot.count({ where: { run: { childId: child.id }, notifiedAt: null } })).toBe(0);
      // Même jour : pas de deuxième notification.
      await notifyReadyStatements(new Date(day.getTime() + 2 * 3600_000));
      expect(await mine()).toHaveLength(1);

      // La route planifiée est fermée sans le bon secret.
      const previous = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      expect((await fetch(`${base}/internal/cron/statements`)).status).toBe(503);
      process.env.CRON_SECRET = "secret-de-test";
      expect((await fetch(`${base}/internal/cron/statements`, { headers: { authorization: "Bearer mauvais" } })).status).toBe(401);
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
    }
  });
});
