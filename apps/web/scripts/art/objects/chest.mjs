// Coffre Okodukai (Mon coffre) — trois-quarts plongeant, lumière en haut à gauche.
// États : closed | empty | low | full | almost | reached (docs/ART_BIBLE.md, ASSET_PLAN.md).
import { defs, svg, rng, fmt as f } from "../lib/core.mjs";
import { wood, woodDark, gold, shadowCool } from "../lib/palette.mjs";
import { coinFace, coinTilted } from "./coin.mjs";

// Repère : face avant 120×56, profondeur (26, -16).
const FL = 44, FR = 164, FT = 124, FB = 180;
const DX = 26, DY = -16;

function band(x, w, y1, y2, d) {
  const g = d.linear([[0, gold.light], [0.5, gold.base], [1, gold.shade]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let b = `<rect x="${x}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${g}"/>`;
  b += `<rect x="${x}" y="${y1}" width="1.6" height="${y2 - y1}" fill="${gold.hi}" fill-opacity=".7"/>`;
  for (const y of [y1 + 6, y2 - 7]) b += `<circle cx="${x + w / 2}" cy="${y}" r="1.9" fill="${gold.deep}" fill-opacity=".55"/><circle cx="${x + w / 2 - 0.5}" cy="${y - 0.5}" r="1" fill="${gold.hi}"/>`;
  return b;
}

/** Tas de pièces : dôme doré + pièces visibles sur le dessus. `top` = hauteur du sommet. */
function coinHeap(d, { top, spread = 1, seed = 3, clipId }) {
  const r = rng(seed);
  const heapFill = d.radial([[0, gold.hi], [0.4, gold.light], [0.8, gold.base], [1, gold.shade]], { cx: 0.35, cy: 0.25, r: 0.9 });
  const cx = (FL + FR + DX) / 2;
  const baseY = FT + DY / 2 + 4;
  const half = 58 * spread;
  let b = `<g${clipId ? ` clip-path="url(#${clipId})"` : ""}>`;
  b += `<path d="M${f(cx - half - 8)} ${f(baseY + 14)} C${f(cx - half * 0.6)} ${f(top + 8)} ${f(cx - 16)} ${f(top)} ${f(cx)} ${f(top)} C${f(cx + 20)} ${f(top)} ${f(cx + half * 0.7)} ${f(top + 10)} ${f(cx + half + 10)} ${f(baseY + 8)} Z" fill="${heapFill}"/>`;
  // Pièces posées sur le tas, de l'arrière vers l'avant.
  const n = Math.round(10 + spread * 10);
  const coins = [];
  for (let i = 0; i < n; i++) {
    const t = r.range(-1, 1);
    const x = cx + t * half * 0.85;
    const bump = (1 - t * t) * (baseY - top);
    const y = baseY + 6 - bump + r.range(-3, 5);
    coins.push([x, y, r.range(6.5, 9)]);
  }
  coins.sort((a, b2) => a[1] - b2[1]);
  for (const [x, y, rx] of coins) b += coinTilted(d, { cx: x, cy: y, rx, ry: rx * 0.38, thickness: 2 });
  b += `</g>`;
  return b;
}

export function chest({ state = "full" } = {}) {
  const d = defs(`chest-${state}`);
  const open = state !== "closed";
  const woodFront = d.linear([[0, wood.light], [0.55, wood.base], [1, wood.shade]], { x1: 0, y1: 0, x2: 0.4, y2: 1 });
  const woodSide = d.linear([[0, wood.shade], [1, wood.deep]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const interior = d.linear([[0, "#1e120a"], [0.55, woodDark.shade], [1, woodDark.base]], { x1: 0, y1: 1, x2: 0.3, y2: 0 });
  const lidInner = d.linear([[0, woodDark.light], [0.5, woodDark.base], [1, woodDark.shade]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const lidTop = d.linear([[0, wood.light], [1, wood.base]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const glow = d.radial([[0, "#fff1c2", 0.95], [0.45, "#ffd98a", 0.45], [1, "#ffd98a", 0]]);

  let body = "";
  const w = 240, h = 220;

  // Lueur derrière le coffre pour les derniers états.
  if (state === "almost" || state === "reached") {
    body += `<ellipse cx="118" cy="${state === "reached" ? 96 : 108}" rx="${state === "reached" ? 118 : 90}" ry="${state === "reached" ? 96 : 70}" fill="${glow}"/>`;
  }
  if (state === "reached") {
    // Rayons doux derrière le couvercle.
    let rays = "";
    for (let i = 0; i < 9; i++) {
      const a = (-160 + i * 17.5) * (Math.PI / 180);
      const x2 = 118 + Math.cos(a) * 118;
      const y2 = 100 + Math.sin(a) * 118;
      rays += `<path d="M118 100 L${f(x2 - 7)} ${f(y2)} L${f(x2 + 7)} ${f(y2)}Z" fill="#fff4cf" fill-opacity=".38"/>`;
    }
    body += rays;
  }

  // Ombre de contact.
  body += `<ellipse cx="${(FL + FR + DX) / 2 + 2}" cy="${FB + 4}" rx="${f((FR - FL) / 2 + 26)}" ry="11" fill="${shadowCool}" fill-opacity=".26"/>`;

  const backL = [FL + DX, FT + DY];
  const backR = [FR + DX, FT + DY];

  if (open) {
    // Couvercle ouvert, face intérieure visible, légèrement penché vers l'arrière.
    const lidH = 64;
    const tl = [backL[0] + 7, backL[1] - lidH];
    const tr = [backR[0] + 7, backR[1] - lidH];
    body += `<path d="M${backL[0]} ${backL[1]} L${f(tl[0])} ${f(tl[1] + 8)} Q${f(tl[0] + 2)} ${f(tl[1] - 4)} ${f(tl[0] + 16)} ${f(tl[1] - 6)} L${f(tr[0] - 16)} ${f(tr[1] - 6)} Q${f(tr[0] - 2)} ${f(tr[1] - 4)} ${f(tr[0])} ${f(tr[1] + 8)} L${backR[0]} ${backR[1]} Z" fill="${lidInner}"/>`;
    // Épaisseur du couvercle (tranche gauche et haut, éclairées).
    body += `<path d="M${backL[0]} ${backL[1]} L${f(tl[0])} ${f(tl[1] + 8)} Q${f(tl[0] + 2)} ${f(tl[1] - 4)} ${f(tl[0] + 16)} ${f(tl[1] - 6)} L${f(tr[0] - 16)} ${f(tr[1] - 6)}" fill="none" stroke="${wood.light}" stroke-width="4" stroke-linejoin="round"/>`;
    // Planches intérieures + bandes dorées vues de l'intérieur (fines).
    for (let i = 1; i < 4; i++) {
      const y = backL[1] - (lidH * i) / 4;
      body += `<path d="M${f(backL[0] + (7 * i) / 4 + 2)} ${f(y)} L${f(backR[0] + (7 * i) / 4 - 2)} ${f(y)}" stroke="${woodDark.deep}" stroke-opacity=".5" stroke-width="1.2"/>`;
    }
    for (const bx of [FL + DX + 14, FR + DX - 24]) {
      body += `<path d="M${bx} ${backL[1]} L${bx + 7} ${f(tl[1] - 3)}" stroke="${gold.shade}" stroke-width="7"/>`;
      body += `<path d="M${bx - 2.6} ${backL[1]} L${bx + 4.4} ${f(tl[1] - 3)}" stroke="${gold.light}" stroke-opacity=".5" stroke-width="1.4"/>`;
    }
    // Ouverture : intérieur sombre.
    const clipId = d.id("mouth");
    const mouth = `M${FL} ${FT} L${FR} ${FT} L${backR[0]} ${backR[1]} L${backL[0]} ${backL[1]} Z`;
    d.raw(`<clipPath id="${clipId}"><path d="${mouth}"/><rect x="0" y="0" width="${w}" height="${FT - 0.5}" /></clipPath>`);
    const mouthOnly = d.id("mouthonly");
    d.raw(`<clipPath id="${mouthOnly}"><path d="${mouth}"/></clipPath>`);
    body += `<path d="${mouth}" fill="${interior}"/>`;
    // Paroi intérieure gauche.
    body += `<path d="M${FL} ${FT} L${backL[0]} ${backL[1]} L${backL[0]} ${backL[1] + 8} L${FL + 4} ${FT}Z" fill="${woodDark.base}" fill-opacity=".8"/>`;

    if (state === "low") body += coinHeap(d, { top: FT - 8, spread: 0.7, seed: 11, clipId: mouthOnly });
    if (state === "full") body += coinHeap(d, { top: FT - 23, spread: 1, seed: 7, clipId });
    if (state === "almost") body += coinHeap(d, { top: FT - 33, spread: 1.06, seed: 5, clipId });
    if (state === "reached") body += coinHeap(d, { top: FT - 42, spread: 1.12, seed: 9 });
  }

  // Flanc droit.
  body += `<path d="M${FR} ${FT} L${backR[0]} ${backR[1]} L${backR[0]} ${FB + DY} L${FR} ${FB} Z" fill="${woodSide}"/>`;
  body += `<path d="M${FR + 11} ${FT - 7} L${FR + 11} ${FB - 7}" stroke="${gold.shade}" stroke-width="6"/>`;
  body += `<path d="M${FR + 8.5} ${FT - 5.5} L${FR + 8.5} ${FB - 5.5}" stroke="${gold.base}" stroke-opacity=".6" stroke-width="1.2"/>`;

  if (!open) {
    // Couvercle fermé bombé : face avant, dessus, flanc.
    const lh = 26;
    body += `<path d="M${FL} ${FT} L${FL} ${FT - lh + 8} Q${FL} ${FT - lh} ${FL + 10} ${FT - lh} L${FR - 10} ${FT - lh} Q${FR} ${FT - lh} ${FR} ${FT - lh + 8} L${FR} ${FT} Z" fill="${woodFront}"/>`;
    body += `<path d="M${FL + 10} ${FT - lh} L${FR - 10} ${FT - lh} L${FR - 10 + DX} ${FT - lh + DY} L${FL + 10 + DX} ${FT - lh + DY} Z" fill="${lidTop}"/>`;
    body += `<path d="M${FR - 10} ${FT - lh} Q${FR} ${FT - lh} ${FR} ${FT - lh + 8} L${FR} ${FT} L${backR[0]} ${backR[1]} L${backR[0]} ${FT - lh + 8 + DY} Q${backR[0]} ${FT - lh + DY} ${FR - 10 + DX} ${FT - lh + DY} Z" fill="${woodSide}"/>`;
    body += `<path d="M${FL + 10} ${FT - lh + 1.5} L${FR - 10} ${FT - lh + 1.5}" stroke="${wood.light}" stroke-width="2" stroke-opacity=".8"/>`;
    body += band(FL + 12, 10, FT - lh + 1, FT, d) + band(FR - 22, 10, FT - lh + 1, FT, d);
    body += `<path d="M${FL + 12 + DX * 0.2} ${FT - lh + DY * 0.2} L${FL + 12 + DX} ${FT - lh + DY} L${FL + 22 + DX} ${FT - lh + DY} L${FL + 22 + DX * 0.2} ${FT - lh + DY * 0.2}Z" fill="${gold.light}"/>`;
    body += `<path d="M${FR - 22 + DX * 0.2} ${FT - lh + DY * 0.2} L${FR - 22 + DX} ${FT - lh + DY} L${FR - 12 + DX} ${FT - lh + DY} L${FR - 12 + DX * 0.2} ${FT - lh + DY * 0.2}Z" fill="${gold.light}"/>`;
  }

  // Face avant.
  body += `<rect x="${FL}" y="${FT}" width="${FR - FL}" height="${FB - FT}" fill="${woodFront}"/>`;
  for (const y of [FT + 20, FT + 38]) body += `<path d="M${FL} ${y} L${FR} ${y}" stroke="${wood.deep}" stroke-opacity=".45" stroke-width="1.4"/><path d="M${FL} ${y + 1.4} L${FR} ${y + 1.4}" stroke="${wood.light}" stroke-opacity=".35" stroke-width="1"/>`;
  body += `<path d="M${FL + 30} ${FT + 28} q10 -3 22 0 M${FR - 44} ${FT + 47} q9 -2 18 1" fill="none" stroke="${wood.grain}" stroke-opacity=".6" stroke-width="1.1"/>`;
  // Liseré lumineux à gauche (rim light).
  body += `<rect x="${FL}" y="${FT}" width="2.2" height="${FB - FT}" fill="${wood.light}" fill-opacity=".9"/>`;
  // Bandes dorées verticales + cerclage du rebord + coins.
  body += band(FL + 12, 10, FT, FB, d) + band(FR - 22, 10, FT, FB, d);
  const rim = d.linear([[0, gold.hi], [0.4, gold.light], [1, gold.shade]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  body += `<rect x="${FL - 2}" y="${FT - 2}" width="${FR - FL + 4}" height="7" rx="1.5" fill="${rim}"/>`;
  if (open) body += `<path d="M${FR + 2} ${FT - 2} L${backR[0] + 2} ${backR[1] - 2} L${backR[0] + 2} ${backR[1] + 4} L${FR + 2} ${FT + 5}Z" fill="${gold.shade}"/>`;
  body += `<rect x="${FL - 2}" y="${FB - 6}" width="${FR - FL + 4}" height="6" rx="1.5" fill="${gold.shade}"/>`;
  body += `<rect x="${FL - 2}" y="${FB - 6}" width="${FR - FL + 4}" height="1.5" fill="${gold.light}" fill-opacity=".7"/>`;
  // Serrure : plaque dorée frappée de la pièce Okodukai.
  const plate = d.linear([[0, gold.hi], [0.5, gold.light], [1, gold.shade]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const cx = (FL + FR) / 2;
  body += `<path d="M${cx - 13} ${FT + 3} L${cx + 13} ${FT + 3} L${cx + 13} ${FT + 22} Q${cx} ${FT + 34} ${cx - 13} ${FT + 22} Z" fill="${plate}" stroke="${gold.deep}" stroke-opacity=".5" stroke-width="1"/>`;
  body += `<g transform="translate(${cx - 8.3} ${FT + 5.8}) scale(.28)">${coinFace(d, { detail: "small" })}</g>`;
  // Pieds.
  for (const x of [FL + 4, FR - 16]) body += `<rect x="${x}" y="${FB}" width="12" height="5" rx="2" fill="${wood.deep}"/>`;

  if (state === "almost" || state === "reached") {
    // Quelques pièces posées sur le rebord avant.
    body += coinTilted(d, { cx: FL + 40, cy: FT - 1, rx: 8, ry: 3, thickness: 2 });
    body += coinTilted(d, { cx: FR - 34, cy: FT, rx: 7.5, ry: 2.9, thickness: 2 });
  }
  if (state === "reached") {
    // Pièces tombées au sol devant le coffre.
    body += coinTilted(d, { cx: FL - 4, cy: FB + 2, rx: 9, ry: 3.4, thickness: 2.4 });
    body += coinTilted(d, { cx: FR + 18, cy: FB + 4, rx: 8, ry: 3, thickness: 2.2 });
    body += `<g transform="translate(${FL + 6} ${FB - 20}) rotate(-18) scale(.34)">${coinFace(d, { detail: "small" })}</g>`;
    // Étincelles (étoiles à 4 branches).
    const sparkle = (x, y, s) =>
      `<path d="M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z" fill="#fffbe8"/>`;
    body += sparkle(52, 64, 7) + sparkle(190, 52, 9) + sparkle(160, 30, 5) + sparkle(78, 30, 4);
  }
  if (state === "almost") {
    const s = 5;
    body += `<path d="M190 70 Q${190 + s * 0.18} ${70 - s * 0.18} ${190 + s} 70 Q${190 + s * 0.18} ${70 + s * 0.18} 190 ${70 + s} Q${190 - s * 0.18} ${70 + s * 0.18} ${190 - s} 70 Q${190 - s * 0.18} ${70 - s * 0.18} 190 ${70 - s}Z" fill="#fffbe8"/>`;
  }

  return svg({ w, h, body, d });
}
