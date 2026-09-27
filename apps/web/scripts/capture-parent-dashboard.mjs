// Capture du tableau de bord parent montrée par la landing (section « Vous gardez les règles »),
// en français ou en anglais : node apps/web/scripts/capture-parent-dashboard.mjs [fr|en]
// Prérequis : API et site lancés en local avec le foyer de démonstration (npm run db:seed).
// Chromium : variable CHROMIUM_PATH, comme les scripts du studio 3D.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = "http://localhost:5173";
const LANG = process.argv[2] === "fr" ? "fr" : "en";
const NAME = LANG === "fr" ? "parent-dashboard" : "parent-dashboard-en";
const OUT = fileURLToPath(new URL("../public/assets/screens", import.meta.url));
// Données du foyer de démonstration, écrites en français en base : traduites pour l'image seulement.
const DEMO_TEXT = {
  "Ranger sa chambre": "Tidy your room",
};

const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, locale: LANG === "fr" ? "fr-FR" : "en-GB" });
await context.addInitScript((l) => localStorage.setItem("okodukai:locale", l), LANG);
const page = await context.newPage();
page.on("pageerror", (e) => console.error(String(e)));
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const accounts = await (await page.request.get(`${BASE}/api/dev/accounts`)).json();
await page.request.post(`${BASE}/api/dev/login-as-parent`, { data: { userId: accounts.households[0].parents[0].userId } });
await page.goto(BASE + "/parent", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.evaluate((map) => {
  // L'outil Démo (développement seulement) n'apparaît pas sur l'image.
  document.querySelectorAll('div[style*="position: fixed"]').forEach((el) => {
    if (el.textContent?.includes("Démo") || el.textContent?.includes("Demo")) el.remove();
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    for (const [fr, en] of Object.entries(map)) if (node.nodeValue?.includes(fr)) node.nodeValue = node.nodeValue.replace(fr, en);
  }
}, LANG === "en" ? DEMO_TEXT : {});
const png = await page.screenshot();
await sharp(png).resize(1440, 960).webp({ quality: 82 }).toFile(`${OUT}/${NAME}-1440.webp`);
await sharp(png).resize(960, 640).webp({ quality: 82 }).toFile(`${OUT}/${NAME}-960.webp`);
console.log("ok");
await browser.close();
