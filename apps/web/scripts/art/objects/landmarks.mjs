// Lieux du campement (docs/ART_BIBLE.md §1) : tente, feu de camp, tableau de quêtes,
// échoppe, observatoire, fanion d'objectif, arche de collection, lanterne.
// Trois-quarts plongeant, lumière en haut à gauche, aucun texte.
import { defs, svg, fmt as f } from "../lib/core.mjs";
import { wood, woodDark, stone, gold, cloth, paper, lantern, shadowCool, iron, foliage } from "../lib/palette.mjs";
import { coinFace } from "./coin.mjs";

const shadowEllipse = (cx, cy, rx, ry, o = 0.24) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shadowCool}" fill-opacity="${o}"/>`;

function sparkle(x, y, s, color = "#fffbe8") {
  const k = s * 0.18;
  return `<path d="M${f(x)} ${f(y - s)} Q${f(x + k)} ${f(y - k)} ${f(x + s)} ${f(y)} Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + s)} Q${f(x - k)} ${f(y + k)} ${f(x - s)} ${f(y)} Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - s)}Z" fill="${color}"/>`;
}

/** Fanion triangulaire à bord ondulé (vermillon par défaut). Groupe animable `.flag-cloth`. */
export function pennant(d, x, y, w, h, c = cloth.vermilion) {
  const g = d.linear([[0, c.light], [1, c.base]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  return `<g class="flag-cloth" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y} Q${f(x + w * 0.5)} ${f(y - h * 0.12)} ${f(x + w)} ${f(y + h * 0.42)} Q${f(x + w * 0.52)} ${f(y + h * 0.6)} ${x} ${f(y + h)} Z" fill="${g}"/><path d="M${x} ${f(y + h)} Q${f(x + w * 0.52)} ${f(y + h * 0.6)} ${f(x + w)} ${f(y + h * 0.42)} Q${f(x + w * 0.6)} ${f(y + h * 0.66)} ${x} ${f(y + h)}Z" fill="${c.shade}" fill-opacity=".7"/></g>`;
}

export function tent() {
  const d = defs("tent");
  const front = d.linear([[0, cloth.cream.light], [1, cloth.cream.base]], { x1: 0, y1: 0, x2: 0.6, y2: 1 });
  const roof = d.linear([[0, cloth.cream.base], [1, cloth.cream.shade]], { x1: 0, y1: 0, x2: 1, y2: 0.4 });
  const opening = d.linear([[0, "#3a2a22"], [1, "#1d140f"]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  let b = shadowEllipse(118, 172, 104, 12);
  // Cordages et piquets.
  b += `<path d="M20 170 L6 180 M196 158 L214 170 M80 34 L4 150" stroke="#8d7a5c" stroke-width="1.2" fill="none"/>`;
  // Pan de toit droit (ombre).
  b += `<path d="M84 34 L168 16 L210 150 L128 172 Z" fill="${roof}"/>`;
  b += `<path d="M84 34 L168 16" stroke="${cloth.cream.light}" stroke-width="3" stroke-linecap="round"/>`;
  b += `<path d="M128 172 L210 150 L210 142 L126 164 Z" fill="${cloth.vermilion.shade}"/>`;
  b += `<path d="M110 60 L186 44 M118 96 L196 80" stroke="${cloth.cream.shade}" stroke-width="1.2" opacity=".8"/>`;
  // Face avant (triangle d'entrée).
  b += `<path d="M84 34 L20 172 L128 172 Z" fill="${front}"/>`;
  b += `<path d="M84 34 L20 172" stroke="#fffaf0" stroke-width="2.2" stroke-opacity=".9"/>`;
  b += `<path d="M20 172 L128 172 L127 163 L24 163 Z" fill="${cloth.vermilion.base}"/>`;
  // Ouverture avec rabats relevés.
  b += `<path d="M78 70 L52 170 L104 170 Z" fill="${opening}"/>`;
  b += `<path d="M78 70 L52 170 L64 170 Q66 128 76 92 Z" fill="${cloth.cream.light}"/>`;
  b += `<path d="M78 70 L104 170 L96 170 Q90 126 80 92 Z" fill="${cloth.cream.shade}"/>`;
  b += `<path d="M62 124 L74 121 M88 121 L99 124" stroke="${wood.base}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  // Mât et fanion.
  b += `<path d="M84 34 L84 8" stroke="${wood.base}" stroke-width="3.2" stroke-linecap="round"/>`;
  b += pennant(d, 85, 8, 30, 18);
  return svg({ w: 220, h: 190, body: b, d });
}

export function campfire() {
  const d = defs("campfire");
  const glow = d.radial([[0, "#ffd98a", 0.75], [0.5, "#ffb866", 0.28], [1, "#ffb866", 0]]);
  const outer = d.linear([[0, cloth.vermilion.light], [1, cloth.vermilion.base]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const mid = d.linear([[0, "#ffd166"], [1, "#f29a3a"]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  let b = `<ellipse cx="70" cy="96" rx="68" ry="26" fill="${glow}"/>`;
  // Bûches croisées.
  b += `<path d="M34 104 L104 86" stroke="${wood.shade}" stroke-width="11" stroke-linecap="round"/><path d="M34 102 L104 84" stroke="${wood.light}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  b += `<path d="M38 86 L104 106" stroke="${wood.base}" stroke-width="11" stroke-linecap="round"/><path d="M38 83.5 L104 103.5" stroke="${wood.light}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  b += `<circle cx="104" cy="106" r="5" fill="#d9a877"/><circle cx="104" cy="86" r="5" fill="#caa072"/>`;
  // Flammes (groupe animable).
  b += `<g class="fire-flames" style="transform-origin:70px 96px">`;
  b += `<path d="M70 18 C82 40 96 56 92 78 C90 94 80 100 70 100 C58 100 48 92 48 78 C48 62 60 58 62 44 C68 52 70 56 72 62 C76 50 74 34 70 18Z" fill="${outer}"/>`;
  b += `<path d="M70 44 C78 58 86 66 84 80 C82 92 76 96 70 96 C62 96 56 90 56 80 C56 70 64 66 66 58 C68 64 70 66 71 70 C74 62 73 54 70 44Z" fill="${mid}"/>`;
  b += `<path d="M70 66 C74 74 78 80 76 88 C74 94 72 95 70 95 C66 95 63 92 64 86 C64 80 68 78 70 66Z" fill="#fff4d0"/>`;
  b += `</g>`;
  // Cercle de pierres (devant).
  const stones = [[24, 104, 10], [40, 114, 11], [60, 119, 11], [82, 118, 11], [102, 112, 10], [116, 102, 9]];
  for (const [x, y, r] of stones) b += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="${stone.base}"/><ellipse cx="${x - r * 0.25}" cy="${y - r * 0.25}" rx="${r * 0.6}" ry="${r * 0.35}" fill="${stone.light}"/>`;
  b += sparkle(46, 30, 2.4, "#ffe7a8") + sparkle(96, 22, 2, "#ffe7a8");
  return svg({ w: 140, h: 130, body: b, d });
}

export function questBoard() {
  const d = defs("questboard");
  const panel = d.linear([[0, wood.light], [0.6, wood.base], [1, wood.shade]], { x1: 0, y1: 0, x2: 0.3, y2: 1 });
  const roofTop = d.linear([[0, "#4f6f8f"], [1, cloth.indigo.base]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  let b = shadowEllipse(104, 222, 84, 9);
  // Poteaux.
  for (const x of [34, 164]) {
    b += `<rect x="${x}" y="56" width="12" height="166" fill="${wood.base}"/><rect x="${x}" y="56" width="3" height="166" fill="${wood.light}"/><rect x="${x + 12}" y="52" width="6" height="170" fill="${wood.shade}"/>`;
  }
  // Toit à petit débord relevé (tuiles indigo).
  b += `<path d="M14 64 Q26 58 34 44 L104 26 L176 44 Q184 58 198 64 Q180 64 172 58 L104 42 L40 58 Q30 64 14 64Z" fill="${cloth.indigo.shade}"/>`;
  b += `<path d="M28 50 L104 22 L184 50 L176 44 L104 30 L36 46Z" fill="${roofTop}"/>`;
  b += `<path d="M22 58 Q30 54 36 46 L104 30 L176 46 Q182 54 192 58" fill="none" stroke="#7fa0c0" stroke-width="2.2" stroke-linecap="round"/>`;
  b += `<circle cx="104" cy="24" r="4" fill="${gold.base}"/>`;
  // Panneau.
  b += `<rect x="40" y="70" width="128" height="104" rx="3" fill="${panel}"/>`;
  b += `<rect x="168" y="68" width="7" height="106" fill="${wood.shade}"/>`;
  for (const y of [96, 122, 148]) b += `<path d="M42 ${y} L166 ${y}" stroke="${wood.deep}" stroke-opacity=".35" stroke-width="1.2"/>`;
  b += `<rect x="40" y="70" width="128" height="104" rx="3" fill="none" stroke="${wood.deep}" stroke-opacity=".45" stroke-width="3"/>`;
  // Fiches de quêtes (vides) épinglées.
  const notes = [
    [52, 80, 42, 50, -4],
    [102, 78, 38, 44, 3],
    [66, 124, 36, 40, 2],
    [112, 122, 44, 42, -3],
  ];
  for (const [x, y, w, h, rot] of notes) {
    b += `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x + 2}" y="${y + 3}" width="${w}" height="${h}" fill="#3b2a1d" fill-opacity=".25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${paper.light}"/><path d="M${x} ${y + h} L${x + w} ${y + h} L${x + w} ${y + h - 8} Q${x + w - 4} ${y + h - 2} ${x + w - 9} ${y + h}Z" fill="${paper.shade}"/>`;
    b += `<path d="M${x + 6} ${y + 14} h${w - 14} M${x + 6} ${y + 22} h${w - 20} M${x + 6} ${y + 30} h${w - 16}" stroke="${paper.shade}" stroke-width="2.2" stroke-linecap="round"/>`;
    b += `<circle cx="${x + w / 2}" cy="${y + 4}" r="3.2" fill="${cloth.vermilion.base}"/><circle cx="${x + w / 2 - 1}" cy="${y + 3}" r="1.1" fill="#fff" fill-opacity=".7"/></g>`;
  }
  // Petite pièce clouée en haut : c'est ici qu'on gagne.
  b += `<g transform="translate(92 60) scale(.36)">${coinFace(d, { detail: "small" })}</g>`;
  return svg({ w: 210, h: 232, body: b, d });
}

export function shopStall() {
  const d = defs("stall");
  const counterFront = d.linear([[0, wood.light], [1, wood.shade]], { x1: 0, y1: 0, x2: 0.2, y2: 1 });
  const counterTop = d.linear([[0, "#d9a26b"], [1, wood.light]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const awning = d.linear([[0, cloth.cream.light], [1, cloth.cream.base]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  let b = shadowEllipse(122, 212, 104, 10);
  // Poteaux arrière et étagère.
  for (const x of [44, 186]) b += `<rect x="${x}" y="54" width="8" height="112" fill="${wood.shade}"/>`;
  b += `<rect x="50" y="98" width="138" height="6" fill="${wood.base}"/><rect x="50" y="98" width="138" height="2" fill="${wood.light}"/>`;
  // Objets sur l'étagère : bocal, coffret-cadeau, livre, pot.
  b += `<rect x="60" y="78" width="16" height="20" rx="4" fill="#a7d0d6" fill-opacity=".85"/><rect x="62" y="74" width="12" height="5" rx="1.5" fill="${wood.base}"/><circle cx="68" cy="89" r="4" fill="${cloth.vermilion.light}"/>`;
  b += `<rect x="86" y="80" width="22" height="18" fill="${cloth.indigo.light}"/><rect x="95" y="80" width="4" height="18" fill="${gold.light}"/><path d="M92 80 q5 -8 5 0 q0 -8 5 0" fill="none" stroke="${gold.light}" stroke-width="2.4"/>`;
  b += `<rect x="116" y="82" width="8" height="16" fill="${cloth.teal.base}"/><rect x="124" y="84" width="7" height="14" fill="${cloth.vermilion.base}"/><rect x="131" y="80" width="8" height="18" fill="${gold.base}"/>`;
  b += `<path d="M150 98 q-2 -14 8 -16 q10 2 8 16Z" fill="#c9895a"/><path d="M152 84 q6 -3 12 0" stroke="#e8b98a" stroke-width="2" fill="none"/>`;
  b += `<rect x="172" y="84" width="12" height="14" rx="2" fill="${paper.light}"/><path d="M172 88 h12" stroke="${cloth.vermilion.base}" stroke-width="2"/>`;
  // Comptoir.
  b += `<path d="M24 132 L196 132 L222 118 L50 118 Z" fill="${counterTop}"/>`;
  b += `<rect x="24" y="132" width="172" height="72" fill="${counterFront}"/>`;
  b += `<path d="M196 132 L222 118 L222 190 L196 204 Z" fill="${wood.deep}"/>`;
  for (const x of [66, 110, 154]) b += `<path d="M${x} 134 L${x} 204" stroke="${wood.deep}" stroke-opacity=".4" stroke-width="1.4"/>`;
  b += `<rect x="24" y="132" width="172" height="3" fill="${wood.light}"/>`;
  // Présentoir de pièces sur le comptoir.
  b += `<g transform="translate(40 108) scale(.34)">${coinFace(d, { detail: "small" })}</g><g transform="translate(52 112) scale(.3)">${coinFace(d, { detail: "small" })}</g>`;
  // Poteaux avant.
  for (const x of [24, 188]) b += `<rect x="${x}" y="40" width="9" height="92" fill="${wood.base}"/><rect x="${x}" y="40" width="2.5" height="92" fill="${wood.light}"/>`;
  // Auvent festonné : toile inclinée vers l'avant, coutures dans le sens de la pente.
  const canopy = d.linear([[0, cloth.cream.light], [1, cloth.cream.base]], { x1: 0, y1: 0, x2: 0.2, y2: 1 });
  b += `<path d="M10 58 L232 58 L252 32 L34 32 Z" fill="${canopy}"/>`;
  b += `<path d="M232 58 L252 32 L252 40 L232 64 Z" fill="${cloth.cream.shade}"/>`;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    b += `<path d="M${f(10 + 222 * t)} 58 L${f(34 + 218 * t)} 32" stroke="${cloth.cream.shade}" stroke-width="1.3"/>`;
  }
  b += `<path d="M34 32 L252 32" stroke="#fffaf0" stroke-width="2" stroke-linecap="round"/>`;
  let scallop = "M10 58";
  for (let i = 0; i < 8; i++) scallop += ` q${f(13.9)} 16 ${f(27.75)} 0`;
  b += `<path d="${scallop} L232 54 L10 54Z" fill="${cloth.vermilion.base}"/>`;
  b += `<path d="M10 55 L232 55" stroke="${cloth.vermilion.light}" stroke-width="2"/>`;
  // Rideaux courts façon noren (indigo, sans motif).
  for (const x of [60, 102, 144]) b += `<path d="M${x} 62 h36 v18 q-9 4 -18 0 q-9 4 -18 0Z" fill="${cloth.indigo.base}" opacity=".9"/>`;
  // Lanterne suspendue.
  b += `<path d="M206 60 v10" stroke="${wood.deep}" stroke-width="1.5"/><ellipse cx="206" cy="80" rx="9" ry="11" fill="${lantern.light}"/><ellipse cx="206" cy="80" rx="9" ry="11" fill="none" stroke="${lantern.base}" stroke-width="1"/><path d="M198 80 h16 M199 74 h14 M199 86 h14" stroke="${lantern.base}" stroke-width=".8" opacity=".7"/>`;
  return svg({ w: 256, h: 222, body: b, d });
}

export function observatory() {
  const d = defs("observatory");
  const tower = d.linear([[0, stone.light], [0.55, stone.base], [1, stone.shade]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const dome = d.radial([[0, "#7fb3ad"], [0.6, cloth.teal.base], [1, cloth.teal.shade]], { cx: 0.3, cy: 0.3, r: 0.9 });
  let b = shadowEllipse(92, 268, 70, 9);
  // Tour cylindrique.
  b += `<path d="M36 120 L36 262 Q92 276 148 262 L148 120 Z" fill="${tower}"/>`;
  for (const y of [150, 182, 214, 244]) b += `<path d="M36 ${y} Q92 ${y + 12} 148 ${y}" fill="none" stroke="${stone.deep}" stroke-opacity=".35" stroke-width="1.2"/>`;
  b += `<path d="M62 138 l0 20 M114 172 l0 20 M78 204 l0 20 M126 236 l0 18" stroke="${stone.deep}" stroke-opacity=".3" stroke-width="1.2"/>`;
  // Porte et fenêtre éclairée.
  b += `<path d="M76 266 L76 226 Q92 212 108 226 L108 268 Q92 270 76 266Z" fill="${woodDark.base}"/><path d="M92 214 L92 268" stroke="${woodDark.shade}" stroke-width="1.4"/><circle cx="102" cy="246" r="2" fill="${gold.base}"/>`;
  b += `<path d="M104 150 L104 136 Q112 128 120 136 L120 150Z" fill="${lantern.light}"/><path d="M112 130 L112 150 M104 142 h16" stroke="${woodDark.base}" stroke-width="1.6"/>`;
  // Balcon.
  b += `<path d="M26 118 Q92 134 158 118 L158 126 Q92 142 26 126Z" fill="${wood.base}"/><path d="M26 118 Q92 134 158 118" fill="none" stroke="${wood.light}" stroke-width="2"/>`;
  for (let i = 0; i < 9; i++) {
    const x = 32 + i * 15.5;
    b += `<path d="M${x} ${110 + Math.abs(4 - i) * 0.8} l0 ${14}" stroke="${wood.shade}" stroke-width="2"/>`;
  }
  b += `<path d="M26 108 Q92 124 158 108" fill="none" stroke="${wood.light}" stroke-width="2.6"/>`;
  // Dôme et fente.
  b += `<path d="M44 112 Q44 50 92 44 Q140 50 140 112 Q92 124 44 112Z" fill="${dome}"/>`;
  b += `<path d="M58 70 Q76 52 96 50" fill="none" stroke="#b7ddd6" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>`;
  b += `<path d="M96 46 L110 48 L116 114 L102 116Z" fill="${cloth.teal.shade}"/>`;
  b += `<path d="M44 112 Q92 124 140 112" fill="none" stroke="${gold.base}" stroke-width="3"/>`;
  // Lunette en laiton pointée vers le ciel.
  const brass = d.linear([[0, gold.light], [1, gold.shade]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  b += `<g transform="rotate(-38 106 70)"><rect x="96" y="62" width="62" height="13" rx="4" fill="${brass}"/><rect x="152" y="59" width="10" height="19" rx="3" fill="${gold.base}"/><rect x="100" y="64" width="50" height="3" fill="${gold.hi}" opacity=".7"/></g>`;
  b += `<circle cx="92" cy="40" r="4" fill="${gold.base}"/>`;
  b += sparkle(168, 22, 5) + sparkle(150, 8, 3);
  return svg({ w: 184, h: 280, body: b, d });
}

export function goalFlag() {
  const d = defs("goalflag");
  let b = shadowEllipse(46, 150, 34, 6);
  // Cairn de pierres.
  const rocks = [[30, 142, 16, 10], [58, 142, 15, 10], [44, 130, 14, 9], [40, 120, 9, 6]];
  for (const [x, y, rx, ry] of rocks) b += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${stone.base}"/><ellipse cx="${x - rx * 0.25}" cy="${y - ry * 0.3}" rx="${rx * 0.6}" ry="${ry * 0.45}" fill="${stone.light}"/>`;
  b += `<ellipse cx="44" cy="126" rx="6" ry="2.4" fill="${stone.moss}"/>`;
  // Mât et grand fanion.
  b += `<path d="M44 124 L44 14" stroke="${wood.shade}" stroke-width="4" stroke-linecap="round"/><path d="M42.5 124 L42.5 14" stroke="${wood.light}" stroke-width="1.2"/>`;
  b += `<circle cx="44" cy="12" r="4.5" fill="${gold.base}"/><circle cx="43" cy="11" r="1.6" fill="${gold.hi}"/>`;
  b += pennant(d, 46, 18, 50, 34);
  return svg({ w: 110, h: 160, body: b, d });
}

export function collectionArch() {
  const d = defs("arch");
  const inner = d.radial([[0, "#fff1c9"], [0.3, "#e9c77f"], [0.62, "#35577a"], [1, "#172941"]], { cx: 0.5, cy: 0.45, r: 0.72 });
  const archStone = d.linear([[0, stone.light], [0.6, stone.base], [1, stone.shade]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let b = shadowEllipse(96, 238, 84, 9);
  // Intérieur lumineux du portail.
  b += `<path d="M48 234 L48 118 Q48 62 96 60 Q144 62 144 118 L144 234 Z" fill="${inner}"/>`;
  // Cartes flottantes (vides) dans le portail.
  const card = (x, y, rot, glowColor) =>
    `<g transform="rotate(${rot} ${x + 13} ${y + 18})"><rect x="${x - 3}" y="${y - 3}" width="32" height="42" rx="5" fill="${glowColor}" fill-opacity=".35"/><rect x="${x}" y="${y}" width="26" height="36" rx="3" fill="${gold.base}"/><rect x="${x + 3}" y="${y + 3}" width="20" height="30" rx="2" fill="#2e4a6b"/><path d="M${x + 13} ${y + 9} l5 9 l-5 9 l-5 -9Z" fill="${gold.light}" fill-opacity=".8"/></g>`;
  b += `<g class="arch-cards">${card(62, 128, -10, "#9fd0ff")}${card(104, 110, 8, "#f6d77a")}${card(84, 166, -3, "#9fe0c8")}</g>`;
  b += sparkle(70, 102, 3) + sparkle(126, 160, 3.5) + sparkle(98, 88, 2.4);
  // Arche de pierre (voussoirs).
  b += `<path d="M28 236 L28 118 Q28 42 96 38 Q164 42 164 118 L164 236 L144 236 L144 118 Q144 62 96 60 Q48 62 48 118 L48 236 Z" fill="${archStone}"/>`;
  const vous = 11;
  for (let i = 0; i <= vous; i++) {
    const a = Math.PI + (Math.PI * i) / vous;
    const x1 = 96 + Math.cos(a) * 48, y1 = 118 + Math.sin(a) * 58;
    const x2 = 96 + Math.cos(a) * 68, y2 = 118 + Math.sin(a) * 78;
    b += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${stone.deep}" stroke-opacity=".45" stroke-width="1.4"/>`;
  }
  for (const y of [150, 180, 210]) b += `<path d="M28 ${y} h20 M144 ${y} h20" stroke="${stone.deep}" stroke-opacity=".4" stroke-width="1.4"/>`;
  b += `<path d="M164 118 L178 108 L178 226 L164 236Z" fill="${stone.deep}"/>`;
  // Clé de voûte dorée + mousse.
  b += `<path d="M86 36 L106 36 L102 58 L90 58Z" fill="${gold.base}"/><path d="M88 38 L96 38 L94 56 L91 56Z" fill="${gold.hi}" opacity=".6"/>`;
  b += `<path d="M30 70 q10 -16 26 -24 q-6 12 -18 24Z M140 48 q16 6 22 22 q-12 -4 -22 -22Z" fill="${stone.moss}"/>`;
  b += `<path d="M26 236 q6 -12 16 -4 q4 -10 12 0 M140 236 q6 -10 14 -2 q6 -8 12 2" fill="${foliage.near.base}"/>`;
  return svg({ w: 190, h: 248, body: b, d });
}

export function lanternPost() {
  const d = defs("lanternpost");
  const glow = d.radial([[0, lantern.glow, 0.7], [1, lantern.glow, 0]]);
  let b = shadowEllipse(30, 150, 18, 4);
  b += `<circle cx="42" cy="44" r="32" fill="${glow}" class="lantern-glow"/>`;
  b += `<rect x="16" y="20" width="6" height="130" fill="${wood.base}"/><rect x="16" y="20" width="2" height="130" fill="${wood.light}"/>`;
  b += `<path d="M16 24 L46 24" stroke="${wood.base}" stroke-width="4"/><path d="M42 26 v6" stroke="${iron.shade}" stroke-width="1.4"/>`;
  b += `<ellipse cx="42" cy="46" rx="11" ry="14" fill="${lantern.light}"/><ellipse cx="40" cy="42" rx="5" ry="7" fill="${lantern.core}"/>`;
  b += `<path d="M31 46 h22 M32 38 h20 M32 54 h20" stroke="${lantern.base}" stroke-width=".9" opacity=".8"/><rect x="36" y="31" width="12" height="3" rx="1" fill="${woodDark.base}"/><rect x="36" y="58" width="12" height="3" rx="1" fill="${woodDark.base}"/>`;
  return svg({ w: 80, h: 156, body: b, d });
}
