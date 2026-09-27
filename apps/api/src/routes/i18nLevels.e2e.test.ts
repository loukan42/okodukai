import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";
import { grantXp } from "../lib/xp.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("langue des réponses et niveaux", () => {
  it("répond en anglais sur demande, garde le français par défaut, et offre un booster par niveau une seule fois", async () => {
    const code = `i18n-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Sam", passwordHash: "test" } });
    // Univers propre au test : un univers partagé pourrait être supprimé par un autre test en parallèle.
    const universe = await prisma.universe.create({ data: { code, title: "Univers test niveaux" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Alex", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      const cookie = `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`;
      const kid = (lang?: string) => ({ cookie, "content-type": "application/json", ...(lang ? { "x-locale": lang } : {}) });

      // Messages d'erreur : français par défaut, anglais avec X-Locale.
      const lock = (lang?: string) => fetch(`${base}/child/savings/lock`, { method: "POST", headers: kid(lang), body: JSON.stringify({ amount: 5, idempotencyKey: randomUUID() }) });
      expect(((await (await lock()).json()) as { error: string }).error).toContain("Il te manque 5 pièces");
      const english = await lock("en");
      expect(english.headers.get("content-language")).toBe("en");
      expect(((await english.json()) as { error: string }).error).toBe("You need 5 more coins in your account to put 5 aside.");

      // Relevé et encarts dans la langue demandée.
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 20, type: "PARENT_BONUS", actorId: user.id, idempotencyKey: `${code}-bonus` } });
      const money = (await (await fetch(`${base}/child/money`, { headers: kid("en") })).json()) as { recent: { label: string }[] };
      expect(money.recent[0].label).toBe("Bonus from Sam");
      const tip = (await (await fetch(`${base}/child/finance/tip?screen=home`, { headers: kid("en") })).json()) as { tip: { code: string; title: string } };
      expect(tip.tip).toMatchObject({ code: "T01", title: "Money in, balance" });

      // Niveaux : un booster de niveau par niveau gagné, jamais deux fois (idempotence, sauts de niveau).
      await prisma.card.create({ data: { universeId: universe.id, cardNumber: 1, name: "Carte test", rarity: "COMMUNE" } });
      await prisma.boosterDefinition.create({ data: { universeId: universe.id, code: `booster-${code}`, title: "Booster test", cardCount: 1, slotConfig: { slots: [{ weights: { COMMUNE: 100 } }] } } });
      await prisma.householdUniverse.create({ data: { householdId: household.id, universeId: universe.id } });
      const grant = (amount: number, key: string) => prisma.$transaction((tx) => grantXp(tx, { childId: child.id, amount, sourceType: "QUEST", idempotencyKey: `${code}-${key}` }));
      expect(await grant(50, "a")).toMatchObject({ level: 1, leveledUp: false });
      expect(await grant(300, "b")).toMatchObject({ level: 3, leveledUp: true });
      expect(await grant(300, "b")).toBeNull();
      const levelBoosters = await prisma.boosterInstance.findMany({ where: { childId: child.id, sourceType: "level_up" }, orderBy: { sourceId: "asc" } });
      expect(levelBoosters.map((b) => b.sourceId)).toEqual(["level:2", "level:3"]);
      const notes = await prisma.notification.findMany({ where: { childId: child.id, type: "level_up" } });
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => (n.payload as { title: string | null }).title).sort()).toEqual(["cartographe", null].sort());

      // Langue de la famille : le parent la règle, l'espace enfant la reçoit avec sa session.
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      expect(((await (await fetch(`${base}/auth/me`, { headers: kid() })).json()) as { locale: string }).locale).toBe("fr");
      expect((await fetch(`${base}/household/locale`, { method: "PUT", headers: parent, body: JSON.stringify({ locale: "en" }) })).status).toBe(200);
      expect((await fetch(`${base}/household/locale`, { method: "PUT", headers: kid(), body: JSON.stringify({ locale: "fr" }) })).status).toBe(401);
      expect(((await (await fetch(`${base}/auth/me`, { headers: kid() })).json()) as { locale: string }).locale).toBe("en");
      const parentMe = (await (await fetch(`${base}/auth/me`, { headers: parent })).json()) as { household: { locale: string } };
      expect(parentMe.household.locale).toBe("en");

      // Profil : titre et prochaine récompense calculés par le serveur.
      const me = (await (await fetch(`${base}/child/me`, { headers: kid() })).json()) as { level: { level: number; title: string; nextReward: { boosters: number } } };
      expect(me.level).toMatchObject({ level: 3, title: "cartographe", nextReward: { boosters: 1 } });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.universe.delete({ where: { id: universe.id } });
    }
  });
});
