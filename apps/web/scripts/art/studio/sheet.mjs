// Planche de revue DA pour le studio 3D : rend une scène avec plusieurs jeux de
// paramètres et les pose côte à côte sur fond ivoire et sur fond nuit, plus une
// vignette de lisibilité en petit.
//   node scripts/art/studio/sheet.mjs <scène.js> <sortie.png> '<[params, ...] en JSON>' [taille]
import { renderScene, closeStudio } from "./harness.mjs";
import sharp from "sharp";
import { resolve } from "node:path";

const [scene, out, json = "[{}]", sizeArg = "420"] = process.argv.slice(2);
if (!scene || !out) {
  console.error("usage : sheet.mjs <scène.js> <sortie.png> '<[params]>' [taille]");
  process.exit(1);
}
const variants = JSON.parse(json);
const size = Number(sizeArg);
const small = 56;
const cellW = size + 24;
const cellH = size * 2 + 24 * 3 + small;
const tiles = [];
let i = 0;
for (const params of variants) {
  const t = Date.now();
  const w = params.width ?? size;
  const h = params.height ?? size;
  const png = await renderScene(resolve(scene), { width: w, height: h, params, supersample: params.supersample ?? 2 });
  console.log(`variante ${i} : ${Date.now() - t} ms`);
  const fit = await sharp(png).resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const tiny = await sharp(png).resize({ width: small, height: small, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  tiles.push({ input: fit, left: i * cellW + 12, top: 12 });
  tiles.push({ input: await sharp({ create: { width: size, height: size, channels: 4, background: "#172941" } }).composite([{ input: fit }]).png().toBuffer(), left: i * cellW + 12, top: size + 24 });
  tiles.push({ input: tiny, left: i * cellW + 12, top: size * 2 + 36 });
  tiles.push({ input: await sharp({ create: { width: small + 16, height: small + 16, channels: 4, background: "#172941" } }).composite([{ input: tiny, left: 8, top: 8 }]).png().toBuffer(), left: i * cellW + 24 + small, top: size * 2 + 28 });
  i++;
}
await sharp({ create: { width: cellW * variants.length, height: cellH, channels: 4, background: "#f6f0df" } }).composite(tiles).png().toFile(out);
await closeStudio();
console.log(out);
