// Briques communes du pipeline d'illustration Okodukai (voir docs/ART_BIBLE.md).
// Tout est déterministe : même seed => même image, pour que les assets soient reproductibles.

export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

const f = (n) => Math.round(n * 10) / 10;

/** Courbe lisse passant par les points (Catmull-Rom -> Bézier cubiques). */
export function smooth(points, { closed = false, tension = 1 } = {}) {
  if (points.length < 2) return "";
  const p = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  let d = `M${f(p[1][0])} ${f(p[1][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1x = x1 + ((x2 - x0) / 6) * tension;
    const c1y = y1 + ((y2 - y0) / 6) * tension;
    const c2x = x2 - ((x3 - x1) / 6) * tension;
    const c2y = y2 - ((y3 - y1) / 6) * tension;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x2)} ${f(y2)}`;
  }
  return closed ? d + "Z" : d;
}

/** Crête de relief : points répartis sur la largeur, hauteur = somme de sinusoïdes seedées. */
export function ridge({ width, base, amp, seed, count = 14, octaves = [[1, 1], [2.3, 0.45], [5.1, 0.18]], x0 = -40 }) {
  const r = rng(seed);
  const phases = octaves.map(() => r.range(0, Math.PI * 2));
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const x = x0 + ((width - 2 * x0) * i) / count;
    const t = i / count;
    let y = 0;
    octaves.forEach(([freq, weight], k) => {
      y += Math.sin(t * Math.PI * 2 * freq + phases[k]) * weight;
    });
    pts.push([x, base - y * amp]);
  }
  return pts;
}

/** Ferme une crête vers le bas pour en faire une surface pleine. */
export function ridgeArea(pts, bottom) {
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${smooth(pts)} L${f(last[0])} ${f(bottom)} L${f(first[0])} ${f(bottom)} Z`;
}

/** Hauteur de la crête interpolée en x (pour poser des objets dessus). */
export function ridgeY(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (x >= ax && x <= bx) {
      const t = (x - ax) / (bx - ax);
      const s = t * t * (3 - 2 * t);
      return ay + (by - ay) * s;
    }
  }
  return pts[pts.length - 1][1];
}

/**
 * Collecteur de définitions (<defs>) avec identifiants préfixés : un même
 * asset peut être inclus plusieurs fois dans la page sans collision d'id.
 */
export function defs(prefix) {
  const items = [];
  let n = 0;
  const id = (name) => `${prefix}-${name}-${n++}`;
  return {
    items,
    linear(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units } = {}) {
      const gid = id("lg");
      const u = units ? ` gradientUnits="${units}"` : "";
      items.push(
        `<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${u}>${stops
          .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a !== 1 ? ` stop-opacity="${a}"` : ""}/>`)
          .join("")}</linearGradient>`
      );
      return `url(#${gid})`;
    },
    radial(stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy, units } = {}) {
      const gid = id("rg");
      const u = units ? ` gradientUnits="${units}"` : "";
      const fxy = fx !== undefined ? ` fx="${fx}" fy="${fy}"` : "";
      items.push(
        `<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}"${fxy}${u}>${stops
          .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a !== 1 ? ` stop-opacity="${a}"` : ""}/>`)
          .join("")}</radialGradient>`
      );
      return `url(#${gid})`;
    },
    raw(markup) {
      items.push(markup);
    },
    id,
    render() {
      return items.length ? `<defs>${items.join("")}</defs>` : "";
    },
  };
}

export function svg({ w, h, body, d, title }) {
  const t = title ? `<title>${title}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${t}${d ? d.render() : ""}${body}</svg>`;
}

export { f as fmt };
