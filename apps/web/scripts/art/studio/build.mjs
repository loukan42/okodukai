// Construit les assets 3D du studio dans public/assets (WebP, plusieurs largeurs).
//   npm run art:studio --workspace apps/web            (tout)
//   npm run art:studio --workspace apps/web -- chest   (filtre sur l'identifiant)
import { renderScene, exportWebp, closeStudio } from "./harness.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = (name) => join(here, "scenes", `${name}.js`);
const out = (p) => join(here, "..", "..", "..", "public", "assets", p);

const CHEST_STATES = ["closed", "empty", "low", "full", "almost", "reached"];

export const STUDIO_ASSETS = [
  { id: "okodukai-coin", scene: "coin", size: [512, 512], params: { rotX: -0.45, rotY: 0.32, rotZ: 0.1, exposure: 1.15 }, out: "coins/okodukai-coin", widths: [48, 96, 192, 512] },
  ...CHEST_STATES.map((state) => ({ id: `savings-chest-${state}`, scene: "chest", size: [720, 720], params: { state }, out: `savings/savings-chest-${state}`, widths: [240, 480, 720] })),
  // Objets de la boucle produit (gagner, dépenser, attendre, investir).
  ...["quest-scroll", "coin-pouch", "hourglass", "coin-sprout"].map((object) => ({ id: object, scene: "props", size: [512, 512], params: { object }, out: `objects/${object}`, widths: [128, 256, 512] })),
  // Tableau d'aventurier (Journal de quêtes).
  { id: "quest-board", scene: "board", size: [540, 540], params: {}, out: "quests/quest-board", widths: [180, 360, 540] },
  // Échoppe de la boutique familiale (en-tête de la boutique).
  { id: "shop-stall", scene: "shop", size: [540, 540], params: {}, out: "shop/shop-stall", widths: [180, 360, 540] },
  // Fonds plein cadre de la vallée : paysage (desktop) et portrait (mobile), deux ambiances.
  ...["golden", "dusk"].flatMap((mood) => [
    { id: `valley-${mood}-wide`, scene: "valley", size: [1920, 1080], supersample: 1.5, opaque: true, quality: 78, params: { mood }, out: `backgrounds/valley-${mood}-wide`, widths: [1280, 1920] },
    { id: `valley-${mood}-tall`, scene: "valley", size: [1080, 1600], supersample: 1.5, opaque: true, quality: 78, params: { mood, camera: [6, 30, 75], target: [-2, 12, -150], fov: 62 }, out: `backgrounds/valley-${mood}-tall`, widths: [720, 1080] },
  ]),
];

const filter = process.argv[2];
const list = STUDIO_ASSETS.filter((a) => !filter || a.id.includes(filter));
for (const a of list) {
  const t = Date.now();
  const png = await renderScene(scene(a.scene), { width: a.size[0], height: a.size[1], params: a.params, supersample: a.supersample ?? 2, transparent: !a.opaque });
  const files = await exportWebp(png, out(a.out), a.widths, a.quality ?? 84);
  console.log(`${a.id} (${Date.now() - t} ms) → ${files.map((f) => f.split("/public/")[1]).join(", ")}`);
}
await closeStudio();
