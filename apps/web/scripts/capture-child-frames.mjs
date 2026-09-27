// Read-only visual fixture for portrait frame unlocks; requires local API and Vite.
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
    const child = accounts.households[0]?.children.find((entry) => entry.displayName === "Emma") ?? accounts.households[0]?.children[0];
    if (!child) throw new Error("The local demo has no child profile");
    const loginResponse = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId: child.childId } });
    if (!loginResponse.ok()) throw new Error(`Demo login: HTTP ${loginResponse.status()}`);

    let chosenFrame = "grove";
    await page.route("**/api/auth/me", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, child: { ...body.child, frameId: chosenFrame } } });
    });
    await page.route("**/api/child/me", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, level: { ...body.level, level: 10, title: "astronome", nextTitle: { level: 12, code: "architecte" }, nextReward: { boosters: 1, title: null }, xpIntoLevel: 20, xpForNextLevel: 325, totalXp: 1820 } } });
    });
    await page.route("**/api/child/me/frame", async (route) => {
      chosenFrame = route.request().postDataJSON().frameId;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ frameId: chosenFrame }) });
    });
    await page.goto(`${base}/enfant/profil`, { waitUntil: "networkidle" });
    await page.locator(".character-frame-choice").last().waitFor({ state: "visible" });
    await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
    if (!await page.locator(".character-frame-choice").last().isDisabled()) throw new Error(`${width}px: level 20 frame must be locked`);
    if (await page.locator(".character-frame-choice").nth(2).getAttribute("aria-pressed") !== "true") throw new Error(`${width}px: equipped frame is not selected`);
    const frames = page.locator(".character-frame-choice .avatar-frame-art");
    for (const image of await frames.all()) await image.evaluate((element) => element.decode());
    const broken = await frames.evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).length);
    if (broken) throw new Error(`${width}px: ${broken} frame images did not load`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`${width}px: horizontal overflow ${overflow}px`);
    const file = `${out}/child-portrait-frames-${width}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);

    await page.locator(".character-frame-choice").nth(1).click();
    await page.waitForFunction(() => document.querySelectorAll(".character-frame-choice")[1]?.getAttribute("aria-pressed") === "true");
    if (await page.locator(".child-identity .avatar-frame-art").count() !== 1) throw new Error(`${width}px: header did not show equipped frame`);
    await context.close();
  }
} finally {
  await browser.close();
}
