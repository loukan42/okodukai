import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(webRoot, "..", "..", "images");
const publicRoot = join(webRoot, "public");
const favicon = join(sourceRoot, "favicon.png");

for (const size of [32, 64]) {
  const name = size === 64 ? "favicon.png" : "favicon-32.png";
  await sharp(favicon).resize(size, size).png({ compressionLevel: 9 }).toFile(join(publicRoot, name));
}

for (const size of [192, 512]) {
  await sharp(favicon).resize(size, size).png({ compressionLevel: 9 }).toFile(join(publicRoot, "icons", `icon-${size}.png`));
}

await sharp(favicon)
  .resize(150, 150)
  .extend({ top: 15, bottom: 15, left: 15, right: 15, background: "#f6f0df" })
  .flatten({ background: "#f6f0df" })
  .png({ compressionLevel: 9 })
  .toFile(join(publicRoot, "apple-touch-icon.png"));

const socialFolder = join(publicRoot, "social");
await mkdir(socialFolder, { recursive: true });
await sharp(join(sourceRoot, "metadescription.png"))
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(join(socialFolder, "okodukai-share.jpg"));
