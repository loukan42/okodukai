// Catalogue des assets générés : chemin de sortie (sous public/assets), générateur, format.
// `kind: "object"` -> SVG autonome ; `bake` -> cuisson WebP aux largeurs indiquées.
import { coin, coinStack, coinPouch } from "./objects/coin.mjs";

export const catalog = [
  { id: "okodukai-coin-large", group: "coins", kind: "object", path: "coins/okodukai-coin-large.svg", w: 64, h: 64, small: 32, previewWidth: 192, render: () => coin({ detail: "large" }) },
  { id: "okodukai-coin-small", group: "coins", kind: "object", path: "coins/okodukai-coin-small.svg", w: 64, h: 64, small: 20, previewWidth: 128, render: () => coin({ detail: "small", shadow: false }) },
  { id: "okodukai-coin-stack", group: "coins", kind: "object", path: "coins/okodukai-coin-stack.svg", w: 120, h: 112, small: 48, previewWidth: 240, render: () => coinStack({ count: 4 }) },
  { id: "okodukai-coin-pouch", group: "coins", kind: "object", path: "coins/okodukai-coin-pouch.svg", w: 124, h: 124, small: 48, previewWidth: 248, render: () => coinPouch() },
];

import { chest } from "./objects/chest.mjs";
for (const state of ["closed", "empty", "low", "full", "almost", "reached"]) {
  catalog.push({ id: `savings-chest-${state}`, group: "savings", kind: "object", path: `savings/savings-chest-${state}.svg`, w: 240, h: 220, small: 56, previewWidth: 240, render: () => chest({ state }) });
}

import { tent, campfire, questBoard, shopStall, observatory, goalFlag, collectionArch, lanternPost } from "./objects/landmarks.mjs";
catalog.push(
  { id: "camp-tent", group: "landmarks", kind: "object", path: "decorations/camp-tent.svg", w: 220, h: 190, small: 56, previewWidth: 220, render: tent },
  { id: "camp-fire", group: "landmarks", kind: "object", path: "decorations/camp-fire.svg", w: 140, h: 130, small: 48, previewWidth: 140, render: campfire },
  { id: "quest-board", group: "landmarks", kind: "object", path: "quests/quest-board.svg", w: 210, h: 232, small: 56, previewWidth: 210, render: questBoard },
  { id: "shop-stall", group: "landmarks", kind: "object", path: "shop/shop-stall.svg", w: 256, h: 222, small: 56, previewWidth: 250, render: shopStall },
  { id: "invest-observatory", group: "landmarks", kind: "object", path: "invest/invest-observatory.svg", w: 184, h: 280, small: 56, previewWidth: 184, render: observatory },
  { id: "goal-flag", group: "landmarks", kind: "object", path: "savings/goal-flag.svg", w: 110, h: 160, small: 48, previewWidth: 110, render: goalFlag },
  { id: "collection-arch", group: "landmarks", kind: "object", path: "collections/collection-arch.svg", w: 190, h: 248, small: 56, previewWidth: 190, render: collectionArch },
  { id: "lantern-post", group: "landmarks", kind: "object", path: "decorations/lantern-post.svg", w: 80, h: 156, small: 40, previewWidth: 80, render: lanternPost },
);
