import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { signSession, SESSION_COOKIE } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("statistiques d’administration", () => {
  it("réserve les agrégats au compte autorisé et applique sa révocation immédiatement", async () => {
    const household = await prisma.household.create({ data: { name: "Test statistiques" } });
    const user = await prisma.user.create({ data: { email: `admin-test-${randomUUID()}@example.test`, passwordHash: "unused", displayName: "Test" } });
    await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const parentCookie = `${SESSION_COOKIE}=${signSession({ kind: "parent", userId: user.id, householdId: household.id, role: "PARENT_ADMIN" })}`;
    const childCookie = `${SESSION_COOKIE}=${signSession({ kind: "child", childId: randomUUID(), householdId: household.id })}`;

    try {
      expect((await fetch(`${base}/admin/analytics`, { headers: { cookie: parentCookie } })).status).toBe(403);
      expect((await fetch(`${base}/admin/analytics`, { headers: { cookie: childCookie } })).status).toBe(401);
      const deniedParent = await fetch(`${base}/admin/users`, { headers: { cookie: parentCookie } });
      expect(deniedParent.status).toBe(403);
      expect(deniedParent.headers.get("cache-control")).toBe("private, no-store");
      const deniedChild = await fetch(`${base}/admin/users`, { headers: { cookie: childCookie } });
      expect(deniedChild.status).toBe(401);
      expect(deniedChild.headers.get("cache-control")).toBe("private, no-store");

      await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
      const allowed = await fetch(`${base}/admin/analytics?days=7`, { headers: { cookie: parentCookie } });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("cache-control")).toBe("private, no-store");
      const body = await allowed.json() as Record<string, unknown>;
      expect(body.period).toMatchObject({ days: 7 });
      expect(body.totals).toMatchObject({ parents: expect.any(Number), children: expect.any(Number), households: expect.any(Number), quests: expect.any(Number), validated: expect.any(Number) });
      expect(body.activity).toMatchObject({ questsCreated: expect.any(Number), questsValidated: expect.any(Number) });
      expect(JSON.stringify(body)).not.toContain(user.email);
      expect(JSON.stringify(body)).not.toContain(user.id);
      expect((await fetch(`${base}/admin/analytics?days=1`, { headers: { cookie: parentCookie } })).status).toBe(400);

      const usersResponse = await fetch(`${base}/admin/users?page=1`, { headers: { cookie: parentCookie } });
      expect(usersResponse.status).toBe(200);
      expect(usersResponse.headers.get("cache-control")).toBe("private, no-store");
      const usersBody = await usersResponse.json() as { page: number; pageSize: number; total: number; users: Record<string, unknown>[] };
      expect(usersBody).toMatchObject({ page: 1, pageSize: 25, total: expect.any(Number) });
      expect(usersBody.users.length).toBeGreaterThan(0);
      expect(usersBody.users.length).toBeLessThanOrEqual(25);
      expect(usersBody.users.every((entry) => Object.keys(entry).sort().join(",") === "createdAt,email")).toBe(true);
      expect(JSON.stringify(usersBody)).not.toContain(user.id);
      expect((await fetch(`${base}/admin/users?page=0`, { headers: { cookie: parentCookie } })).status).toBe(400);

      await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: false } });
      expect((await fetch(`${base}/admin/analytics`, { headers: { cookie: parentCookie } })).status).toBe(403);
      expect((await fetch(`${base}/admin/users`, { headers: { cookie: parentCookie } })).status).toBe(403);
    } finally {
      server.close();
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
