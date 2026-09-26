// Cuisson raster : Chromium (playwright-core) rend le SVG, sharp encode en WebP/AVIF.
// Chromium sait appliquer les filtres coûteux (grain, flou atmosphérique) une seule fois,
// ce qui évite de les faire calculer au navigateur de l'enfant à chaque affichage.
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

let browserPromise;
function browser() {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  browserPromise ??= chromium.launch(executablePath ? { executablePath } : {});
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) (await browserPromise).close();
  browserPromise = undefined;
}

/** Rend un document HTML complet à la taille demandée et renvoie un buffer PNG. */
export async function renderHtml(html, { width, height, scale = 1, transparent = false, fullPage = false }) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "load" });
  const png = await page.screenshot({ type: "png", omitBackground: transparent, fullPage });
  await page.close();
  return png;
}

export function svgPage(svgMarkup, { width, height, background = "transparent" }) {
  return `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:${background}}svg{display:block;width:${width}px;height:${height}px}</style></head><body>${svgMarkup}</body></html>`;
}

/** SVG -> WebP (et AVIF si demandé) à plusieurs largeurs, ratio conservé. */
export async function bake(svgMarkup, { outBase, width, height, widths = [width], transparent = false, avif = false, quality = 82 }) {
  mkdirSync(dirname(outBase), { recursive: true });
  const maxScale = Math.max(...widths) / width;
  const png = await renderHtml(svgPage(svgMarkup, { width, height }), { width, height, scale: maxScale, transparent });
  const written = [];
  for (const w of widths) {
    const img = sharp(png).resize({ width: w });
    const webp = `${outBase}-${w}.webp`;
    await img.clone().webp({ quality, effort: 5, alphaQuality: 90 }).toFile(webp);
    written.push(webp);
    if (avif) {
      const av = `${outBase}-${w}.avif`;
      await img.clone().avif({ quality: quality - 22, effort: 4 }).toFile(av);
      written.push(av);
    }
  }
  return written;
}

export function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
