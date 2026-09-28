import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "..", "..", "docs", "screenshots");
const ids = ["01", "02", "03", "04", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"];
const poses = ["happy", "proud", "thinking", "victory", "discovery"];
const cellWidth = 145, cellHeight = 210, gutter = 8, labelWidth = 48;
await mkdir(output, { recursive: true });

for (let page = 0; page < 2; page++) {
  const rows = ids.slice(page * 7, page * 7 + 7);
  const width = labelWidth + poses.length * (cellWidth + gutter) + gutter;
  const height = rows.length * (cellHeight + gutter) + gutter;
  const overlays = [];
  for (const [row, id] of rows.entries()) {
    const y = gutter + row * (cellHeight + gutter);
    overlays.push({ input: Buffer.from(`<svg width="${labelWidth}" height="${cellHeight}"><text x="8" y="110" fill="#354149" font-size="20" font-family="Arial">${id}</text></svg>`), left: 0, top: y });
    for (const [column, pose] of poses.entries()) {
      const path = join(root, "public", "assets", "characters", `adventurer-${id}-${pose}-512.webp`);
      const image = await sharp(path).resize(cellWidth - 16, cellHeight - 32, { fit: "contain", background: "#f5f0e6" }).png().toBuffer();
      overlays.push({ input: image, left: labelWidth + gutter + column * (cellWidth + gutter) + 8, top: y + 8 });
    }
  }
  const target = join(output, `child-character-poses-${page + 1}.png`);
  await sharp({ create: { width, height, channels: 4, background: "#f5f0e6" } }).composite(overlays).png().toFile(target);
  console.log(target);
}
