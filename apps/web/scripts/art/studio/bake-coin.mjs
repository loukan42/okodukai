// Textures de la pièce 3D de la landing (rendue en direct dans le navigateur du visiteur) :
// les cartes de normales et de rugosité sont calculées une fois ici, puis servies en WebP,
// pour ne pas refaire ce calcul pixel par pixel sur un téléphone.
//   node scripts/art/studio/bake-coin.mjs
import { build } from "esbuild";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "..", "public", "assets", "coins");

const entry = `
import { engravedCoinFace, hammeredMetal } from "./lib/textures.js";
window.bake = () => {
  const face = engravedCoinFace({ size: 512 });
  const edge = hammeredMetal({ size: 256, seed: 5, dents: 10, scratches: 16 });
  const url = (t) => t.image.toDataURL("image/png");
  return { "face-normal": url(face.normal), "face-roughness": url(face.roughness), "edge-normal": url(edge.normal), "edge-roughness": url(edge.roughness) };
};`;

const bundle = await build({ stdin: { contents: entry, resolveDir: here, loader: "js" }, bundle: true, format: "iife", write: false, platform: "browser", target: "es2022", logLevel: "error" });
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const maps = await page.evaluate(() => window.bake());
await browser.close();
for (const [name, dataUrl] of Object.entries(maps)) {
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const file = join(out, `okodukai-coin-${name}.webp`);
  // Normales : presque sans perte, sinon la gravure se couvre d'artefacts.
  await sharp(png).webp(name.includes("normal") ? { quality: 94, effort: 6 } : { quality: 86, effort: 6 }).toFile(file);
  console.log(file);
}
