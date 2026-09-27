import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(webRoot, "art", "source", "child");
const output = join(webRoot, "public", "assets");

const images = [
  { name: "adventurer-emma-idle", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-emma-victory", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-lucas-idle", folder: "characters", sizes: [256, 512, 768] },
  { name: "adventurer-lucas-victory", folder: "characters", sizes: [256, 512, 768] },
  ...["emma", "lucas"].flatMap((character) => ["happy", "proud", "thinking", "discovery"].map((pose) => ({ name: `adventurer-${character}-${pose}`, folder: "characters", sizes: [256, 512, 768] }))),
  ...["cinema", "icecream", "bicycle", "family-game"].map((name) => ({ name: `reward-${name}`, folder: "rewards", sizes: [256, 512] })),
  { name: "goal-waypost", folder: "goals", sizes: [128, 256, 512] },
  ...["sprout", "sapling", "young", "flowering", "mature"].map((name) => ({ name: `xp-tree-${name}`, folder: "experience", sizes: [256, 512] })),
];

for (const [shape, widths] of [["wide", [1280, 1920]], ["tall", [720, 1080]]]) {
  const folder = join(output, "backgrounds");
  await mkdir(folder, { recursive: true });
  for (const width of widths) {
    const target = join(folder, `child-hub-${shape}-${width}.webp`);
    await sharp(join(source, `hub-${shape}.png`))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(target);
    console.log(target);
  }
}

for (const item of images) {
  const folder = join(output, item.folder);
  await mkdir(folder, { recursive: true });
  for (const size of item.sizes) {
    const target = join(folder, `${item.name}-${size}.webp`);
    await sharp(join(source, `${item.name}.png`))
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 6, alphaQuality: 95 })
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
