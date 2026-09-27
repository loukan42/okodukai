// Interactive check of the development-only level selector; local API and Vite must be running.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const base = "http://localhost:5173";
const out = fileURLToPath(new URL("../../../docs/screenshots", import.meta.url));
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const stages = new Map([[1, "sprout"], [5, "sapling"], [10, "young"], [20, "flowering"], [30, "mature"]]);
const captures = new Map([[375, 5], [768, 10], [1280, 30]]);
await mkdir(out, { recursive: true });

try {
  for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: "fr-FR" });
    const page = await context.newPage();
    const accounts = await (await page.request.get(`${base}/api/dev/accounts`)).json();
    const child = accounts.households[0]?.children.find((entry) => entry.displayName === "Emma") ?? accounts.households[0]?.children[0];
    if (!child) throw new Error("The local demo has no child profile");
    const login = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId: child.childId } });
    if (!login.ok()) throw new Error(`Demo login: HTTP ${login.status()}`);
    const realBefore = await (await page.request.get(`${base}/api/child/me`)).json();

    await page.goto(`${base}/enfant`, { waitUntil: "networkidle" });
    await page.locator(".village-home").waitFor();
    await page.locator(".dev-bar > button").click();
    const select = page.locator("#demo-level-select");
    await select.waitFor();

    for (const [level, tree] of stages) {
      await select.selectOption(String(level));
      await page.locator(`.village-home[data-world-tier="${level}"]`).waitFor();
      await page.waitForFunction((value) => document.querySelector(".village-hud-profile")?.textContent?.includes(`Niv. ${value}`), level);
      const treeSrc = await page.locator(".village-hud-xp .experience-tree img").getAttribute("src");
      if (!treeSrc?.includes(`xp-tree-${tree}`)) throw new Error(`${width}px level ${level}: wrong tree ${treeSrc}`);
      const layer = page.locator(".village-tier-layer img");
      if (await layer.count() !== (level === 1 ? 0 : 1)) throw new Error(`${width}px level ${level}: wrong valley layer`);
      if (level > 1) await layer.evaluate((image) => image.decode());
      if (level === 30) await page.waitForFunction(() => {
        const track = document.querySelector(".village-hud-xp .progress-track")?.getBoundingClientRect();
        const fill = document.querySelector(".village-hud-xp .progress-fill")?.getBoundingClientRect();
        return Boolean(track && fill && Math.abs(track.width - fill.width) < 1);
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${width}px level ${level}: horizontal overflow ${overflow}px`);
      if (level === captures.get(width)) {
        const file = `${out}/demo-level-${level}-${width}.png`;
        await page.screenshot({ path: file });
        console.log(file);
        await page.locator(".dev-bar > button").click();
        const viewFile = `${out}/demo-level-view-${level}-${width}.png`;
        await page.screenshot({ path: viewFile });
        console.log(viewFile);
        await page.locator(".dev-bar > button").click();
      }
    }

    await select.selectOption("10");
    await page.locator('.village-home[data-world-tier="10"]').waitFor();
    await page.locator(".dev-bar > button").click();
    await page.goto(`${base}/enfant/profil`, { waitUntil: "networkidle" });
    await page.locator(".character-level-line").getByText("Niveau 10").waitFor();
    await page.locator(".demo-preview-note").waitFor();
    if (!await page.locator(".character-frame-choice").nth(1).isDisabled()) throw new Error(`${width}px: preview allowed a frame change`);
    if (width === 375) {
      const profileFile = `${out}/demo-level-profile-10-375.png`;
      await page.screenshot({ path: profileFile, fullPage: true });
      console.log(profileFile);
    }

    await page.locator(".dev-bar > button").click();
    await page.locator("#demo-level-select").selectOption("");
    await page.waitForFunction((value) => document.querySelector(".character-level-line")?.textContent?.includes(`Niveau ${value}`), realBefore.level.level);
    if (await page.locator(".demo-preview-note").count()) throw new Error(`${width}px: preview note remained after reset`);
    const realAfter = await (await page.request.get(`${base}/api/child/me`)).json();
    if (realAfter.level.totalXp !== realBefore.level.totalXp) throw new Error(`${width}px: preview changed stored XP`);
    await context.close();
  }
} finally {
  await browser.close();
}
