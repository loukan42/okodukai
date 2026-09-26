// Studio de rendu 3D du pipeline : une scène (module ESM qui importe three) est
// empaquetée avec esbuild, exécutée dans Chromium (WebGL2), puis capturée.
// La scène exporte `render(canvas, params)` et doit résoudre quand l'image est prête.
import { build } from "esbuild";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let browserPromise;
function browser() {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  browserPromise ??= chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  return browserPromise;
}

export async function closeStudio() {
  if (browserPromise) (await browserPromise).close();
  browserPromise = undefined;
}

const bundles = new Map();
async function bundle(scenePath) {
  if (!bundles.has(scenePath)) {
    const out = await build({ entryPoints: [scenePath], bundle: true, format: "iife", globalName: "Scene", write: false, platform: "browser", target: "es2022", logLevel: "error" });
    bundles.set(scenePath, out.outputFiles[0].text);
  }
  return bundles.get(scenePath);
}

/**
 * Rend une scène et renvoie un PNG (Buffer). `supersample` multiplie la résolution
 * interne ; l'image est ensuite réduite avec un filtre Lanczos (bords nets).
 */
export async function renderScene(scenePath, { width, height, params = {}, supersample = 2, transparent = true, timeout = 240000 }) {
  const code = await bundle(scenePath);
  const b = await browser();
  const W = Math.round(width * supersample);
  const H = Math.round(height * supersample);
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("[scene]", e.message));
  page.on("console", (m) => m.type() === "error" && console.error("[scene]", m.text()));
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}canvas{display:block}</style></head><body><canvas id="c" width="${W}" height="${H}" style="width:${W}px;height:${H}px"></canvas></body></html>`);
  await page.addScriptTag({ content: code });
  await page.evaluate(
    async ({ params }) => {
      await window.Scene.render(document.getElementById("c"), params);
    },
    { params: { ...params, width: W, height: H } }
  );
  const png = await page.locator("#c").screenshot({ type: "png", omitBackground: transparent, timeout });
  await page.close();
  if (supersample === 1) return png;
  return sharp(png).resize({ width, height, kernel: "lanczos3" }).png().toBuffer();
}

/** Écrit un PNG en WebP aux largeurs demandées : `<outBase>-<w>.webp`. */
export async function exportWebp(png, outBase, widths, quality = 86) {
  mkdirSync(dirname(outBase), { recursive: true });
  const written = [];
  for (const w of widths) {
    const file = `${outBase}-${w}.webp`;
    await sharp(png).resize({ width: w, kernel: "lanczos3" }).webp({ quality, alphaQuality: 92, effort: 5 }).toFile(file);
    written.push(file);
  }
  return written;
}
