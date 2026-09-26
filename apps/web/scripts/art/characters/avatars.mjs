// Roster d'avatars Okodukai (docs/ART_BIBLE.md §7) : portraits en buste 128×128,
// mêmes proportions, même lumière (haut gauche), palettes limitées. Aucun texte.
import { defs, svg, fmt as f } from "../lib/core.mjs";

const SKINS = {
  s1: { light: "#fde6d3", base: "#f6d3b8", shade: "#e3b394" },
  s2: { light: "#f8d9bf", base: "#eec39f", shade: "#d69f7a" },
  s3: { light: "#e8bb92", base: "#d9a275", shade: "#bb7f56" },
  s4: { light: "#c9936a", base: "#b57a50", shade: "#935e39" },
  s5: { light: "#a06f4d", base: "#86573a", shade: "#6a4128" },
};
const HAIRS = {
  black: { light: "#4a3d44", base: "#2b2227", shade: "#1a1418" },
  darkBrown: { light: "#6d4a37", base: "#4a3226", shade: "#33221a" },
  brown: { light: "#8e5e3b", base: "#6b4428", shade: "#4d301c" },
  auburn: { light: "#b8603b", base: "#944629", shade: "#6d311c" },
  blond: { light: "#f0cd7c", base: "#d9a857", shade: "#b5843a" },
  ginger: { light: "#e08a55", base: "#c8683a", shade: "#9c4c27" },
};
const OUTFITS = {
  vermilion: { light: "#df7358", base: "#c8553f", shade: "#98392a" },
  indigo: { light: "#4f75a3", base: "#2e4a6b", shade: "#1f334d" },
  teal: { light: "#5f9c96", base: "#3f7f7a", shade: "#2b5d59" },
  mustard: { light: "#f1cd6b", base: "#d9a441", shade: "#a8761f" },
  forest: { light: "#5e9a73", base: "#2d7254", shade: "#1f5039" },
  plum: { light: "#9a6f8f", base: "#7a5070", shade: "#573850" },
};
const BACKDROPS = {
  sky: ["#dbe9f3", "#a9c8dc"],
  peach: ["#fbe6cf", "#f0c39a"],
  sage: ["#e3eedb", "#b7d0a4"],
  sand: ["#f6ecd4", "#e2cc9b"],
  rose: ["#f7e0dc", "#e8b3aa"],
  mist: ["#e6e4f0", "#bfc0d8"],
};

export const ROSTER = [
  { id: "aventurier-01", skin: "s1", hair: "brown", style: "tousled", outfit: "vermilion", back: "sky", acc: "scarf" },
  { id: "aventurier-02", skin: "s3", hair: "black", style: "ponytail", outfit: "teal", back: "peach", acc: "none" },
  { id: "aventurier-03", skin: "s5", hair: "black", style: "curly", outfit: "mustard", back: "sage", acc: "headband" },
  { id: "aventurier-04", skin: "s2", hair: "blond", style: "bob", outfit: "indigo", back: "rose", acc: "clip" },
  { id: "aventurier-05", skin: "s4", hair: "darkBrown", style: "spiky", outfit: "forest", back: "sand", acc: "none" },
  { id: "aventurier-06", skin: "s1", hair: "ginger", style: "braids", outfit: "plum", back: "sky", acc: "none" },
  { id: "aventurier-07", skin: "s3", hair: "darkBrown", style: "hat", outfit: "teal", back: "sand", acc: "none" },
  { id: "aventurier-08", skin: "s5", hair: "black", style: "buns", outfit: "vermilion", back: "mist", acc: "none" },
  { id: "aventurier-09", skin: "s2", hair: "auburn", style: "long", outfit: "forest", back: "peach", acc: "glasses" },
  { id: "aventurier-10", skin: "s4", hair: "black", style: "beanie", outfit: "indigo", back: "sage", acc: "none" },
  { id: "aventurier-11", skin: "s1", hair: "blond", style: "tousled", outfit: "mustard", back: "mist", acc: "glasses" },
  { id: "aventurier-12", skin: "s3", hair: "brown", style: "long", outfit: "vermilion", back: "sky", acc: "headband" },
];

const HX = 64, HY = 60, HRX = 29, HRY = 30; // tête

