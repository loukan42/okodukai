// Extrait le calque transparent d'un palier de la vallée à partir d'une scène complète générée par édition
// du fond, au même cadrage : node apps/web/scripts/extract-hub-tier-layer.mjs 5 wide
// Lit art/source/child/hub-{forme}.png et hub-tier-{palier}-{forme}-full.png, écrit hub-tier-{palier}-{forme}.png.
// Seules les zones nettement modifiées sont gardées ; le bruit de ré-interprétation du générateur est retiré.
import sharp from "sharp";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [tier, shape] = process.argv.slice(2);
if (!["5", "10", "20", "30"].includes(tier) || !["wide", "tall"].includes(shape)) {
  throw new Error("Usage: extract-hub-tier-layer.mjs <5|10|20|30> <wide|tall>");
}

const source = join(dirname(fileURLToPath(import.meta.url)), "..", "art", "source", "child");
const basePath = join(source, `hub-${shape}.png`);
const fullPath = join(source, `hub-tier-${tier}-${shape}-full.png`);
const target = join(source, `hub-tier-${tier}-${shape}.png`);
// Écart de couleur (0-255) sous lequel un pixel est considéré inchangé, et au-dessus duquel il est entièrement gardé.
const low = 22;
const high = 48;
// Surface minimale d'un élément ajouté, en pixels de la source : en dessous, c'est du bruit.
const minArea = 600;

const { width, height } = await sharp(basePath).metadata();
const full = await sharp(fullPath).metadata();
if (Math.abs(full.width / full.height - width / height) > 0.01) {
  throw new Error(`${fullPath} (${full.width}×${full.height}) n'a pas le cadrage de ${basePath} (${width}×${height})`);
}
const read = (path, sigma) => {
  const image = sharp(path).resize(width, height, { fit: "fill" }).removeAlpha();
  return (sigma ? image.blur(sigma) : image).raw().toBuffer();
};
const [base, edited, baseSoft, editedSoft] = await Promise.all([read(basePath), read(fullPath), read(basePath, 1.6), read(fullPath, 1.6)]);

// Le générateur peut décaler légèrement la teinte générale : on compare après avoir égalisé les moyennes.
const shift = [0, 1, 2].map((channel) => {
  let sum = 0;
  for (let i = channel; i < baseSoft.length; i += 3) sum += editedSoft[i] - baseSoft[i];
  return sum / (width * height);
});

const pixels = width * height;
let mask = new Uint8Array(pixels);
for (let p = 0; p < pixels; p++) {
  let distance = 0;
  for (let channel = 0; channel < 3; channel++) distance = Math.max(distance, Math.abs(editedSoft[p * 3 + channel] - shift[channel] - baseSoft[p * 3 + channel]));
  mask[p] = distance >= high ? 255 : distance <= low ? 0 : Math.round(((distance - low) / (high - low)) * 255);
}

// Retire les petites taches isolées (composantes connexes trop petites).
const seen = new Uint8Array(pixels);
const stack = new Int32Array(pixels);
for (let start = 0; start < pixels; start++) {
  if (seen[start] || mask[start] < 128) continue;
  let size = 0;
  let top = 0;
  const members = [];
  stack[top++] = start;
  seen[start] = 1;
  while (top) {
    const p = stack[--top];
    members.push(p);
    size++;
    const x = p % width;
    for (const q of [p - width, p + width, x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1]) {
      if (q >= 0 && q < pixels && !seen[q] && mask[q] >= 128) { seen[q] = 1; stack[top++] = q; }
    }
  }
  if (size < minArea) for (const p of members) mask[p] = 0;
}

// Ferme les trous, puis adoucit le bord pour que l'élément se pose sans liseré sur le fond.
mask = await sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } }).blur(2).threshold(70).blur(0.8).extractChannel(0).raw().toBuffer();

const layer = Buffer.alloc(pixels * 4);
let covered = 0;
for (let p = 0; p < pixels; p++) {
  layer[p * 4] = edited[p * 3];
  layer[p * 4 + 1] = edited[p * 3 + 1];
  layer[p * 4 + 2] = edited[p * 3 + 2];
  layer[p * 4 + 3] = mask[p];
  if (mask[p] > 0) covered++;
}
await sharp(layer, { raw: { width, height, channels: 4 } }).png().toFile(target);
// Aperçu hors du dépôt : le calque posé sur le fond, tel que l'enfant le verra.
const preview = join(tmpdir(), `hub-tier-${tier}-${shape}-preview.png`);
await sharp(basePath).composite([{ input: target }]).png().toFile(preview);
const share = (covered / pixels) * 100;
console.log(`${target} : ${share.toFixed(1)} % de la scène`);
console.log(`Aperçu sur le fond : ${preview}`);
if (share > 35) console.warn("Plus d'un tiers de la scène a changé : le générateur a sans doute repeint le décor. Vérifier le calque avant de l'utiliser.");
