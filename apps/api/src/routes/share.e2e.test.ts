import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

describe.skipIf(!process.env.DATABASE_URL)("événements de partage", () => {
  it("accepte la liste blanche et refuse le reste", async () => {
    const server = createApp().listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const ok = await fetch(`${base}/share/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "parent_share_link_copied",
          campaignId: "parent-organic-v1",
          format: "story",
          platform: "copy_link",
        }),
      });
      expect(ok.status).toBe(204);

      const bad = await fetch(`${base}/share/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "share_published", campaignId: "parent-organic-v1" }),
      });
      expect(bad.status).toBe(400);

      const stored = await prisma.shareEvent.findFirst({
        where: { name: "parent_share_link_copied", campaignId: "parent-organic-v1" },
        orderBy: { createdAt: "desc" },
      });
      expect(stored).toBeTruthy();
      expect(JSON.stringify(stored)).not.toMatch(/household|userId|email/i);
    } finally {
      server.close();
    }
  });
});
