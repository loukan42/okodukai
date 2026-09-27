import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it, vi } from "vitest";

const verifyGoogleCredential = vi.hoisted(() => vi.fn());
vi.mock("../lib/googleSignIn.js", () => ({
  googleClientId: () => "test-client-id",
  verifyGoogleCredential,
}));

import { createApp } from "../app.js";
import { signSession, SESSION_COOKIE } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const credential = "g".repeat(120);
const headers = { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" };
const post = (base: string, path: string, cookie?: string, body: object = { credential }) => fetch(`${base}${path}`, {
  method: "POST", headers: { ...headers, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
});

describe.skipIf(!process.env.DATABASE_URL)("connexion Google", () => {
  it("crée un compte sans mot de passe, reconnecte par sub et permet le code parent", async () => {
    const email = `google-${randomUUID()}@gmail.com`;
    const sub = randomUUID();
    verifyGoogleCredential.mockResolvedValue({ sub, email, name: "Parent Google" });
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    let userId: string | undefined;
    let householdId: string | undefined;
    try {
      expect((await fetch(`${base}/auth/google/continue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential }) })).status).toBe(403);
      const created = await post(base, "/auth/google/continue");
      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({ outcome: "created", onboardingCompleted: false });
      const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { memberships: true } });
      userId = user.id;
      householdId = user.memberships[0].householdId;
      expect(user.googleSub).toBe(sub);
      expect(user.passwordLoginEnabled).toBe(false);

      const signedIn = await post(base, "/auth/google/continue");
      expect(signedIn.status).toBe(200);
      const cookie = `${SESSION_COOKIE}=${signSession({ kind: "parent", userId, householdId, role: "PARENT_ADMIN" })}`;
      const me = await (await fetch(`${base}/auth/me`, { headers: { cookie } })).json() as { hasGoogleLogin: boolean; hasPasswordLogin: boolean };
      expect(me.hasGoogleLogin).toBe(true);
      expect(me.hasPasswordLogin).toBe(false);
      expect((await post(base, "/auth/parent-pin", cookie, { credential, pin: "2345" })).status).toBe(200);
      const childCookie = `${SESSION_COOKIE}=${signSession({ kind: "child", childId: randomUUID(), householdId })}`;
      expect((await post(base, "/auth/exit-child-mode/google", childCookie)).status).toBe(200);
    } finally {
      if (householdId) await prisma.household.delete({ where: { id: householdId } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
      server.close();
    }
  });

  it("exige une association volontaire pour un compte à mot de passe existant", async () => {
    const email = `link-${randomUUID()}@gmail.com`;
    const sub = randomUUID();
    verifyGoogleCredential.mockResolvedValue({ sub, email, name: "Parent" });
    const household = await prisma.household.create({ data: { name: "Famille de test" } });
    const user = await prisma.user.create({ data: { email, passwordHash: "unused", displayName: "Parent" } });
    await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const cookie = `${SESSION_COOKIE}=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`;
    try {
      expect((await post(base, "/auth/google/continue")).status).toBe(409);
      expect((await post(base, "/auth/google/link", cookie)).status).toBe(200);
      expect((await post(base, "/auth/google/continue")).status).toBe(200);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).googleSub).toBe(sub);
    } finally {
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
      server.close();
    }
  });
});
