import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import argon2 from "argon2";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { childPinThrottleKey, parentThrottleKey } from "../lib/throttle.js";
import { DEVICE_COOKIE, signDevice } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const json = { "content-type": "application/json" };

describe.skipIf(!process.env.DATABASE_URL)("limitation des tentatives de connexion", () => {
  it("bloque le PIN enfant et le mot de passe parent après trop d'essais, même en parallèle", async () => {
    const code = `throttle-${randomUUID()}`;
    const email = `${code}@example.test`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const household = await prisma.household.create({ data: { name: code } });
    const user = await prisma.user.create({ data: { email, displayName: "Camille", passwordHash: await argon2.hash("motdepasse123") } });
    const child = await prisma.childProfile.create({
      data: { householdId: household.id, displayName: "Léo", ageBand: "AGE_8_9", avatarId: "aventurier-01", pinHash: await argon2.hash("1234") },
    });
    const pinKey = childPinThrottleKey(child.id);
    const parentKey = parentThrottleKey(email);
    const device = { ...json, cookie: `${DEVICE_COOKIE}=${signDevice(household.id)}` };
    const pin = (value: string) =>
      fetch(`${base}/auth/households/${household.id}/children/${child.id}/login`, { method: "POST", headers: device, body: JSON.stringify({ pin: value }) });
    const signIn = (path: string, password: string) => fetch(`${base}${path}`, { method: "POST", headers: json, body: JSON.stringify({ email, password }) });
    const endLock = (key: string) =>
      prisma.authThrottle.update({ where: { key }, data: { lockedUntil: new Date(Date.now() - 1000), windowStartedAt: new Date(Date.now() - 1000) } });

    try {
      await prisma.householdMembership.create({ data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" } });

      // Sans appareil familial (cookie posé à la connexion d'un parent) : ni liste des profils, ni PIN.
      expect((await fetch(`${base}/auth/households/${household.id}/children`)).status).toBe(403);
      expect((await fetch(`${base}/auth/households/${household.id}/children/${child.id}/login`, { method: "POST", headers: json, body: JSON.stringify({ pin: "1234" }) })).status).toBe(403);
      const otherDevice = { cookie: `${DEVICE_COOKIE}=${signDevice(randomUUID())}` };
      expect((await fetch(`${base}/auth/households/${household.id}/children`, { headers: otherDevice })).status).toBe(403);
      expect((await fetch(`${base}/auth/households/${household.id}/children`, { headers: device })).status).toBe(200);

      // PIN : 4 erreurs, la 5e bloque, et même le bon code attend la fin du blocage.
      for (let i = 0; i < 4; i++) expect((await pin("0000")).status).toBe(401);
      const locked = await pin("0000");
      expect(locked.status).toBe(429);
      expect(Number(locked.headers.get("retry-after"))).toBe(300);
      expect(((await locked.json()) as { error: string }).error).toBe("Trop d'essais pour l'instant. Tu pourras réessayer dans 5 minutes.");
      expect((await pin("1234")).status).toBe(429);

      await endLock(pinKey);
      expect((await pin("1234")).status).toBe(200);
      expect(await prisma.authThrottle.count({ where: { key: pinKey } })).toBe(0);

      // Rafale en parallèle : le quota tient (compté sous verrou avant la vérification).
      const burst = await Promise.all(Array.from({ length: 8 }, () => pin("0000")));
      const statuses = burst.map((r) => r.status).sort();
      expect(statuses).toEqual([401, 401, 401, 401, 429, 429, 429, 429]);

      // Parent : la connexion et la sortie du mode enfant partagent le même compteur.
      for (let i = 0; i < 9; i++) expect((await signIn("/auth/continue", "pas-le-bon")).status).toBe(401);
      const parentLocked = await signIn("/auth/exit-child-mode", "pas-le-bon");
      expect(parentLocked.status).toBe(429);
      expect(((await parentLocked.json()) as { error: string }).error).toBe("Trop de tentatives pour ce compte. Réessayez dans 15 minutes.");
      expect((await signIn("/auth/continue", "motdepasse123")).status).toBe(429);

      await endLock(parentKey);
      expect((await signIn("/auth/continue", "motdepasse123")).status).toBe(200);
      expect(await prisma.authThrottle.count({ where: { key: parentKey } })).toBe(0);

      // Un e-mail inconnu ne crée pas de compteur : la table ne grossit pas au gré des essais.
      const unknown = `inconnu-${email}`;
      await fetch(`${base}/auth/exit-child-mode`, { method: "POST", headers: json, body: JSON.stringify({ email: unknown, password: "pas-le-bon" }) });
      expect(await prisma.authThrottle.count({ where: { key: parentThrottleKey(unknown) } })).toBe(0);
    } finally {
      await prisma.authThrottle.deleteMany({ where: { key: { in: [pinKey, parentKey] } } });
      await prisma.household.delete({ where: { id: household.id } });
      await prisma.user.delete({ where: { id: user.id } });
      server.close();
    }
  });
});

describe.skipIf(!process.env.DATABASE_URL)("limite par adresse (relais signé)", () => {
  it("borne les essais répartis sur plusieurs comptes et ignore un en-tête non signé", async () => {
    const { createHmac } = await import("node:crypto");
    const previous = process.env.PROXY_SECRET;
    process.env.PROXY_SECRET = "secret-du-relais";
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}-${randomUUID()}`;
    const signed = { "content-type": "application/json", "x-okodukai-client-ip": ip, "x-okodukai-client-ip-sig": createHmac("sha256", "secret-du-relais").update(ip).digest("hex") };
    const forged = { ...signed, "x-okodukai-client-ip-sig": "0".repeat(64) };
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    // Mot de passe trop court pour un compte inconnu : réponse 400 immédiate, sans rien créer.
    const tryOnce = (headers: Record<string, string>) => fetch(`${base}/auth/continue`, { method: "POST", headers, body: JSON.stringify({ email: `x-${randomUUID()}@example.test`, password: "court" }) });
    try {
      for (let i = 0; i < 29; i++) expect((await tryOnce(signed)).status).toBe(400);
      const last = await tryOnce(signed);
      expect(last.status).toBe(400);
      const blocked = await tryOnce(signed);
      expect(blocked.status).toBe(429);
      expect(((await blocked.json()) as { error: string }).error).toContain("depuis cet appareil");
      expect((await tryOnce(forged)).status).toBe(400);
    } finally {
      await prisma.authThrottle.deleteMany({ where: { key: `ip:${ip}` } });
      if (previous === undefined) delete process.env.PROXY_SECRET;
      else process.env.PROXY_SECRET = previous;
      server.close();
    }
  });
});
