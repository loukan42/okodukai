import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(webRoot, "art", "source", "child");
const output = join(webRoot, "public", "assets");

const images = [
  ...["01", "02", "03", "04", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"].map((id) => ({ name: `adventurer-${id}-idle`, folder: "characters", sizes: [256, 512, 768] })),
  ...["home", "autonomy", "learning", "help", "creativity", "school", "garden", "animals"].map((name) => ({ name: `quest-${name}`, folder: "quests", sizes: [180, 360, 540] })),
  { name: "adventurer-emma-idle", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-emma-victory", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-lucas-idle", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-lucas-victory", folder: "characters", sizes: [256, 512, 768] },
  ...["emma", "lucas"].flatMap((character) => ["happy", "proud", "thinking", "discovery"].map((pose) => ({ name: `adventurer-${character}-${pose}`, folder: "characters", sizes: [256, 512, 768] }))),
  ...["cinema", "icecream", "dessert", "bicycle", "family-game", "music", "friend", "figurine", "book"].map((name) => ({ name: `reward-${name}`, folder: "rewards", sizes: [256, 512] })),
  { name: "goal-waypost", folder: "goals", sizes: [128, 256, 512] },
  ...["camp", "grove", "observatory"].map((name) => ({ name: `frame-${name}`, folder: "frames", sizes: [128, 256], quality: 82, alphaQuality: 100 })),
  ...["sprout", "sapling", "young", "flowering", "mature"].map((name) => ({ name: `xp-tree-${name}`, folder: "experience", sizes: [256, 512] })),
];

const hubShapes = [["wide", [1280, 1920]], ["tall", [720, 1080]]];

for (const [shape, widths] of hubShapes) {
  const folder = join(output, "backgrounds");
  await mkdir(folder, { recursive: true });
  for (const width of widths) {
    const target = join(folder, `child-hub-${shape}-${width}.webp`);
    await sharp(join(source, `hub-${shape}.png`))
      .resize({ width })
      .webp({ quality: 82, effort: 6 })
      .toFile(target);
    console.log(target);
  }
}

// Calques de progression de la vallée : un calque transparent complet par palier, posé sur le fond du
// hameau. Il doit garder le cadrage de `hub-{shape}.png` ; le fond et le calque sont redimensionnés
// de la même manière, y compris pour les variantes 1920/1080, afin que le srcset annonce leur vraie largeur.
for (const tier of [5, 10, 20, 30]) {
  for (const [shape, widths] of hubShapes) {
    const file = join(source, `hub-tier-${tier}-${shape}.png`);
    if (!existsSync(file)) {
      console.log(`hub-tier-${tier}-${shape}.png absent : calque non produit`);
      continue;
    }
    const base = await sharp(join(source, `hub-${shape}.png`)).metadata();
    const layer = await sharp(file).metadata();
    if (!layer.hasAlpha) throw new Error(`hub-tier-${tier}-${shape}.png doit être transparent`);
    if (Math.abs(layer.width / layer.height - base.width / base.height) > 0.01) {
      throw new Error(`hub-tier-${tier}-${shape}.png (${layer.width}×${layer.height}) n'a pas le cadrage de hub-${shape}.png (${base.width}×${base.height})`);
    }
    const aligned = await sharp(file).resize(base.width, base.height, { fit: "fill" }).png().toBuffer();
    const folder = join(output, "backgrounds");
    for (const width of widths) {
      const target = join(folder, `hub-tier-${tier}-${shape}-${width}.webp`);
      await sharp(aligned)
        .resize({ width })
        .webp({ quality: 84, effort: 6, alphaQuality: 95 })
        .toFile(target);
      console.log(target);
    }
  }
}

for (const item of images) {
  const folder = join(output, item.folder);
  await mkdir(folder, { recursive: true });
  for (const size of item.sizes) {
    const target = join(folder, `${item.name}-${size}.webp`);
    await sharp(join(source, `${item.name}.png`))
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: item.quality ?? 84, effort: 6, alphaQuality: item.alphaQuality ?? 95 })
      .toFile(target);
    console.log(target);
  }
}

for (const name of ["gallery-interior", "savings-chamber", "observatory-interior", "library-interior", "shop-interior", "registry-interior"]) {
  const folder = join(output, "backgrounds");
  await mkdir(folder, { recursive: true });
  for (const width of [1280, 1920]) {
    const target = join(folder, `child-${name}-${width}.webp`);
    await sharp(join(source, `${name}.png`))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(target);
    console.log(target);
  }
}

const learningScenes = ["diversification", "inflation", "risk", "compound"];
for (const [index, name] of learningScenes.entries()) {
  const folder = join(output, "learning");
  await mkdir(folder, { recursive: true });
  const left = index % 2 === 0 ? 0 : 638;
  const top = index < 2 ? 0 : 638;
  for (const width of [320, 640]) {
    const target = join(folder, `learning-${name}-${width}.webp`);
    await sharp(join(source, "learning-sheet.png"))
      .extract({ left, top, width: 616, height: 616 })
      .resize(width, width)
      .webp({ quality: 83, effort: 6 })
      .toFile(target);
    console.log(target);
  }
}
