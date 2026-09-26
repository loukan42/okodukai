// La Vallée d'Okodukai — décor panoramique en couches (docs/ART_BIBLE.md §1, §3, §4).
// Couches : "back" (ciel, montagnes, collines, prairie, chemin) et "front" (avant-plan de cadrage).
// Composition paramétrable (desktop / mobile) : les lieux interactifs sont posés par l'interface.
import { defs, svg, rng, smooth, ridge, ridgeArea, ridgeY, fmt as f } from "../lib/core.mjs";
import { skies, foliage, grass, stone, wood, shadowCool } from "../lib/palette.mjs";

export const VALLEY_LAYOUTS = {
  desktop: {
    w: 1600,
    h: 900,
    sun: [300, 190],
    horizon: 430,
    farPeak: 170,
    midBase: 505,
    nearBase: 640,
    goalHill: [300, 452],
    obsHill: [1260, 432],
    pathFrom: [860, 900],
    frontTree: "right",
  },
  mobile: {
    w: 780,
    h: 1040,
    sun: [150, 170],
    horizon: 420,
    farPeak: 150,
    midBase: 500,
    nearBase: 650,
    goalHill: [170, 450],
    obsHill: [640, 436],
    pathFrom: [390, 1040],
    frontTree: "right",
  },
};

function roundTree(d, x, y, s, pal, r) {
  const wob = () => r.range(-0.06, 0.06) * s;
  let b = `<ellipse cx="${f(x + s * 0.12)}" cy="${f(y)}" rx="${f(s * 0.42)}" ry="${f(s * 0.08)}" fill="${shadowCool}" fill-opacity=".18"/>`;
  b += `<path d="M${f(x - s * 0.05)} ${f(y)} L${f(x - s * 0.03)} ${f(y - s * 0.5)} L${f(x + s * 0.05)} ${f(y - s * 0.5)} L${f(x + s * 0.07)} ${f(y)}Z" fill="${wood.shade}"/>`;
  b += `<circle cx="${f(x + s * 0.24 + wob())}" cy="${f(y - s * 0.52)}" r="${f(s * 0.3)}" fill="${pal.shade}"/>`;
  b += `<circle cx="${f(x + wob())}" cy="${f(y - s * 0.74)}" r="${f(s * 0.4)}" fill="${pal.base}"/>`;
  b += `<circle cx="${f(x - s * 0.24 + wob())}" cy="${f(y - s * 0.54)}" r="${f(s * 0.28)}" fill="${pal.base}"/>`;
  b += `<circle cx="${f(x + s * 0.2)}" cy="${f(y - s * 0.62)}" r="${f(s * 0.24)}" fill="${pal.shade}" fill-opacity=".55"/>`;
  b += `<circle cx="${f(x - s * 0.12)}" cy="${f(y - s * 0.88)}" r="${f(s * 0.2)}" fill="${pal.light}"/>`;
  b += `<circle cx="${f(x - s * 0.3)}" cy="${f(y - s * 0.62)}" r="${f(s * 0.12)}" fill="${pal.light}" fill-opacity=".8"/>`;
  return b;
}

function pine(d, x, y, s, pal) {
  let b = `<rect x="${f(x - s * 0.04)}" y="${f(y - s * 0.22)}" width="${f(s * 0.08)}" height="${f(s * 0.22)}" fill="${wood.shade}"/>`;
  for (let i = 0; i < 3; i++) {
    const w = s * (0.42 - i * 0.1);
    const top = y - s * (0.55 + i * 0.28);
    const bot = y - s * (0.16 + i * 0.26);
    b += `<path d="M${f(x)} ${f(top)} L${f(x - w)} ${f(bot)} Q${f(x)} ${f(bot + s * 0.05)} ${f(x)} ${f(bot + s * 0.04)} Z" fill="${pal.light}"/>`;
    b += `<path d="M${f(x)} ${f(top)} L${f(x + w)} ${f(bot)} Q${f(x)} ${f(bot + s * 0.05)} ${f(x)} ${f(bot + s * 0.04)} Z" fill="${pal.shade}"/>`;
  }
  return b;
}

