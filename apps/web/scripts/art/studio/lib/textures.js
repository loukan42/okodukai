// Textures procédurales générées dans le navigateur (canvas), pour les matières PBR :
// métal martelé, bois de planches, pierre. Toutes seedées, donc reproductibles.
import * as THREE from "three";
import { makeNoise } from "./noise.js";

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

/** Carte de hauteur (Float32 0..1) -> carte de normales (tangent space). */
export function heightToNormal(height, size, strength = 2) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function grayTexture(values, size, { colorSpace } = {}) {
  const c = canvas(size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, values[i] * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (colorSpace) t.colorSpace = colorSpace;
  return t;
}

/** Métal martelé et patiné : normales douces + rugosité variable (creux plus mats). */
export function hammeredMetal({ size = 512, seed = 3, dents = 18, scratches = 40 } = {}) {
  const n = makeNoise(seed);
  const h = new Float32Array(size * size);
  const r = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const dent = n.fbm(u * dents, v * dents, 3) * 0.6;
      const fine = n.fbm(u * 90, v * 90, 2) * 0.12;
      h[y * size + x] = 0.5 + dent + fine;
      r[y * size + x] = 0.26 + (0.5 - (0.5 + dent)) * 0.25 + n.fbm(u * 30, v * 30, 3) * 0.12;
    }
  }
  for (let k = 0; k < scratches; k++) {
    let x = n.rand() * size, y = n.rand() * size;
    const a = n.rand() * Math.PI * 2;
    const len = 20 + n.rand() * 80;
    for (let s = 0; s < len; s++) {
      const xi = Math.floor(x + Math.cos(a) * s) & (size - 1);
      const yi = Math.floor(y + Math.sin(a) * s) & (size - 1);
      h[yi * size + xi] -= 0.08;
      r[yi * size + xi] += 0.12;
    }
  }
  return { normal: heightToNormal(h, size, 3), roughness: grayTexture(r, size) };
}

/**
 * Planches de bois : couleur, normales (rainures + fil du bois), rugosité.
 * Les planches courent selon l'axe U de la texture.
 */
export function woodPlanks({ size = 1024, planks = 4, seed = 7, light = [196, 138, 85], dark = [99, 64, 42] } = {}) {
  const n = makeNoise(seed);
  const c = canvas(size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  const r = new Float32Array(size * size);
  const plankH = size / planks;
  const offsets = Array.from({ length: planks }, () => n.rand() * 100);
  const tones = Array.from({ length: planks }, () => 0.85 + n.rand() * 0.3);
  for (let y = 0; y < size; y++) {
    const p = Math.floor(y / plankH);
    const inPlank = (y % plankH) / plankH;
    const groove = Math.min(inPlank, 1 - inPlank) < 0.018 ? 1 : 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const warp = n.fbm(u * 2 + offsets[p], v * 6, 3) * 3;
      const grain = Math.sin((v * size * 0.22 + warp * 18 + offsets[p]) * 0.9) * 0.5 + 0.5;
      const fibers = n.fbm(u * 60 + offsets[p], v * 400, 2);
      let t = 0.35 + grain * 0.35 + fibers * 0.4;
      t = Math.max(0, Math.min(1, t * tones[p]));
      const i = (y * size + x) * 4;
      const shade = groove ? 0.35 : 1;
      img.data[i] = (dark[0] + (light[0] - dark[0]) * t) * shade;
      img.data[i + 1] = (dark[1] + (light[1] - dark[1]) * t) * shade;
      img.data[i + 2] = (dark[2] + (light[2] - dark[2]) * t) * shade;
      img.data[i + 3] = 255;
      h[y * size + x] = groove ? 0 : 0.6 + fibers * 0.25 + grain * 0.08;
      r[y * size + x] = groove ? 0.95 : 0.62 + fibers * 0.25;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, normal: heightToNormal(h, size, 4), roughness: grayTexture(r, size) };
}

/** Pierre : taches et fissures fines, pour les socles et les arches. */
export function stoneSurface({ size = 512, seed = 11, base = [178, 168, 147] } = {}) {
  const n = makeNoise(seed);
  const c = canvas(size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const f = n.fbm(u * 8, v * 8, 5);
      const crack = Math.abs(n.fbm(u * 5 + 10, v * 5, 4)) < 0.012 ? 1 : 0;
      const k = 0.85 + f * 0.35 - crack * 0.35;
      const i = (y * size + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
      h[y * size + x] = 0.5 + f * 0.5 - crack * 0.4;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, normal: heightToNormal(h, size, 3) };
}


/**
 * Gravure « seigaiha » (vagues concentriques, touche japonaise discrète) dans la
 * couronne d'une face de pièce. Espace de forme : [-1, 1]² -> texture 0..1.
 */
export function engravedCoinFace({ size = 1024, inner = 0.63, outer = 0.84, cells = 26, seed = 2 } = {}) {
  const n = makeNoise(seed);
  const h = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / size) * 2 - 1;
      const y = (py / size) * 2 - 1;
      const r = Math.hypot(x, y);
      let v = 0.55 + n.fbm(px / 40, py / 40, 3) * 0.08;
      let ro = 0.24 + n.fbm(px / 25, py / 25, 3) * 0.1;
      if (r > inner && r < outer) {
        const theta = Math.atan2(y, x) / (Math.PI * 2) + 0.5;
        const rows = 2;
        const rv = ((r - inner) / (outer - inner)) * rows;
        const row = Math.floor(rv);
        const cu = theta * cells + (row % 2 ? 0.5 : 0);
        const fu = cu - Math.floor(cu) - 0.5;
        const fv = rv - row;
        const d = Math.hypot(fu, fv) * 2;
        if (d < 1) {
          const ringPos = (d * 3.2) % 1;
          if (Math.abs(ringPos - 0.5) < 0.16) {
            v -= 0.32;
            ro += 0.3;
          }
        }
      }
      h[py * size + px] = v;
      rough[py * size + px] = ro;
    }
  }
  const normal = heightToNormal(h, size, 5);
  const roughness = grayTexture(rough, size);
  for (const t of [normal, roughness]) {
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(0.5, 0.5);
    t.offset.set(0.5, 0.5);
  }
  return { normal, roughness };
}
