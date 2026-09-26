// Pièce Okodukai : disque d'or à trou carré (silhouette du logo), lumière en haut à gauche.
import { defs, svg, fmt as f } from "../lib/core.mjs";
import { gold, shadowCool } from "../lib/palette.mjs";

/** Carré arrondi tourné, centré en (cx, cy). */
function roundedSquare(cx, cy, s, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const pts = [
    [-s / 2, -s / 2],
    [s / 2, -s / 2],
    [s / 2, s / 2],
    [-s / 2, s / 2],
  ].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  // Coins arrondis : on raccourcit chaque côté et on relie par des quadratiques sur les sommets.
  let d = "";
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const prev = pts[(i + 3) % 4];
    const next = pts[(i + 1) % 4];
    const k1 = r / s;
    const a1 = [p[0] + (prev[0] - p[0]) * k1, p[1] + (prev[1] - p[1]) * k1];
    const a2 = [p[0] + (next[0] - p[0]) * k1, p[1] + (next[1] - p[1]) * k1];
    d += `${i === 0 ? "M" : "L"}${f(a1[0])} ${f(a1[1])} Q${f(p[0])} ${f(p[1])} ${f(a2[0])} ${f(a2[1])} `;
  }
  return d + "Z";
}

/**
 * Face de pièce dans un repère 64×64 (centre 30,30, rayon 26), à inclure dans une autre scène.
 * `detail` : "large" (anneau intérieur, parois du trou, reflet) ou "small" (lisible ≤ 24 px).
 */
export function coinFace(d, { detail = "large", cx = 30, cy = 30, r = 26 } = {}) {
  const k = r / 26;
  const hole = roundedSquare(cx, cy, 13 * k, 2.6 * k, -12);
  const maskId = d.id("coinhole");
  d.raw(
    `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${f(cx - r * 2)}" y="${f(cy - r * 2)}" width="${f(r * 4)}" height="${f(r * 4)}"><rect x="${f(cx - r * 2)}" y="${f(cy - r * 2)}" width="${f(r * 4)}" height="${f(r * 4)}" fill="#fff"/><path d="${hole}" fill="#000"/></mask>`
  );
  const face = d.radial(
    [
      [0, gold.hi],
      [0.35, gold.light],
      [0.75, gold.base],
      [1, gold.shade],
    ],
    { cx: 0.36, cy: 0.32, r: 0.78 }
  );
  const rim = d.linear(
    [
      [0, gold.hi],
      [0.45, gold.light],
      [1, gold.deep],
    ],
    { x1: 0.15, y1: 0.1, x2: 0.85, y2: 0.95 }
  );
  const edge = d.linear(
    [
      [0, gold.shade],
      [1, gold.deep],
    ],
    { x1: 0, y1: 0, x2: 1, y2: 1 }
  );
  const t = 3.2 * k; // épaisseur visible
  let body = `<g mask="url(#${maskId})">`;
  body += `<circle cx="${f(cx + t * 0.55)}" cy="${f(cy + t)}" r="${f(r)}" fill="${edge}"/>`;
  body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${face}"/>`;
  body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - 1.7 * k)}" fill="none" stroke="${rim}" stroke-width="${f(3.4 * k)}"/>`;
  if (detail === "large") {
    body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(18.5 * k)}" fill="none" stroke="${gold.shade}" stroke-opacity=".55" stroke-width="${f(1.3 * k)}"/>`;
    body += `<circle cx="${f(cx + 0.6 * k)}" cy="${f(cy + 0.9 * k)}" r="${f(18.5 * k)}" fill="none" stroke="${gold.hi}" stroke-opacity=".5" stroke-width="${f(0.8 * k)}"/>`;
    // Reflet spéculaire en croissant (haut gauche).
    body += `<path d="M${f(cx - 17 * k)} ${f(cy - 4 * k)} A${f(19 * k)} ${f(19 * k)} 0 0 1 ${f(cx + 2 * k)} ${f(cy - 20 * k)} A${f(22 * k)} ${f(22 * k)} 0 0 0 ${f(cx - 17 * k)} ${f(cy - 4 * k)}Z" fill="#fff" fill-opacity=".5"/>`;
  } else {
    body += `<path d="M${f(cx - 15 * k)} ${f(cy - 6 * k)} A${f(18 * k)} ${f(18 * k)} 0 0 1 ${f(cx)} ${f(cy - 19 * k)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${f(2.2 * k)}" stroke-linecap="round"/>`;
  }
  body += `</g>`;
  // Parois du trou : haut et gauche dans l'ombre, bord bas-droit accroche la lumière.
  const wall = roundedSquare(cx, cy, 13 * k, 2.6 * k, -12);
  const wallShift = roundedSquare(cx + t * 0.55, cy + t, 13 * k, 2.6 * k, -12);
  const wallMask = d.id("wallmask");
  d.raw(`<mask id="${wallMask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(cx * 3)}" height="${f(cy * 3)}"><path d="${wall}" fill="#fff"/><path d="${wallShift}" fill="#000"/></mask>`);
  body += `<path d="${wall}" fill="${gold.deep}" mask="url(#${wallMask})"/>`;
  body += `<path d="${hole}" fill="none" stroke="${gold.hi}" stroke-opacity=".7" stroke-width="${f(0.9 * k)}" stroke-dasharray="${f(13 * k)} ${f(13 * k)}" stroke-dashoffset="${f(26 * k)}"/>`;
  return body;
}

