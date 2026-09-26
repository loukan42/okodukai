import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

type Tip = { tip: null | { code: string; title: string | null; message: string } };
type Question = { question: null | { id: string; prompt: string; options: { id: string; text: string }[] } };

describe.skipIf(!process.env.DATABASE_URL)("encarts pédagogiques et vérifications", () => {
  it("détecte les encarts sur les vraies données, une seule fois, et corrige les questions côté serveur", async () => {
    const code = `finance-${randomUUID()}`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const user = await prisma.user.create({ data: { email: `${code}@example.test`, displayName: "Camille", passwordHash: "test" } });
    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
      const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: "test" } });
      const wallet = await prisma.wallet.create({ data: { childId: child.id } });
      const kid = { cookie: `okodukai_session=${signSession({ kind: "child", childId: child.id, householdId: household.id })}`, "content-type": "application/json" };
      const parent = { cookie: `okodukai_session=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`, "content-type": "application/json" };
      const tip = async (screen: string) => (await (await fetch(`${base}/child/finance/tip?screen=${screen}`, { headers: kid })).json()) as Tip;
      const act = (tipCode: string, screen: string, outcome = "compris") => fetch(`${base}/child/finance/tips/${tipCode}`, { method: "POST", headers: kid, body: JSON.stringify({ outcome, screen }) });
      const question = async (context: string) => (await (await fetch(`${base}/child/finance/question?context=${context}`, { headers: kid })).json()) as Question;
      const answer = async (id: string, optionId: string, context: string) =>
        (await (await fetch(`${base}/child/finance/questions/${id}/answer`, { method: "POST", headers: kid, body: JSON.stringify({ optionId, context }) })).json()) as { correct: boolean; feedback: string; xpAwarded: number };

      // Aucun mouvement : pas d'encart sur l'accueil.
      expect((await tip("home")).tip).toBeNull();
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 20, type: "PARENT_BONUS", actorId: user.id, idempotencyKey: `${code}-bonus` } });
      const t01 = (await tip("home")).tip!;
      expect(t01).toMatchObject({ code: "T01", title: "Entrée, solde" });
      expect((await act("T01", "home")).status).toBe(201);
      expect((await act("T01", "home")).status).toBe(201);
      expect((await tip("home")).tip).toBeNull();
      expect(await prisma.financeTipLog.count({ where: { childId: child.id } })).toBe(1);
      const solde = await prisma.financeNotionProgress.findUnique({ where: { childId_notionCode: { childId: child.id, notionCode: "solde" } } });
      expect(solde?.state).toBe("EXPLIQUEE");
      // Un code d'un autre écran est refusé.
      expect((await act("T08", "home")).status).toBe(404);

      // Coffre : transfert → T03 avec le vrai montant, puis la question Q02.
      expect((await question("vault")).question?.id).not.toBe("Q02");
      await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 7, type: "SAVINGS_LOCK", actorId: child.id, idempotencyKey: `${code}-lock` } });
      expect((await tip("vault")).tip).toMatchObject({ code: "T03", message: expect.stringContaining("Tes 7 pièces sont dans Mon coffre") });
      const q02 = (await question("vault")).question!;
      expect(q02.id).toBe("Q02");
      expect(q02.options.at(-1)).toEqual({ id: "je_ne_sais_pas", text: "Je ne sais pas encore" });
      expect(await answer("Q02", "je_ne_sais_pas", "vault")).toMatchObject({ correct: false, xpAwarded: 0 });
      expect(await answer("Q02", "b", "vault")).toMatchObject({ correct: false, feedback: expect.stringContaining("Non") });
      expect(await answer("Q02", "a", "vault")).toMatchObject({ correct: true, xpAwarded: 10 });
      expect(await answer("Q02", "a", "vault")).toMatchObject({ correct: true, xpAwarded: 0 });
      expect((await prisma.childProfile.findUniqueOrThrow({ where: { id: child.id } })).currentXp).toBe(10);
      expect((await question("vault")).question?.id).toBe("Q01");

      // Journal : le feuillet lu et le carnet par chapitre.
      const journal = (await (await fetch(`${base}/child/finance/journal`, { headers: kid })).json()) as { tips: { code: string }[]; chapters: { chapter: number; notions: { code: string; state: string }[] }[] };
      expect(journal.tips.map((t) => t.code)).toEqual(["T01"]);
      expect(journal.chapters.find((c) => c.chapter === 2)!.notions.find((n) => n.code === "transfert")!.state).toBe("VERIFIEE");
      expect(journal.chapters.some((c) => c.chapter === 5)).toBe(false);

      // Niveau pédagogique « Approfondi » : l'enfant de 8-9 ans voit les mots 10-12.
      const level = await fetch(`${base}/household/children/${child.id}/pedagogy`, { method: "PUT", headers: parent, body: JSON.stringify({ level: "APPROFONDI" }) });
      expect(level.status).toBe(200);
      const invest = (await (await fetch(`${base}/child/invest`, { headers: kid })).json()) as { ageBand: string };
      expect(invest.ageBand).toBe("AGE_10_12");
      const deep = (await (await fetch(`${base}/child/finance/journal`, { headers: kid })).json()) as { chapters: { chapter: number }[] };
      expect(deep.chapters.some((c) => c.chapter === 5)).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
