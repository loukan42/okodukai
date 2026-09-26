// Convertit les illustrations de cartes (PNG sources, locaux et non versionnés) en WebP optimisés,
// versionnés et servis par le site : public/cards/<univers>/<carte>.png → même chemin en .webp.
// 720 px de large suffisent pour la plus grande carte affichée (≈ 470 px de haut, écran 2x).
//   node scripts/optimize-cards.mjs
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../public/cards", import.meta.url));
let done = 0;
let bytes = 0;
for (const folder of readdirSync(root)) {
  const dir = join(root, folder);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"))) {
    const out = join(dir, file.replace(/\.png$/i, ".webp"));
    const info = await sharp(join(dir, file)).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(out);
    bytes += info.size;
    done++;
  }
}
console.log(`${done} cartes converties, ${(bytes / 1024 / 1024).toFixed(1)} Mo au total.`);