export function coin({ detail = "large", shadow = true } = {}) {
  const d = defs(`coin-${detail}`);
  let body = "";
  if (shadow) body += `<ellipse cx="33" cy="60" rx="20" ry="3" fill="${shadowCool}" fill-opacity=".22"/>`;
  body += coinFace(d, { detail });
  return svg({ w: 64, h: 64, body, d });
}

/** Pièce vue en trois-quarts (pour les piles et tas) : ellipse de face + tranche. */
export function coinTilted(d, { cx, cy, rx = 22, ry = 8, thickness = 5 }) {
  const top = d.linear([[0, gold.hi], [0.5, gold.light], [1, gold.base]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const side = d.linear([[0, gold.base], [0.6, gold.shade], [1, gold.deep]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let b = "";
  b += `<path d="M${f(cx - rx)} ${f(cy)} v${thickness} a${rx} ${ry} 0 0 0 ${f(rx * 2)} 0 v${-thickness} Z" fill="${side}"/>`;
  b += `<path d="M${f(cx - rx)} ${f(cy + thickness * 0.55)} a${rx} ${ry} 0 0 0 ${f(rx * 2)} 0" fill="none" stroke="${gold.deep}" stroke-opacity=".35" stroke-width=".8"/>`;
  b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="${top}"/>`;
  b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - 2.4)}" ry="${f(ry - 1.2)}" fill="none" stroke="${gold.shade}" stroke-opacity=".45" stroke-width="1"/>`;
  // Trou carré vu en perspective (losange aplati).
  const hx = rx * 0.26;
  const hy = ry * 0.34;
  b += `<path d="M${f(cx - hx)} ${f(cy)} L${f(cx)} ${f(cy - hy)} L${f(cx + hx)} ${f(cy)} L${f(cx)} ${f(cy + hy)}Z" fill="${gold.deep}" fill-opacity=".85"/>`;
  b += `<path d="M${f(cx - rx + 4)} ${f(cy - 2)} Q${f(cx - rx * 0.4)} ${f(cy - ry + 0.8)} ${f(cx + 2)} ${f(cy - ry + 1.4)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>`;
  return b;
}

/** Pile de pièces (récompense, HUD large). */
export function coinStack({ count = 4 } = {}) {
  const d = defs("coin-stack");
  let body = `<ellipse cx="60" cy="104" rx="46" ry="7" fill="${shadowCool}" fill-opacity=".22"/>`;
  const offsets = [0, -2.5, 1.8, -1.2, 2.2, -0.6];
  for (let i = 0; i < count; i++) {
    body += coinTilted(d, { cx: 54 + offsets[i], cy: 92 - i * 7.5, rx: 26, ry: 9.5, thickness: 6.5 });
  }
  // Une pièce debout, légèrement inclinée, devant la pile.
  body += `<g transform="translate(64 44) rotate(14) scale(.78)">${coinFace(d, { detail: "large" })}</g>`;
  return svg({ w: 120, h: 112, body, d });
}

/** Bourse de cuir fermée par un cordon, quelques pièces qui dépassent. */
export function coinPouch() {
  const d = defs("coin-pouch");
  const leather = d.radial(
    [
      [0, "#d18a55"],
      [0.55, "#a8653a"],
      [1, "#6a3a1f"],
    ],
    { cx: 0.34, cy: 0.38, r: 0.8 }
  );
  const frill = d.linear([[0, "#c98450"], [1, "#7c4526"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  let body = `<ellipse cx="62" cy="116" rx="42" ry="6.5" fill="${shadowCool}" fill-opacity=".24"/>`;
  // Pièces qui dépassent du col (derrière le tissu du haut).
  body += coinTilted(d, { cx: 52, cy: 30, rx: 12, ry: 4.6, thickness: 3 });
  body += `<g transform="translate(58 10) rotate(18) scale(.42)">${coinFace(d, { detail: "small" })}</g>`;
  // Corps de la bourse.
  body += `<path d="M40 44 C22 58 16 86 26 102 C36 118 88 120 100 104 C112 88 104 58 84 44 Z" fill="${leather}"/>`;
  body += `<path d="M84 44 C104 58 112 88 100 104 C95 110 84 114 72 115 C88 104 94 80 84 44Z" fill="#5a2f18" fill-opacity=".35"/>`;
  body += `<path d="M34 64 C30 78 32 92 40 100" fill="none" stroke="#e9a877" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`;
  // Couture pointillée.
  body += `<path d="M30 92 C44 104 80 106 100 92" fill="none" stroke="#f1d6b3" stroke-opacity=".7" stroke-width="1.4" stroke-dasharray="3 4"/>`;
  // Collerette froncée au-dessus du cordon.
  body += `<path d="M40 44 C36 34 42 26 48 30 C50 22 58 22 62 28 C66 20 76 22 76 30 C84 26 90 34 84 44 Z" fill="${frill}"/>`;
  body += `<path d="M48 30 C50 36 50 40 49 44 M62 28 C62 34 62 40 61 44 M76 30 C74 36 73 40 72 44" fill="none" stroke="#5a2f18" stroke-opacity=".45" stroke-width="1.4"/>`;
  // Cordon.
  body += `<path d="M38 45 C52 50 72 50 86 45" fill="none" stroke="#e8d3a8" stroke-width="4.5" stroke-linecap="round"/>`;
  body += `<path d="M38 45 C52 50 72 50 86 45" fill="none" stroke="#b89a6a" stroke-width="1.2" stroke-dasharray="2 3"/>`;
  body += `<path d="M84 46 C92 54 94 64 90 72 M86 46 C96 50 102 58 102 66" fill="none" stroke="#e8d3a8" stroke-width="3.2" stroke-linecap="round"/>`;
  body += `<circle cx="90" cy="73" r="3.2" fill="#d9bf8c"/><circle cx="102" cy="67" r="3.2" fill="#d9bf8c"/>`;
  // Emblème : petite pièce estampée sur le cuir.
  body += `<g transform="translate(50 66) scale(.42)" opacity=".92">${coinFace(d, { detail: "small" })}</g>`;
  return svg({ w: 124, h: 124, body, d });
}
