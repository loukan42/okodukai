// Rendu unique d'une scène du studio, pour itérer vite sur un décor.
//   node scripts/art/studio/shot.mjs <scène.js> <sortie.png> '<params JSON>' <largeur> <hauteur> [suréchantillonnage]
import { renderScene, closeStudio } from "./harness.mjs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [scene, out, json = "{}", w = "960", h = "540", ss = "1"] = process.argv.slice(2);
const t = Date.now();
const png = await renderScene(resolve(scene), { width: Number(w), height: Number(h), params: JSON.parse(json), supersample: Number(ss), transparent: false });
writeFileSync(out, png);
await closeStudio();
console.log(`${out} (${Date.now() - t} ms)`);