function hairBack(style, h) {
  switch (style) {
    case "bob":
      return `<path d="M${HX - 34} ${HY + 20} Q${HX - 38} ${HY - 30} ${HX} ${HY - 34} Q${HX + 38} ${HY - 30} ${HX + 34} ${HY + 20} Q${HX + 30} ${HY + 26} ${HX + 22} ${HY + 22} L${HX - 22} ${HY + 22} Q${HX - 30} ${HY + 26} ${HX - 34} ${HY + 20}Z" fill="${h.base}"/>`;
    case "long":
      return `<path d="M${HX - 33} ${HY + 52} Q${HX - 42} ${HY - 28} ${HX} ${HY - 34} Q${HX + 42} ${HY - 28} ${HX + 33} ${HY + 52} Q${HX + 20} ${HY + 58} ${HX + 16} ${HY + 40} L${HX - 16} ${HY + 40} Q${HX - 20} ${HY + 58} ${HX - 33} ${HY + 52}Z" fill="${h.base}"/><path d="M${HX + 26} ${HY + 4} Q${HX + 34} ${HY + 30} ${HX + 30} ${HY + 50}" fill="none" stroke="${h.shade}" stroke-width="3" stroke-linecap="round"/>`;
    case "curly": {
      let o = "";
      const pts = [[-30, -10, 14], [-24, -28, 14], [-8, -38, 15], [10, -38, 15], [26, -28, 14], [32, -10, 14], [30, 8, 12], [-30, 8, 12]];
      for (const [dx, dy, r] of pts) o += `<circle cx="${HX + dx}" cy="${HY + dy}" r="${r}" fill="${h.base}"/>`;
      return o;
    }
    case "ponytail":
      return `<path d="M${HX + 24} ${HY - 18} Q${HX + 46} ${HY - 14} ${HX + 44} ${HY + 14} Q${HX + 42} ${HY + 34} ${HX + 30} ${HY + 42} Q${HX + 36} ${HY + 22} ${HX + 28} ${HY + 4}Z" fill="${h.base}"/><path d="M${HX + 36} ${HY - 8} Q${HX + 44} ${HY + 8} ${HX + 36} ${HY + 28}" fill="none" stroke="${h.shade}" stroke-width="2.4" stroke-linecap="round"/>`;
    case "braids":
      return [[-1, HX - 28], [1, HX + 28]]
        .map(([s, x]) => {
          let o = "";
          for (let i = 0; i < 4; i++) o += `<ellipse cx="${x + s * 2}" cy="${HY + 14 + i * 9}" rx="6" ry="5.4" fill="${i % 2 ? h.shade : h.base}"/>`;
          return o + `<circle cx="${x + s * 2}" cy="${HY + 52}" r="3" fill="#c8553f"/>`;
        })
        .join("");
    default:
      return "";
  }
}