function tuft(x, y, s, color, r) {
  let d = "";
  const n = r.int(4, 6);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * s * 0.2;
    const h = s * r.range(0.55, 1);
    const lean = (dx / s) * s * 0.9 + r.range(-0.15, 0.15) * s;
    d += `M${f(x + dx - s * 0.13)} ${f(y)} Q${f(x + dx + lean * 0.3)} ${f(y - h * 0.55)} ${f(x + dx + lean)} ${f(y - h)} Q${f(x + dx + lean * 0.35 + s * 0.1)} ${f(y - h * 0.45)} ${f(x + dx + s * 0.15)} ${f(y)} Z`;
  }
  return `<path d="${d}" fill="${color}"/>`;
}

function rock(x, y, s, r) {
  const w = s * r.range(0.9, 1.3);
  let b = `<ellipse cx="${f(x + s * 0.1)}" cy="${f(y + s * 0.05)}" rx="${f(w * 0.62)}" ry="${f(s * 0.14)}" fill="${shadowCool}" fill-opacity=".2"/>`;
  b += `<path d="M${f(x - w * 0.5)} ${f(y)} Q${f(x - w * 0.52)} ${f(y - s * 0.5)} ${f(x - w * 0.1)} ${f(y - s * 0.6)} Q${f(x + w * 0.4)} ${f(y - s * 0.62)} ${f(x + w * 0.52)} ${f(y - s * 0.18)} L${f(x + w * 0.5)} ${f(y)} Z" fill="${stone.base}"/>`;
  b += `<path d="M${f(x - w * 0.46)} ${f(y - s * 0.1)} Q${f(x - w * 0.48)} ${f(y - s * 0.46)} ${f(x - w * 0.1)} ${f(y - s * 0.55)} Q${f(x + w * 0.1)} ${f(y - s * 0.56)} ${f(x + w * 0.2)} ${f(y - s * 0.48)} Q${f(x - w * 0.2)} ${f(y - s * 0.36)} ${f(x - w * 0.3)} ${f(y - s * 0.06)}Z" fill="${stone.light}"/>`;
  b += `<path d="M${f(x - w * 0.2)} ${f(y - s * 0.56)} Q${f(x + w * 0.1)} ${f(y - s * 0.66)} ${f(x + w * 0.34)} ${f(y - s * 0.52)} Q${f(x + w * 0.1)} ${f(y - s * 0.52)} ${f(x - w * 0.2)} ${f(y - s * 0.56)}Z" fill="${stone.moss}"/>`;
  return b;
}

function cloud(d, x, y, s, sky) {
  const cid = d.id("cloud");
  const shape = `M${f(x - s)} ${f(y)} C${f(x - s * 1.12)} ${f(y - s * 0.3)} ${f(x - s * 0.8)} ${f(y - s * 0.5)} ${f(x - s * 0.55)} ${f(y - s * 0.4)} C${f(x - s * 0.5)} ${f(y - s * 0.86)} ${f(x - s * 0.02)} ${f(y - s * 0.92)} ${f(x + s * 0.1)} ${f(y - s * 0.62)} C${f(x + s * 0.28)} ${f(y - s * 1.02)} ${f(x + s * 0.82)} ${f(y - s * 0.86)} ${f(x + s * 0.72)} ${f(y - s * 0.4)} C${f(x + s * 1.02)} ${f(y - s * 0.4)} ${f(x + s * 1.1)} ${f(y - s * 0.06)} ${f(x + s * 0.9)} ${f(y)} Q${f(x)} ${f(y + s * 0.08)} ${f(x - s)} ${f(y)} Z`;
  d.raw(`<clipPath id="${cid}"><path d="${shape}"/></clipPath>`);
  return `<g opacity=".92"><path d="${shape}" fill="${sky.cloudShade}"/><g clip-path="url(#${cid})"><path d="${shape}" transform="translate(${f(-s * 0.05)} ${f(-s * 0.09)})" fill="${sky.cloudLight}"/></g></g>`;
}

