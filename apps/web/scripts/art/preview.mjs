// Planche contact pour la revue Art Director : node scripts/art/preview.mjs <groupe> [sortie.png]
// Chaque asset est montré à sa taille native, en petit (lisibilité) et sur fond clair/sombre.
import { catalog } from "./catalog.mjs";
import { renderHtml, closeBrowser, writeText } from "./lib/raster.mjs";

const group = process.argv[2] || "all";
const out = process.argv[3] || `${process.env.ART_PREVIEW_DIR || ".art-preview"}/${group}.png`;
const items = catalog.filter((it) => group === "all" || it.group === group || it.id === group);
if (!items.length) {
  console.error(`Aucun asset pour « ${group} ». Groupes : ${[...new Set(catalog.map((i) => i.group))].join(", ")}`);
  process.exit(1);
}

const cells = items
  .map((it) => {
    const markup = it.render();
    const small = it.small ?? 48;
    const scale = Math.min(1, (it.previewWidth ?? 420) / it.w);
    return `<figure><div class="row"><div class="light" style="width:${it.w * scale}px;height:${it.h * scale}px">${markup.replace("<svg ", `<svg style="width:100%;height:100%" `)}</div>${
      it.kind === "object"
        ? `<div class="dark"><div style="width:${small}px;height:${(small * it.h) / it.w}px">${markup.replace("<svg ", `<svg style="width:100%;height:100%" `)}</div></div>`
        : ""
    }</div><figcaption>${it.id} · ${it.w}×${it.h}</figcaption></figure>`;
  })
  .join("");

const html = `<!doctype html><html><head><style>
body{margin:0;padding:24px;background:#efe6d2;font:12px/1.3 system-ui;color:#172941;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;width:${process.env.SHEET_WIDTH || 1400}px}
figure{margin:0}.row{display:flex;gap:12px;align-items:flex-end}
.light{background:#f6f0df;box-shadow:0 0 0 1px #d8c9a7}
.dark{background:#172941;padding:10px;display:flex;align-items:center;justify-content:center}
figcaption{margin-top:6px;font-weight:700}
</style></head><body>${cells}</body></html>`;

const png = await renderHtml(html, { width: Number(process.env.SHEET_WIDTH || 1400) + 48, height: 400, fullPage: true, scale: Number(process.env.SHEET_SCALE || 1) });
writeText(out, "");
const { writeFileSync } = await import("node:fs");
writeFileSync(out, png);
await closeBrowser();
console.log(out);
