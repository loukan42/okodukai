// Écrit les assets vectoriels du catalogue dans public/assets (SVG autonomes).
//   node scripts/art/export-svg.mjs [groupe]   (par défaut : avatars)
// Les objets et décors du monde passent désormais par le studio 3D (studio/build.mjs) ;
// le vectoriel reste pour les portraits d'avatars, légers et nets à toutes les tailles.
import { catalog } from "./catalog.mjs";
import { writeText } from "./lib/raster.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const group = process.argv[2] || "avatars";
const items = catalog.filter((it) => it.group === group && it.kind === "object");
for (const it of items) {
  const file = join(here, "..", "..", "public", "assets", it.path);
  writeText(file, it.render());
  console.log(`${it.id} → assets/${it.path}`);
}
