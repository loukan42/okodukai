// Revue du choix d'une illustration d'objectif avec une fixture navigateur : aucune écriture en base.
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
    const accounts = await (await page.request.get(`${base}/api/dev/accounts`)).json();
    const child = accounts.households[0]?.children.find((entry) => entry.displayName === "Emma") ?? accounts.households[0]?.children[0];
    if (!child) throw new Error("Aucun enfant de démo");
    const login = await page.request.post(`${base}/api/dev/login-as-child`, { data: { childId: child.childId } });
    if (!login.ok()) throw new Error(`Connexion de démo : ${login.status()}`);
    await page.route("**/api/child/money", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.goals = [{ id: "apercu-illustration", title: "Mon vélo", targetCoins: 80, rewardId: null, illustrationKey: "bicycle", present: 20, missing: 60, reached: false, achievedAt: null }];
      await route.fulfill({ response, json: body });
    });
    await page.goto(`${base}/enfant/argent/coffre`, { waitUntil: "networkidle" });
    const goal = page.locator(".money-goal").first();
    const destination = goal.locator(".goal-journey-destination");
    await destination.evaluate((image) => image.decode());
    if (!(await destination.getAttribute("src"))?.includes("reward-bicycle-256")) throw new Error(`Objectif ${width}px : illustration incorrecte`);
    const save = page.getByRole("button", { name: "Enregistrer l'objectif" });
    if (await save.isEnabled()) throw new Error(`Formulaire ${width}px : image non choisie`);
    await page.getByLabel("Pour quoi mets-tu de côté ?").fill("Une sortie");
    await page.getByRole("button", { name: "Cinéma" }).click();
    if (!(await save.isEnabled())) throw new Error(`Formulaire ${width}px : image choisie ignorée`);
    if (await page.locator(".money-goal-artwork-option--selected").count() !== 1) throw new Error(`Formulaire ${width}px : sélection ambiguë`);
    await page.addStyleTag({ content: ".dev-bar { display: none !important; }" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`Coffre ${width}px : débordement ${overflow}px`);
    const journeyPath = `${out}/child-goal-artwork-journey-${width}.png`;
    const formPath = `${out}/child-goal-artwork-choice-${width}.png`;
    await goal.screenshot({ path: journeyPath });
    await page.locator(".money-goal-form").screenshot({ path: formPath });
    console.log(journeyPath, formPath);
    await context.close();
  }
} finally { await browser.close(); }
