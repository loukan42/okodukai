import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const json = { "content-type": "application/json" };
type Me = { user: { email: string; displayName: string }; household: { name: string; onboardingCompleted: boolean } };
const cookieFrom = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

describe.skipIf(!process.env.DATABASE_URL)("créer un compte ou se connecter", () => {
  it("crée le compte si l'email est inconnu, puis connecte avec le même formulaire", async () => {
    const email = `continue-${randomUUID()}@example.test`;
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const tooShort = await fetch(`${base}/auth/continue`, { method: "POST", headers: json, body: JSON.stringify({ email, password: "court" }) });
      expect(tooShort.status).toBe(400);

      const created = await fetch(`${base}/auth/continue`, { method: "POST", headers: json, body: JSON.stringify({ email: `  ${email.toUpperCase()} `, password: "motdepasse123" }) });
      expect(created.status).toBe(201);
      expect(await created.json()).toEqual({ outcome: "created", onboardingCompleted: false });
      const cookie = cookieFrom(created);

      const me = (await (await fetch(`${base}/auth/me`, { headers: { cookie } })).json()) as Me;
      expect(me.user.email).toBe(email);
      expect(me.household).toEqual({ name: "Ma famille", onboardingCompleted: false });

      const profile = await fetch(`${base}/household/profile`, { method: "PUT", headers: { ...json, cookie }, body: JSON.stringify({ parentName: " Camille ", householdName: "Famille Durand" }) });
      expect(await profile.json()).toEqual({ parentName: "Camille", householdName: "Famille Durand" });
      await fetch(`${base}/household/onboarding/complete`, { method: "POST", headers: { cookie } });
      await fetch(`${base}/household/onboarding/complete`, { method: "POST", headers: { cookie } });

      const wrong = await fetch(`${base}/auth/continue`, { method: "POST", headers: json, body: JSON.stringify({ email, password: "pas-le-bon" }) });
      expect(wrong.status).toBe(401);

      const signedIn = await fetch(`${base}/auth/continue`, { method: "POST", headers: json, body: JSON.stringify({ email: email.toUpperCase(), password: "motdepasse123" }) });
      expect(signedIn.status).toBe(200);
      expect(await signedIn.json()).toEqual({ outcome: "signed_in", onboardingCompleted: true });
      const me2 = (await (await fetch(`${base}/auth/me`, { headers: { cookie: cookieFrom(signedIn) } })).json()) as Me;
      expect(me2.user.displayName).toBe("Camille");
      expect(me2.household.name).toBe("Famille Durand");
    } finally {
      const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
      if (user) {
        await prisma.household.deleteMany({ where: { id: { in: user.memberships.map((m) => m.householdId) } } });
        await prisma.user.delete({ where: { id: user.id } });
      }
      server.close();
    }
  });
});