function hairFront(style, h, d) {
  const g = d.linear([[0, h.light], [0.55, h.base], [1, h.shade]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const cap = `M${HX - HRX - 1} ${HY - 2} Q${HX - HRX - 2} ${HY - HRY - 8} ${HX} ${HY - HRY - 8} Q${HX + HRX + 2} ${HY - HRY - 8} ${HX + HRX + 1} ${HY - 2}`;
  switch (style) {
    case "tousled":
      return `<path d="${cap} Q${HX + 22} ${HY - 18} ${HX + 12} ${HY - 16} Q${HX + 8} ${HY - 10} ${HX + 2} ${HY - 14} Q${HX - 4} ${HY - 8} ${HX - 10} ${HY - 14} Q${HX - 18} ${HY - 10} ${HX - 20} ${HY - 16} Q${HX - 26} ${HY - 12} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/><path d="M${HX - 14} ${HY - 30} Q${HX - 4} ${HY - 38} ${HX + 10} ${HY - 34}" fill="none" stroke="${h.light}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    case "bob":
      return `<path d="${cap} Q${HX + 26} ${HY - 14} ${HX + 18} ${HY - 16} L${HX - 18} ${HY - 16} Q${HX - 26} ${HY - 14} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/><path d="M${HX - 12} ${HY - 30} Q${HX} ${HY - 37} ${HX + 12} ${HY - 32}" fill="none" stroke="${h.light}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    case "ponytail":
    case "braids":
    case "long":
      return `<path d="${cap} Q${HX + 24} ${HY - 20} ${HX + 4} ${HY - 22} Q${HX - 14} ${HY - 22} ${HX - 22} ${HY - 10} Q${HX - 26} ${HY - 6} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/><path d="M${HX} ${HY - 36} L${HX + 2} ${HY - 22}" stroke="${h.shade}" stroke-width="1.6" opacity=".7"/><path d="M${HX - 16} ${HY - 30} Q${HX - 8} ${HY - 36} ${HX - 2} ${HY - 34}" fill="none" stroke="${h.light}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    case "curly": {
      let o = "";
      const pts = [[-20, -26, 11], [-6, -32, 11], [8, -32, 11], [20, -26, 10], [-26, -14, 8], [26, -14, 8]];
      for (const [dx, dy, r] of pts) o += `<circle cx="${HX + dx}" cy="${HY + dy}" r="${r}" fill="${g}"/>`;
      return o + `<circle cx="${HX - 10}" cy="${HY - 36}" r="4" fill="${h.light}" opacity=".7"/>`;
    }
    case "spiky": {
      let o = `<path d="${cap} Q${HX + 20} ${HY - 18} ${HX} ${HY - 18} Q${HX - 20} ${HY - 18} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/>`;
      for (const [dx, h2, rot] of [[-20, 9, -38], [-10, 12, -18], [0, 13, 0], [10, 12, 18], [20, 9, 38]]) {
        o += `<path transform="rotate(${rot} ${HX + dx} ${HY - 30})" d="M${HX + dx - 6} ${HY - 27} Q${HX + dx - 2} ${HY - 30 - h2} ${HX + dx + 1} ${HY - 30 - h2} Q${HX + dx + 4} ${HY - 30 - h2 * 0.7} ${HX + dx + 6} ${HY - 27}Z" fill="${g}"/>`;
      }
      return o;
    }
    case "buns":
      return `<circle cx="${HX - 22}" cy="${HY - 34}" r="11" fill="${h.base}"/><circle cx="${HX + 22}" cy="${HY - 34}" r="11" fill="${h.base}"/><circle cx="${HX - 25}" cy="${HY - 37}" r="4" fill="${h.light}" opacity=".7"/><path d="${cap} Q${HX + 24} ${HY - 16} ${HX} ${HY - 18} Q${HX - 24} ${HY - 16} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/>`;
    case "hat": {
      const brim = d.linear([[0, "#d9b27a"], [1, "#a7773f"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
      return `<path d="${cap} Q${HX + 20} ${HY - 16} ${HX} ${HY - 16} Q${HX - 20} ${HY - 16} ${HX - HRX - 1} ${HY - 2}Z" fill="${g}"/><ellipse cx="${HX}" cy="${HY - 26}" rx="44" ry="10" fill="${brim}"/><path d="M${HX - 24} ${HY - 28} Q${HX - 24} ${HY - 56} ${HX} ${HY - 56} Q${HX + 24} ${HY - 56} ${HX + 24} ${HY - 28}Z" fill="#c9985c"/><path d="M${HX - 24} ${HY - 33} Q${HX} ${HY - 28} ${HX + 24} ${HY - 33} L${HX + 24} ${HY - 28} Q${HX} ${HY - 23} ${HX - 24} ${HY - 28}Z" fill="#c8553f"/><path d="M${HX - 16} ${HY - 50} Q${HX - 8} ${HY - 54} ${HX} ${HY - 54}" fill="none" stroke="#ead0a4" stroke-width="3" stroke-linecap="round"/>`;
    }
    case "beanie":
      return `<path d="M${HX - HRX - 2} ${HY - 10} Q${HX - HRX} ${HY - 46} ${HX} ${HY - 46} Q${HX + HRX} ${HY - 46} ${HX + HRX + 2} ${HY - 10}Z" fill="#2d7254"/><rect x="${HX - HRX - 3}" y="${HY - 16}" width="${HRX * 2 + 6}" height="10" rx="5" fill="#1f5039"/><circle cx="${HX}" cy="${HY - 48}" r="7" fill="#f1e3c4"/><path d="M${HX - 16} ${HY - 38} Q${HX - 8} ${HY - 43} ${HX} ${HY - 43}" fill="none" stroke="#5e9a73" stroke-width="3" stroke-linecap="round"/><path d="M${HX - HRX + 2} ${HY - 6} Q${HX - HRX + 6} ${HY - 2} ${HX - HRX + 10} ${HY - 6}" fill="${h.base}"/>`;
    default:
      return "";
  }
}

export function avatar(spec) {
  const d = defs(spec.id);
  const skin = SKINS[spec.skin];
  const hair = HAIRS[spec.hair];
  const outfit = OUTFITS[spec.outfit];
  const [b1, b2] = BACKDROPS[spec.back];
  const clip = d.id("clip");
  d.raw(`<clipPath id="${clip}"><circle cx="64" cy="64" r="64"/></clipPath>`);
  const backdrop = d.radial([[0, b1], [1, b2]], { cx: 0.35, cy: 0.3, r: 0.85 });
  const face = d.radial([[0, skin.light], [0.6, skin.base], [1, skin.shade]], { cx: 0.36, cy: 0.34, r: 0.8 });
  const cloth = d.linear([[0, outfit.light], [0.6, outfit.base], [1, outfit.shade]], { x1: 0, y1: 0, x2: 1, y2: 1 });

  let b = `<g clip-path="url(#${clip})">`;
  b += `<rect width="128" height="128" fill="${backdrop}"/>`;
  b += `<circle cx="30" cy="26" r="26" fill="#fff" fill-opacity=".25"/>`;
  b += hairBack(spec.style, hair);
  // Épaules et vêtement d'explorateur.
  b += `<path d="M14 132 Q16 102 44 96 L84 96 Q112 102 114 132Z" fill="${cloth}"/>`;
  b += `<path d="M84 96 Q108 102 112 128 L114 132 L96 132 Q98 110 84 100Z" fill="${outfit.shade}" opacity=".45"/>`;
  // Cou.
  b += `<path d="M54 84 L54 100 Q64 106 74 100 L74 84Z" fill="${skin.shade}"/>`;
  // Col / écharpe.
  if (spec.acc === "scarf") b += `<path d="M42 98 Q64 112 86 98 L88 106 Q64 122 40 106Z" fill="#f1e3c4"/><path d="M70 108 L76 128 L66 128 L64 110Z" fill="#e0cfa6"/>`;
  else b += `<path d="M48 97 Q64 110 80 97 L76 95 Q64 104 52 95Z" fill="#f6f0df"/>`;
  // Sangle de sacoche.
  b += `<path d="M40 100 L78 132" stroke="#8f5d3b" stroke-width="6"/><path d="M40 100 L78 132" stroke="#c48a55" stroke-width="1.6"/>`;
  // Oreilles et tête.
  b += `<ellipse cx="${HX - HRX + 1}" cy="${HY + 4}" rx="5" ry="7" fill="${skin.shade}"/><ellipse cx="${HX + HRX - 1}" cy="${HY + 4}" rx="5" ry="7" fill="${skin.shade}"/>`;
  b += `<ellipse cx="${HX}" cy="${HY}" rx="${HRX}" ry="${HRY}" fill="${face}"/>`;
  // Visage : yeux (point + reflet), sourcils, joues, nez, sourire.
  for (const x of [HX - 11, HX + 11]) {
    b += `<ellipse cx="${x}" cy="${HY + 4}" rx="3.8" ry="4.8" fill="#2a2233"/><circle cx="${x - 1.3}" cy="${HY + 2.2}" r="1.5" fill="#fff"/>`;
  }
  b += `<path d="M${HX - 16} ${HY - 5} Q${HX - 11} ${HY - 8} ${HX - 6} ${HY - 5.5} M${HX + 6} ${HY - 5.5} Q${HX + 11} ${HY - 8} ${HX + 16} ${HY - 5}" fill="none" stroke="${hair.shade}" stroke-width="2" stroke-linecap="round"/>`;
  b += `<ellipse cx="${HX - 18}" cy="${HY + 13}" rx="5" ry="3" fill="#ef8f7c" opacity=".45"/><ellipse cx="${HX + 18}" cy="${HY + 13}" rx="5" ry="3" fill="#ef8f7c" opacity=".45"/>`;
  b += `<path d="M${HX - 1.5} ${HY + 10} Q${HX} ${HY + 12} ${HX + 1.5} ${HY + 10}" fill="none" stroke="${skin.shade}" stroke-width="1.6" stroke-linecap="round"/>`;
  b += `<path d="M${HX - 6} ${HY + 17} Q${HX} ${HY + 22} ${HX + 6} ${HY + 17}" fill="none" stroke="#9c4a3c" stroke-width="2.2" stroke-linecap="round"/>`;
  b += hairFront(spec.style, hair, d);
  if (spec.acc === "headband") b += `<path d="M${HX - HRX} ${HY - 14} Q${HX} ${HY - 30} ${HX + HRX} ${HY - 14}" fill="none" stroke="#c8553f" stroke-width="5" stroke-linecap="round"/>`;
  if (spec.acc === "clip") b += `<path d="M${HX + 16} ${HY - 22} l4 -6 l4 6 l-4 3Z" fill="#e0ae45"/>`;
  if (spec.acc === "glasses") b += `<g fill="none" stroke="#5a3a2a" stroke-width="2"><circle cx="${HX - 11}" cy="${HY + 4}" r="7.5"/><circle cx="${HX + 11}" cy="${HY + 4}" r="7.5"/><path d="M${HX - 3.5} ${HY + 3} Q${HX} ${HY + 1} ${HX + 3.5} ${HY + 3}"/></g>`;
  b += `</g>`;
  return svg({ w: 128, h: 128, body: b, d });
}
