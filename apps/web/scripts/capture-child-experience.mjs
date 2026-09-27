// Captures de l'arbre d'XP dans le foyer de démonstration local.
// API et Vite doivent être lancés : node apps/web/scripts/capture-child-experience.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const base = "http://localhost:5173";
const out = fileURLToPath(new URL("../../../docs/screenshots", import.meta.url));
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
    const childId = accounts.households[0]?.children[0]?.childId;
    if (!childId) throw new Error("The local demo has no child profile");
    const loginResponse = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId } });
    if (!loginResponse.ok()) throw new Error(`Demo login: HTTP ${loginResponse.status()}`);
    await page.addInitScript(() => localStorage.setItem("okodukai:locale", "fr"));
    for (const [screen, route, ready] of [["home", "/enfant", ".experience-tree img"], ["profile", "/enfant/profil#xp", ".experience-tree img"], ["account", "/enfant/argent", ".money-passbook"]]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.locator(ready).first().waitFor({ state: "visible" });
      if (screen !== "account") await page.locator(ready).first().evaluate((image) => image.decode());
      await page.addStyleTag({ content: ".dev-launcher, [data-dev-tools] { display: none !important; }" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${screen} ${width}px: horizontal overflow ${overflow}px`);
      const file = `${out}/child-experience-${screen}-${width}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
