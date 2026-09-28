// Revue des personnages du roster sur la place et le profil du foyer de démo local.
// API et Vite démarrés : node apps/web/scripts/capture-child-characters.mjs 01 04
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ids = process.argv.slice(2);
if (!ids.length || ids.some((id) => !/^\d{2}$/.test(id) || Number(id) < 1 || Number(id) > 16)) {
  throw new Error("Give one or more avatar numbers from 01 to 16.");
}

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
    const child = accounts.households[0]?.children.find((entry) => entry.displayName === "Emma") ?? accounts.households[0]?.children[0];
    if (!child) throw new Error("The local demo has no child profile");
    const loginResponse = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId: child.childId } });
    if (!loginResponse.ok()) throw new Error(`Demo login: HTTP ${loginResponse.status()}`);
    const originalAvatar = child.avatarId;
    try {
      for (const id of ids) {
        const avatarId = `aventurier-${id}`;
        const update = await page.request.patch(`${base}/api/child/me/avatar`, { data: { avatarId } });
        if (!update.ok()) throw new Error(`Avatar ${id}: HTTP ${update.status()}`);
        for (const [screen, route] of [["home", "/enfant"], ["profile", "/enfant/profil"]]) {
          await page.goto(base + route, { waitUntil: "networkidle" });
          const character = page.locator(screen === "home" ? ".village-character-art" : ".character-figure-art").first();
          await character.waitFor({ state: "visible" });
          if (await character.evaluate((element) => element instanceof HTMLImageElement)) {
            await character.evaluate((image) => image.decode());
          }
          const imageName = await character.getAttribute("src");
          const expectedPose = screen === "home" ? "happy" : "proud";
          if (!imageName?.includes(`adventurer-${id}-${expectedPose}-`)) throw new Error(`${screen} ${width}px: expected full-body avatar ${id} in ${expectedPose} pose, got ${imageName}`);
          if (screen === "profile") {
            const fit = await page.evaluate(() => {
              const scene = document.querySelector(".character-scene")?.getBoundingClientRect();
              const figure = document.querySelector(".character-figure-art")?.getBoundingClientRect();
              return Boolean(scene && figure && figure.top >= scene.top && figure.bottom <= scene.bottom);
            });
            if (!fit) throw new Error(`Profile ${width}px: avatar ${id} escapes the scene`);
          }
          await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (overflow > 1) throw new Error(`${screen} ${width}px: horizontal overflow ${overflow}px`);
          const file = `${out}/child-character-${id}-${screen}-${width}.png`;
          await page.screenshot({ path: file });
          console.log(file);
        }
      }
    } finally {
      await page.request.patch(`${base}/api/child/me/avatar`, { data: { avatarId: originalAvatar } });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
