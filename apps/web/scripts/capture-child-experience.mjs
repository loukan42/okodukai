// Captures des scènes enfant dans le foyer de démonstration local.
// API et Vite doivent être lancés : node apps/web/scripts/capture-child-experience.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const base = "http://localhost:5173";
const out = fileURLToPath(new URL("../../../docs/screenshots", import.meta.url));
const shopOnly = process.argv.includes("--shop-only");
const questsOnly = process.argv.includes("--quests-only");
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
    const children = accounts.households[0]?.children ?? [];
    const childId = (children.find((child) => child.displayName === "Emma") ?? children[0])?.childId;
    if (!childId) throw new Error("The local demo has no child profile");
    const loginResponse = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId } });
    if (!loginResponse.ok()) throw new Error(`Demo login: HTTP ${loginResponse.status()}`);
    if (questsOnly) {
      // L'état mutable du foyer de démo peut ne plus contenir de quêtes actives.
      // Cette fixture visuelle couvre les quatre illustrations sans modifier la base.
      const questSamples = [
        ["MAISON", "Vider le lave-vaisselle", "FACILE"],
        ["AUTONOMIE", "Ranger sa chambre", "MOYENNE"],
        ["ENTRAIDE", "Mettre la table", "FACILE"],
        ["APPRENTISSAGE", "Lire 15 minutes", "IMPORTANTE"],
      ].map(([category, title, difficulty], index) => ({ id: `visual-quest-${index}`, category, title, difficulty, description: null, status: "DISPONIBLE", recurrence: "UNIQUE", rewardCoins: 10, rewardXp: 15 }));
      await page.route("**/api/child/quests", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ quests: questSamples }) }));
    }
    await page.addInitScript(() => localStorage.setItem("okodukai:locale", "fr"));
    for (const [screen, route, ready] of [["home", "/enfant", ".experience-tree img"], ["profile", "/enfant/profil#xp", ".experience-tree img"], ["account", "/enfant/argent", ".money-passbook"], ["goal", "/enfant/argent/coffre", ".money-goal"]]) {
      if (shopOnly || questsOnly) break;
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.locator(ready).first().waitFor({ state: "visible" });
      if (screen === "home" || screen === "profile") await page.locator(ready).first().evaluate((image) => image.decode());
      await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${screen} ${width}px: horizontal overflow ${overflow}px`);
      const file = `${out}/child-experience-${screen}-${width}.png`;
      if (screen === "goal") await page.locator(".money-goal").first().screenshot({ path: file });
      else await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    for (const [screen, route, ready] of [["quests", "/enfant/quetes", ".quest-journal"], ["vault", "/enfant/argent/coffre", ".money-vault-hero"], ["shop", "/enfant/boutique", ".reward-grid"], ["observatory", "/enfant/argent/investir", ".observatory-head"]]) {
      if ((shopOnly && screen !== "shop") || (questsOnly && screen !== "quests")) continue;
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.locator(ready).first().waitFor({ state: "visible" });
      if (screen === "quests") {
        const images = page.locator(".quest-sheet-index .object-art");
        await images.first().evaluate((image) => image.decode());
        const broken = await images.evaluateAll((items) => items.filter((image) => !image.complete || image.naturalWidth === 0).length);
        if (broken) throw new Error(`Quests ${width}px: ${broken} illustrations did not load`);
      }
      if (screen === "shop") {
        await page.locator(".reward-item-art img").first().waitFor({ state: "visible" });
        const broken = await page.locator(".reward-item-art img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).length);
        if (broken) throw new Error(`Shop ${width}px: ${broken} reward illustrations did not load`);
      }
      await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${screen} ${width}px: horizontal overflow ${overflow}px`);
      const file = `${out}/child-experience-${screen}-${width}.png`;
      await page.screenshot({ path: file, fullPage: screen === "quests" });
      console.log(file);
      if (screen === "shop") {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const endFile = `${out}/child-experience-shop-end-${width}.png`;
        await page.screenshot({ path: endFile });
        console.log(endFile);
      }
    }
    if (shopOnly || questsOnly) { await context.close(); continue; }
    await page.goto(`${base}/enfant/argent/investir/bibliotheque`, { waitUntil: "networkidle" });
    await page.locator(".learning-module").first().waitFor({ state: "visible" });
    await page.locator(".learning-module-art").first().evaluate((image) => image.decode());
    await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
    for (const screen of ["learning-list", "learning-detail"]) {
      if (screen === "learning-detail") {
        await page.locator(".learning-module").first().click();
        await page.locator(".learning-detail-stage img").first().evaluate((image) => image.decode());
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${screen} ${width}px: horizontal overflow ${overflow}px`);
      const file = `${out}/child-experience-${screen}-${width}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
    const universesResponse = await page.request.get(`${base}/api/child/universes`);
    if (!universesResponse.ok()) throw new Error(`Universes: HTTP ${universesResponse.status()} ${await universesResponse.text()}`);
    const { universes } = await universesResponse.json();
    const albumWithCards = universes.find((universe) => universe.title.includes("explorateurs")) ?? universes[0];
    const albumWithoutCards = universes.find((universe) => universe.title.includes("époques")) ?? universes[1];
    if (!albumWithCards || !albumWithoutCards) throw new Error("The demo needs at least two card universes");
    for (const [screen, route, ready] of [["collection", "/enfant/collection", ".collection-universes"], ["album", `/enfant/collection/${albumWithCards.id}`, ".album-grid"], ["album-empty", `/enfant/collection/${albumWithoutCards.id}`, ".album-filter"]]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.locator(ready).first().waitFor({ state: "visible" });
      if (screen === "album-empty") {
        await page.locator(".album-filter button").nth(1).click();
        await page.locator(".empty-state--art").waitFor({ state: "visible" });
      }
      if (screen === "collection") {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
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
