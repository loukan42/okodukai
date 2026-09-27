import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import argon2 from "argon2";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
const json = { "content-type": "application/json" };
const cookies = (response: Response) => response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");

describe.skipIf(!process.env.DATABASE_URL)("accès enfant sur téléphone partagé ou personnel", () => {
  it("protège le retour parent par PIN et consomme le lien personnel une seule fois", async () => {
    const suffix = randomUUID();
    const email = `access-${suffix}@example.test`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: `access-${suffix}` } });
    const other = await prisma.household.create({ data: { name: `other-${suffix}` } });
    const user = await prisma.user.create({ data: { email, displayName: "Camille", passwordHash: await argon2.hash("motdepasse123") } });
    await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });
    const child = await prisma.childProfile.create({ data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: await argon2.hash("1234") } });
    const stranger = await prisma.childProfile.create({ data: { householdId: other.id, displayName: "Autre", ageBand: "AGE_8_9", avatarId: "aventurier-02", pinHash: await argon2.hash("1234") } });

    const post = (path: string, body: unknown, cookie?: string) => fetch(`${base}${path}`, { method: "POST", headers: { ...json, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
    const patch = (path: string, body: unknown, cookie?: string) => fetch(`${base}${path}`, { method: "PATCH", headers: { ...json, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
    try {
      const login = await post("/auth/continue", { email, password: "motdepasse123" });
      expect(login.status).toBe(200);
      const parentCookie = cookies(login);
      expect((await patch("/child/me/frame", { frameId: "none" }, parentCookie)).status).toBe(401);
      expect((await post(`/auth/switch-child/${child.id}`, {}, parentCookie)).status).toBe(409);
      expect((await post("/auth/parent-pin", { password: "incorrect", pin: "2345" }, parentCookie)).status).toBe(401);
      expect((await post("/auth/parent-pin", { password: "motdepasse123", pin: "2345" }, parentCookie)).status).toBe(200);
      expect((await post(`/auth/switch-child/${stranger.id}`, {}, parentCookie)).status).toBe(404);

      const switched = await post(`/auth/switch-child/${child.id}`, {}, parentCookie);
      expect(switched.status).toBe(200);
      const sharedChildCookie = cookies(switched);
      expect((await (await fetch(`${base}/child/me`, { headers: { cookie: sharedChildCookie } })).json() as { child: { frameId: string } }).child.frameId).toBe("none");
      expect((await patch("/child/me/frame", { frameId: "camp" }, sharedChildCookie)).status).toBe(403);
      expect((await patch("/child/me/frame", { frameId: "unknown" }, sharedChildCookie)).status).toBe(400);
      await prisma.childProfile.update({ where: { id: child.id }, data: { currentXp: 550 } });
      expect((await patch("/child/me/frame", { frameId: "camp" }, sharedChildCookie)).status).toBe(200);
      expect((await patch("/child/me/frame", { frameId: "grove" }, sharedChildCookie)).status).toBe(403);
      await prisma.childProfile.update({ where: { id: child.id }, data: { currentXp: 1800 } });
      expect((await patch("/child/me/frame", { frameId: "grove" }, sharedChildCookie)).status).toBe(200);
      expect((await patch("/child/me/frame", { frameId: "observatory" }, sharedChildCookie)).status).toBe(403);
      expect((await (await fetch(`${base}/auth/me`, { headers: { cookie: sharedChildCookie } })).json() as { child: { frameId: string } }).child.frameId).toBe("grove");
      await prisma.childProfile.update({ where: { id: child.id }, data: { currentXp: 6175 } });
      expect((await patch("/child/me/frame", { frameId: "observatory" }, sharedChildCookie)).status).toBe(200);
      expect((await (await fetch(`${base}/child/me`, { headers: { cookie: sharedChildCookie } })).json() as { child: { frameId: string } }).child.frameId).toBe("observatory");
      expect((await post("/auth/exit-child-mode/pin", { pin: "0000" }, sharedChildCookie)).status).toBe(401);
      const back = await post("/auth/exit-child-mode/pin", { pin: "2345" }, sharedChildCookie);
      expect(back.status).toBe(200);
      expect(((await (await fetch(`${base}/auth/me`, { headers: { cookie: cookies(back) } })).json()) as { kind: string }).kind).toBe("parent");

      const issued = await post(`/auth/child-link/create/${child.id}`, {}, parentCookie);
      expect(issued.status).toBe(201);
      const { token } = await issued.json() as { token: string };
      expect((await fetch(`${base}/auth/child-link/${token}`)).status).toBe(200);
      expect((await post("/auth/child-link/redeem", { token, pin: "0000" })).status).toBe(401);
      const redeemed = await post("/auth/child-link/redeem", { token, pin: "1234" });
      expect(redeemed.status).toBe(200);
      expect((await post("/auth/child-link/redeem", { token, pin: "1234" })).status).toBe(404);
      expect((await post("/auth/exit-child-mode/pin", { pin: "2345" }, cookies(redeemed))).status).toBe(403);
      expect(((await (await fetch(`${base}/auth/me`, { headers: { cookie: cookies(redeemed) } })).json()) as { kind: string }).kind).toBe("child");
    } finally {
      await prisma.authThrottle.deleteMany({ where: { key: { in: [`parent:${email}`, `parent-pin:${user.id}`, `child-pin:${child.id}`] } } });
      await prisma.household.deleteMany({ where: { id: { in: [household.id, other.id] } } });
      await prisma.user.delete({ where: { id: user.id } });
      server.close();
    }
  });
});
