// Revue des paliers de la Vallée d'Okodukai sur l'accueil enfant du foyer de démo local.
// API et Vite démarrés : node apps/web/scripts/capture-child-valley-tiers.mjs
// Le niveau renvoyé par /child/me est remplacé dans le navigateur seulement (fixture visuelle en lecture
// seule) : la base et l'XP de l'enfant ne changent pas.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const base = "http://localhost:5173";
const out = fileURLToPath(new URL("../../../docs/screenshots", import.meta.url));
const backgrounds = fileURLToPath(new URL("../public/assets/backgrounds", import.meta.url));
const tiers = [1, 5, 10, 20, 30];
const delivered = (tier) => tier > 1 && existsSync(`${backgrounds}/hub-tier-${tier}-wide-1280.webp`) && existsSync(`${backgrounds}/hub-tier-${tier}-tall-720.webp`);
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
await mkdir(out, { recursive: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: "fr-FR" });
    const page = await context.newPage();
    const accountsResponse = await page.request.get(`${base}/api/dev/accounts`);
    if (!accountsResponse.ok()) throw new Error(`Demo accounts: HTTP ${accountsResponse.status()}`);
    const accounts = await accountsResponse.json();
    const child = accounts.households[0]?.children.find((entry) => entry.displayName === "Emma") ?? accounts.households[0]?.children[0];
    if (!child) throw new Error("The local demo has no child profile");
    const loginResponse = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId: child.childId } });
    if (!loginResponse.ok()) throw new Error(`Demo login: HTTP ${loginResponse.status()}`);
    try {
      for (const tier of tiers) {
        await page.unroute("**/api/child/me");
        await page.route("**/api/child/me", async (route) => {
          const response = await route.fetch();
          const body = await response.json();
          await route.fulfill({ response, json: { ...body, level: { ...body.level, level: tier } } });
        });
        await page.goto(`${base}/enfant`, { waitUntil: "networkidle" });
        await page.locator(`.village-home[data-world-tier="${tier}"]`).waitFor();
        await page.locator(".village-landscape img").evaluate((image) => image.decode());
        const layer = page.locator(".village-tier-layer img");
        if (delivered(tier) !== (await layer.count()) > 0) {
          throw new Error(`Tier ${tier} ${width}px: layer ${delivered(tier) ? "missing (add the tier to tierLayers in Home.tsx)" : "shown without its WebP files"}`);
        }
        if (delivered(tier)) {
          await layer.evaluate((image) => image.decode());
          const src = await layer.evaluate((image) => image.currentSrc);
          if (!src.includes(`hub-tier-${tier}-${width <= 640 ? "tall" : "wide"}-`)) throw new Error(`Tier ${tier} ${width}px: unexpected layer ${src}`);
          const aligned = await page.evaluate(() => {
            const layerBox = document.querySelector(".village-tier-layer")?.getBoundingClientRect();
            const landscapeBox = document.querySelector(".village-landscape")?.getBoundingClientRect();
            const clickable = getComputedStyle(document.querySelector(".village-tier-layer")).pointerEvents !== "none";
            return !clickable && ["top", "left", "width", "height"].every((key) => Math.abs(layerBox[key] - landscapeBox[key]) < 0.5);
          });
          if (!aligned) throw new Error(`Tier ${tier} ${width}px: layer is clickable or not aligned with the landscape`);
        }
        await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
        // Chaque lieu et le personnage restent la cible du toucher en leur centre.
        const covered = await page.evaluate(() => [...document.querySelectorAll(".village-place, .village-character")].filter((target) => {
          const box = target.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return !hit || !target.contains(hit);
        }).map((target) => target.className));
        if (covered.length) throw new Error(`Tier ${tier} ${width}px: covered targets ${covered.join(", ")}`);
        const hudVisible = await page.evaluate(() => {
          const hud = document.querySelector(".village-hud")?.getBoundingClientRect();
          return Boolean(hud && hud.width > 0 && hud.right <= window.innerWidth);
        });
        if (!hudVisible) throw new Error(`Tier ${tier} ${width}px: HUD is not visible`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) throw new Error(`Tier ${tier} ${width}px: horizontal overflow ${overflow}px`);
        const file = `${out}/child-valley-tier-${tier}-${width}.png`;
        await page.screenshot({ path: file });
        console.log(file, delivered(tier) ? "" : "(fond seul)");
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
