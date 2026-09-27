import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { signSession } from "../lib/auth.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe("aperçu des niveaux en développement", () => {
  it("utilise la courbe du serveur et refuse les niveaux invalides ou une session parent", async () => {
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const householdId = randomUUID();
    const cookie = `okodukai_session=${signSession({ kind: "child", childId: randomUUID(), householdId })}`;
    const parent = `okodukai_session=${signSession({ kind: "parent", userId: randomUUID(), householdId, role: "PARENT_ADMIN" })}`;

    try {
      expect((await fetch(`${base}/dev/level-preview?level=5`)).status).toBe(401);
      expect((await fetch(`${base}/dev/level-preview?level=5`, { headers: { cookie: parent } })).status).toBe(401);
      for (const value of ["0", "31", "1.5", "abc"]) {
        expect((await fetch(`${base}/dev/level-preview?level=${value}`, { headers: { cookie } })).status).toBe(400);
      }
      for (const [requested, totalXp, title] of [
        [1, 0, "novice"],
        [5, 550, "stratege"],
        [10, 1800, "astronome"],
        [20, 6175, "legende"],
        [30, 13050, "legende"],
      ] as const) {
        const response = await fetch(`${base}/dev/level-preview?level=${requested}`, { headers: { cookie } });
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toContain("no-store");
        const body = await response.json() as { level: { level: number; totalXp: number; xpIntoLevel: number; title: string; xpForNextLevel: number } };
        expect(body.level).toMatchObject({ level: requested, totalXp, xpIntoLevel: 0, title });
        if (requested === 30) expect(body.level.xpForNextLevel).toBe(0);
      }
    } finally {
      server.close();
    }
  });
});