/** Ombre des versants tournés vers la droite (le soleil est à gauche). */
function slopeShade(pts, bottom, color, opacity, d) {
  const fade = d.linear([[0, color, opacity], [1, color, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  let out = "";
  for (let i = 1; i < pts.length - 1; i++) {
    const isPeak = pts[i][1] < pts[i - 1][1] && pts[i][1] <= pts[i + 1][1];
    if (!isPeak) continue;
    let j = i + 1;
    while (j < pts.length - 1 && pts[j + 1][1] >= pts[j][1]) j++;
    const seg = pts.slice(i, j + 1);
    const [px, py] = pts[i];
    const [vx, vy] = pts[j];
    const back = [px + (vx - px) * 0.18, bottom];
    out += `<path d="${smooth(seg)} L${f(vx)} ${f(bottom)} L${f(back[0])} ${f(back[1])} Q${f(px + (vx - px) * 0.05)} ${f(py + (bottom - py) * 0.4)} ${f(px)} ${f(py)}Z" fill="${fade}"/>`;
  }
  return out;
}

/** Ruban de chemin qui s'amincit avec la distance, le long d'une courbe. */
function pathRibbon(points, wStart, wEnd) {
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[Math.min(i + 1, points.length - 1)];
    const [px, py] = points[Math.max(i - 1, 0)];
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = wStart + (wEnd - wStart) * (i / (points.length - 1));
    left.push([x - dy * w, y + dx * w]);
    right.push([x + dy * w, y - dx * w]);
  }
  const l = smooth(left);
  const rr = smooth(right.reverse()).replace(/^M/, "L");
  return `${l} ${rr} Z`;
}

export function valley({ layout = "desktop", mood = "golden", layer = "all", seed = 42 } = {}) {
  const L = VALLEY_LAYOUTS[layout];
  const sky = skies[mood];
  const { w, h } = L;
  const d = defs(`valley-${layout}-${mood}-${layer}`);
  const r = rng(seed);
  let back = "";
  let front = "";

  // --- Ciel ---------------------------------------------------------------
  const skyFill = d.linear([[0, sky.top], [0.42, sky.mid], [0.72, sky.low], [1, sky.horizon]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  back += `<rect width="${w}" height="${h}" fill="${skyFill}"/>`;
  const sunGlow = d.radial([[0, sky.sun, 1], [0.12, sky.sun, 0.85], [0.4, sky.haze, 0.35], [1, sky.haze, 0]], { cx: L.sun[0] / w, cy: L.sun[1] / h, r: 0.55, units: undefined });
  back += `<rect width="${w}" height="${h}" fill="${sunGlow}"/>`;
  // Rayons très doux depuis le soleil.
  for (let i = 0; i < 5; i++) {
    const a = (0.35 + i * 0.12) * Math.PI;
    const len = w * 0.9;
    const x2 = L.sun[0] + Math.cos(a - Math.PI * 0.62) * len;
    const y2 = L.sun[1] + Math.sin(a - Math.PI * 0.62) * len;
    const spread = 40 + i * 12;
    back += `<path d="M${L.sun[0]} ${L.sun[1]} L${f(x2 - spread)} ${f(y2)} L${f(x2 + spread)} ${f(y2)}Z" fill="#fffaf0" fill-opacity="${mood === "golden" ? 0.07 : 0.05}"/>`;
  }
  if (mood === "dusk") {
    for (let i = 0; i < (layout === "desktop" ? 70 : 40); i++) {
      const x = r.range(0, w);
      const y = r.range(0, L.horizon * 0.62);
      back += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r.range(0.8, 2))}" fill="#fff6dc" fill-opacity="${f(r.range(0.4, 0.95))}"/>`;
    }
  }
  // Nuages.
  const clouds = layout === "desktop" ? [[620, 150, 90], [1080, 110, 70], [1380, 210, 110], [860, 250, 55]] : [[470, 150, 70], [690, 250, 60], [260, 290, 45]];
  for (const [x, y, s] of clouds) back += cloud(d, x, y, s, sky);

  // --- Montagnes lointaines ---------------------------------------------------
  const far2 = ridge({ width: w, base: L.horizon - 60, amp: 90, seed: seed + 1, count: 12, octaves: [[1.2, 1], [3.1, 0.35], [7, 0.12]] });
  const far1 = ridge({ width: w, base: L.horizon - 10, amp: 70, seed: seed + 2, count: 14, octaves: [[1.6, 1], [3.7, 0.4], [9, 0.1]] });
  // On abaisse les crêtes près du soleil pour dégager la lumière.
  for (const p of [...far2, ...far1]) p[1] += Math.max(0, 1 - Math.abs(p[0] - L.sun[0]) / (w * 0.35)) * 70;
  const mfar2 = d.linear([[0, sky.far2], [1, sky.mist]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const mfar1 = d.linear([[0, sky.far1], [1, sky.mist]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  back += `<path d="${ridgeArea(far2, L.horizon + 60)}" fill="${mfar2}"/>`;
  back += `<path d="${smooth(far2)}" fill="none" stroke="#fffaf0" stroke-opacity=".28" stroke-width="2"/>`;
  back += slopeShade(far2, L.horizon + 60, "#4d6478", 0.2, d);
  back += `<path d="${ridgeArea(far1, L.horizon + 80)}" fill="${mfar1}"/>`;
  back += slopeShade(far1, L.horizon + 80, "#4d6478", 0.18, d);
  back += `<path d="${smooth(far1)}" fill="none" stroke="#fffaf0" stroke-opacity=".22" stroke-width="2"/>`;
  // Bande de brume.
  const mist = d.linear([[0, sky.mist, 0], [0.5, sky.mist, 0.85], [1, sky.mist, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  back += `<rect x="0" y="${L.horizon - 30}" width="${w}" height="120" fill="${mist}"/>`;

  // --- Collines moyennes ------------------------------------------------------
  const mid = ridge({ width: w, base: L.midBase, amp: 34, seed: seed + 3, count: 16, octaves: [[1.4, 1], [3.3, 0.35]] });
  // Colline de l'objectif (gauche) et de l'observatoire (droite).
  for (const p of mid) {
    p[1] -= Math.exp(-(((p[0] - L.goalHill[0]) / (w * 0.09)) ** 2)) * (L.midBase - L.goalHill[1]);
    p[1] -= Math.exp(-(((p[0] - L.obsHill[0]) / (w * 0.1)) ** 2)) * (L.midBase - L.obsHill[1]);
  }
  const midFill = d.linear([[0, foliage.far.light], [0.35, foliage.mid.base], [1, foliage.mid.shade]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  back += `<path d="${ridgeArea(mid, h)}" fill="${midFill}"/>`;
  back += `<path d="${smooth(mid)}" fill="none" stroke="${foliage.mid.light}" stroke-width="3" stroke-opacity=".7"/>`;
  // Arbres des collines (petits, plus clairs au loin).
  const midTrees = layout === "desktop" ? 26 : 12;
  for (let i = 0; i < midTrees; i++) {
    const x = r.range(-20, w + 20);
    if (Math.abs(x - L.goalHill[0]) < 60 || Math.abs(x - L.obsHill[0]) < 80) continue;
    const y = ridgeY(mid, x) + r.range(4, 26);
    const s = r.range(26, 42);
    back += r.next() < 0.4 ? pine(d, x, y, s * 1.3, foliage.pine) : roundTree(d, x, y, s, foliage.mid, r);
  }

  // --- Prairie proche et chemin -------------------------------------------------
  const near = ridge({ width: w, base: L.nearBase, amp: 22, seed: seed + 4, count: 12, octaves: [[1.1, 1], [2.7, 0.3]] });
  const nearFill = d.linear([[0, grass.light], [0.3, grass.base], [1, grass.shade]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  // Chemin : du bas de l'écran vers la colline de l'objectif, en lacets.
  const [gx, gy] = L.goalHill;
  const [sx, sy] = L.pathFrom;
  const pts = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const e = 1 - (1 - t) ** 1.6;
    const x = sx + (gx - sx) * e + Math.sin(t * Math.PI * 2.2) * (1 - t) * (layout === "desktop" ? 150 : 90);
    const y = sy + (gy + 6 - sy) * (1 - (1 - t) ** 1.25);
    pts.push([x, y]);
  }
  const pathFill = d.linear([[0, "#f1dfb6"], [1, "#d9bf8c"]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const midPath = pathRibbon(pts, layout === "desktop" ? 70 : 60, 5);

  back += `<path d="${ridgeArea(near, h)}" fill="${nearFill}"/>`;
  back += `<path d="${smooth(near)}" fill="none" stroke="${grass.hi}" stroke-width="3" stroke-opacity=".6"/>`;
  back += `<path d="${midPath}" fill="${pathFill}"/>`;
  back += `<path d="${midPath}" fill="none" stroke="#b89a6a" stroke-opacity=".45" stroke-width="2"/>`;
  // Pierres de bord de chemin et touffes.
  for (let i = 3; i < pts.length - 2; i += 2) {
    const [x, y] = pts[i];
    const k = 1 - i / pts.length;
    back += tuft(x + (r.next() < 0.5 ? -1 : 1) * (40 * k + 8), y + 4, 16 * k + 4, grass.shade, r);
  }
  // Fleurs en petits massifs.
  for (let k = 0; k < (layout === "desktop" ? 9 : 5); k++) {
    const cx = r.range(40, w - 40);
    const cy = r.range(ridgeY(near, cx) + 40, h - 30);
    const c = r.pick(["#fbf1da", "#f7dd8a", "#df7358"]);
    for (let i = 0; i < 9; i++) {
      const x = cx + r.range(-26, 26);
      const y = cy + r.range(-8, 8);
      back += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r.range(2, 3.4))}" fill="${c}"/>`;
    }
  }
  for (let i = 0; i < (layout === "desktop" ? 22 : 10); i++) {
    const x = r.range(0, w);
    const y = r.range(ridgeY(near, x) + 10, h);
    back += tuft(x, y, r.range(10, 22), r.pick([grass.base, grass.shade, grass.light]), r);
  }

  if (mood === "dusk") {
    const veil = d.linear([[0, "#2c3d6b", 0], [0.25, "#2c3d6b", 0.3], [0.6, "#2c3d6b", 0.46], [1, "#1f2d52", 0.52]], { x1: 0, y1: 0, x2: 0, y2: 1 });
    back += `<rect y="${L.horizon - 160}" width="${w}" height="${h - L.horizon + 160}" fill="${veil}" style="mix-blend-mode:multiply"/>`;
  }
  const campLight = d.radial([[0, "#ffe6a8", 0.42], [0.55, "#ffd98a", 0.12], [1, "#ffd98a", 0]]);
  back += `<ellipse cx="${f(w * 0.54)}" cy="${f(L.nearBase + 90)}" rx="${f(w * 0.36)}" ry="${f(h * 0.2)}" fill="${campLight}"/>`;
  const vignette = d.radial([[0.55, "#10203a", 0], [1, "#10203a", 0.28]], { cx: 0.5, cy: 0.42, r: 0.75 });
  back += `<rect width="${w}" height="${h}" fill="${vignette}"/>`;

  // --- Avant-plan de cadrage ---------------------------------------------------
  // Rochers et buissons en bas à gauche.
  front += rock(layout === "desktop" ? 80 : 40, h - 14, 70, r) + rock(layout === "desktop" ? 150 : 110, h - 6, 44, r);
  for (let i = 0; i < 8; i++) front += tuft(r.range(0, layout === "desktop" ? 260 : 170), h + 2, r.range(26, 44), r.pick([grass.shade, grass.deep, grass.base]), r);
  // Ginkgo doré sur le bord droit : masses de feuillage éclairées à gauche,
  // éventails de feuilles seulement sur la silhouette.
  const tx = layout === "desktop" ? w - 70 : w - 30;
  const trunk = d.linear([[0, wood.light], [0.5, wood.base], [1, wood.deep]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  front += `<path d="M${tx - 22} ${h} C${tx - 16} ${h - 180} ${tx - 40} ${h - 300} ${tx - 20} ${h - 470} L${tx + 14} ${h - 470} C${tx + 2} ${h - 300} ${tx + 30} ${h - 170} ${tx + 36} ${h} Z" fill="${trunk}"/>`;
  front += `<path d="M${tx - 24} ${h - 400} C${tx - 60} ${h - 440} ${tx - 96} ${h - 452} ${tx - 132} ${h - 486}" fill="none" stroke="${wood.base}" stroke-width="11" stroke-linecap="round"/>`;
  const fan = (x, y, s2, rot, c) => `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="M0 0 L${f(-s2 * 0.62)} ${f(-s2 * 0.82)} Q${f(-s2 * 0.34)} ${f(-s2 * 1.08)} ${f(-s2 * 0.04)} ${f(-s2 * 0.9)} L0 ${f(-s2 * 0.78)} L${f(s2 * 0.04)} ${f(-s2 * 0.9)} Q${f(s2 * 0.34)} ${f(-s2 * 1.08)} ${f(s2 * 0.62)} ${f(-s2 * 0.82)} Z" fill="${c}"/>`;
  const masses = layout === "desktop"
    ? [[tx - 120, h - 520, 88], [tx - 10, h - 590, 110], [tx + 70, h - 500, 80]]
    : [[tx - 90, h - 560, 70], [tx + 10, h - 620, 90], [tx + 60, h - 540, 60]];
  const puff = (cx, cy, rad, color, n, spread) => {
    let o = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r.range(-0.2, 0.2);
      const rr = rad * r.range(0.34, 0.5);
      o += `<circle cx="${f(cx + Math.cos(a) * rad * spread * 1.15)}" cy="${f(cy + Math.sin(a) * rad * spread * 0.72)}" r="${f(rr)}" fill="${color}"/>`;
    }
    return o + `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rad * 0.95)}" ry="${f(rad * 0.6)}" fill="${color}"/>`;
  };
  for (const [cx, cy, rad] of masses) front += puff(cx + rad * 0.12, cy + rad * 0.16, rad, foliage.ginkgo.shade, 11, 0.78);
  for (const [cx, cy, rad] of masses) front += puff(cx, cy, rad * 0.94, foliage.ginkgo.base, 10, 0.72);
  for (const [cx, cy, rad] of masses) front += puff(cx - rad * 0.3, cy - rad * 0.24, rad * 0.5, foliage.ginkgo.light, 7, 0.7);
  // Éventails de ginkgo seulement sur la lisière éclairée.
  for (const [cx, cy, rad] of masses) {
    for (let i = 0; i < 18; i++) {
      const a = r.range(Math.PI * 0.95, Math.PI * 1.6);
      const x = cx + Math.cos(a) * rad * 1.12;
      const y = cy + Math.sin(a) * rad * 0.8;
      front += fan(x, y, r.range(9, 13), (a * 180) / Math.PI + 90 + r.range(-25, 25), r.next() < 0.6 ? foliage.ginkgo.light : foliage.ginkgo.base);
    }
  }
  // Quelques feuilles qui tombent (animables côté interface).
  for (let i = 0; i < 5; i++) front += `<g class="falling-leaf">${fan(r.range(w * 0.62, w * 0.95), r.range(h * 0.45, h * 0.8), 11, r.range(0, 360), foliage.ginkgo.base)}</g>`;

  const layers = { back, front };
  const body = layer === "all" ? back + front : layers[layer];
  if (mood === "dusk" && layer !== "front") {
    // Crépuscule : voile bleuté multiplié sur le paysage, pas sur le ciel déjà teinté.
  }
  return svg({ w, h, body, d });
}
