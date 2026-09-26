// Coffre Okodukai (Mon coffre) en 3D : planches de bois, bandes et coins d'or,
// serrure frappée de la pièce Okodukai, couvercle bombé. Le cadrage est identique
// pour tous les états, pour que l'interface puisse passer de l'un à l'autre.
// États : closed | empty | low | full | almost | reached.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, goldMaterial } from "../lib/stage.js";
import { woodPlanks, hammeredMetal } from "../lib/textures.js";
import { scatterCoins } from "../lib/coins.js";
import { buildCoin, coinMaterials } from "./coin.js";

const W = 2.0, D = 1.3, H = 0.95, FEET = 0.09, T = 0.09;
const TOP = FEET + H;
const R = D / 2, SHELL = 0.08;

const HEAPS = {
  low: { base: 0.36, peak: 0.12, count: 70, seed: 11 },
  full: { base: 0.72, peak: 0.34, count: 190, seed: 7 },
  almost: { base: 0.9, peak: 0.42, count: 250, seed: 5 },
  reached: { base: 0.98, peak: 0.55, count: 320, seed: 9 },
};

function box(w, h, d, r, material, pos) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  m.position.set(...pos);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Demi-disque plein (flancs du couvercle bombé). */
function halfDisc(r, thickness, material) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 64 });
  g.rotateY(Math.PI / 2);
  g.translate(-thickness / 2, 0, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Demi-couronne extrudée le long de X (couvercle, bandes du couvercle). */
function halfRing(inner, outer, length, material, { bevel = 0.02, uv } = {}) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, 0, Math.PI, false);
  s.lineTo(-inner, 0);
  s.absarc(0, 0, inner, Math.PI, 0, true);
  s.closePath();
  const depth = Math.max(0.001, length - bevel * 2);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 64, ...(uv ? { UVGenerator: uv(depth) } : {}) });
  g.rotateY(Math.PI / 2);
  g.translate(-depth / 2, 0, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// UV du couvercle : U le long du coffre, V autour de l'arrondi (les planches suivent la longueur).
const lidUV = (len) => ({
  generateTopUV: (geo, v, a, b, c) => [a, b, c].map((i) => new THREE.Vector2(v[i * 3] * 0.5 + 0.5, v[i * 3 + 1] * 0.5 + 0.5)),
  generateSideWallUV: (geo, v, a, b, c, d) =>
    [a, b, c, d].map((i) => new THREE.Vector2(v[i * 3 + 2] / len, Math.atan2(Math.max(v[i * 3 + 1], 0), v[i * 3]) / Math.PI)),
});

function rivet(material, pos, normal = new THREE.Vector3(0, 0, 1), r = 0.03) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), material);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  m.position.set(...pos);
  m.castShadow = true;
  return m;
}

function materials() {
  const planks = woodPlanks({ size: 1024, planks: 4, seed: 7, light: [180, 106, 60], dark: [82, 40, 22] });
  const wood = new THREE.MeshStandardMaterial({ map: planks.map, normalMap: planks.normal, roughnessMap: planks.roughness, normalScale: new THREE.Vector2(0.7, 0.7) });
  const lidTex = [planks.map, planks.normal, planks.roughness].map((t) => {
    const c = t.clone();
    c.repeat.set(1, 2);
    c.needsUpdate = true;
    return c;
  });
  const lidWood = new THREE.MeshStandardMaterial({ map: lidTex[0], normalMap: lidTex[1], roughnessMap: lidTex[2], normalScale: new THREE.Vector2(0.7, 0.7) });
  const inner = new THREE.MeshStandardMaterial({ map: planks.map, normalMap: planks.normal, roughnessMap: planks.roughness, color: 0x6b4a3a, side: THREE.BackSide });
  const lidInner = new THREE.MeshStandardMaterial({ map: lidTex[0], normalMap: lidTex[1], roughnessMap: lidTex[2], color: 0x7a5646 });
  const ham = hammeredMetal({ size: 512, seed: 4, dents: 14, scratches: 24 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  const goldDeep = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness, tint: 0xc98a36 });
  const heapHam = hammeredMetal({ size: 512, seed: 9, dents: 36, scratches: 0 });
  heapHam.normal.repeat.set(3, 3);
  // Le fond du tas reste sombre : il se lit comme les creux entre les pièces.
  const heap = new THREE.MeshStandardMaterial({ color: 0x6e4418, metalness: 0.6, roughness: 0.7, normalMap: heapHam.normal, normalScale: new THREE.Vector2(1, 1) });
  const coins = new THREE.MeshPhysicalMaterial({ color: 0xf0b848, metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.2 });
  return { wood, lidWood, inner, lidInner, gold, goldDeep, heap, coins };
}

function heapY(x, z, { base, peak }) {
  const ux = x / 0.95, uz = z / 0.6;
  const k = Math.max(0, 1 - ux * ux) ** 0.7 * Math.max(0, 1 - uz * uz) ** 0.7;
  return FEET + T + base * (H - T) + peak * k;
}

function coinHeap(spec, m) {
  const group = new THREE.Group();
  const iw = W / 2 - T - 0.01, id = D / 2 - T - 0.01;
  const surf = new THREE.PlaneGeometry(iw * 2, id * 2, 48, 30);
  surf.rotateX(-Math.PI / 2);
  const p = surf.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heapY(p.getX(i), p.getZ(i), spec) - 0.03);
  surf.computeVertexNormals();
  const surface = new THREE.Mesh(surf, m.heap);
  surface.receiveShadow = true;
  group.add(surface);
  const normalAt = (x, z) => {
    const e = 0.02;
    return new THREE.Vector3(heapY(x - e, z, spec) - heapY(x + e, z, spec), 2 * e, heapY(x, z - e, spec) - heapY(x, z + e, spec)).normalize();
  };
  group.add(
    scatterCoins({
      count: spec.count,
      material: m.coins,
      seed: spec.seed,
      radius: 0.13,
      place: (i, r) => {
        // Un tiers des pièces longe la façade avant, là où l'œil arrive en premier.
        const x = (r() * 2 - 1) * (iw - 0.1);
        const z = i % 3 === 0 ? id - 0.05 - r() * 0.22 : (r() * 2 - 1) * (id - 0.08);
        const n = normalAt(x, z).add(new THREE.Vector3((r() - 0.5) * 1.1, 0, (r() - 0.5) * 1.1)).normalize();
        return { position: new THREE.Vector3(x, heapY(x, z, spec) + 0.005 + r() * 0.02, z), normal: n, scale: 0.9 + r() * 0.25 };
      },
    })
  );
  return group;
}

/** Pièces tombées devant le coffre (objectif atteint) : piles et pièces à plat. */
function spilledCoins(m) {
  const stacks = [
    [1.2, 0.72, 5],
    [-1.22, 0.85, 3],
    [0.9, 1.0, 2],
  ];
  const place = [];
  for (const [x, z, n] of stacks) for (let k = 0; k < n; k++) place.push({ position: new THREE.Vector3(x + (k % 2) * 0.012, 0.022 + k * 0.042, z - (k % 3) * 0.01), normal: new THREE.Vector3(0.02 * k, 1, 0.03), scale: 1 });
  const loose = [
    [-0.6, 1.0, 0.25],
    [0.3, 1.15, -0.2],
    [-1.05, 1.25, 0.1],
    [1.38, 0.98, -0.3],
    [0.55, 0.9, 0.35],
  ];
  for (const [x, z, t] of loose) place.push({ position: new THREE.Vector3(x, 0.024, z), normal: new THREE.Vector3(t, 1, t * 0.5), scale: 1 });
  // Deux pièces appuyées contre la façade.
  place.push({ position: new THREE.Vector3(-0.42, 0.12, D / 2 + 0.07), normal: new THREE.Vector3(0.15, 0.35, 1), scale: 1, spin: 0.3 });
  place.push({ position: new THREE.Vector3(0.42, 0.12, D / 2 + 0.08), normal: new THREE.Vector3(-0.2, 0.3, 1), scale: 1, spin: 1.1 });
  return scatterCoins({ count: place.length, material: m.coins, radius: 0.13, seed: 21, place: (i) => place[i] });
}

export function buildChest({ state = "closed" } = {}) {
  const m = materials();
  const chest = new THREE.Group();
  const open = state !== "closed";

  // Caisse creuse : fond, façades, flancs, et doublure intérieure plus sombre.
  const y0 = FEET + H / 2;
  chest.add(box(W, T, D, 0.03, m.wood, [0, FEET + T / 2, 0]));
  chest.add(box(W, H, T, 0.035, m.wood, [0, y0, D / 2 - T / 2]));
  chest.add(box(W, H, T, 0.035, m.wood, [0, y0, -D / 2 + T / 2]));
  chest.add(box(T, H, D - 2 * T + 0.02, 0.03, m.wood, [W / 2 - T / 2, y0, 0]));
  chest.add(box(T, H, D - 2 * T + 0.02, 0.03, m.wood, [-W / 2 + T / 2, y0, 0]));
  const liner = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T + 0.01, H - T, D - 2 * T + 0.01), m.inner);
  liner.position.set(0, FEET + T + (H - T) / 2, 0);
  liner.receiveShadow = true;
  chest.add(liner);

  // Bandes d'or verticales, cerclages haut et bas, coins renforcés, pieds.
  for (const x of [-0.62, 0.62]) {
    chest.add(box(0.17, H + 0.02, 0.04, 0.012, m.gold, [x, y0, D / 2 + 0.012]));
    chest.add(box(0.17, H + 0.02, 0.04, 0.012, m.gold, [x, y0, -D / 2 - 0.012]));
    for (const y of [FEET + 0.2, FEET + 0.48, FEET + 0.76]) chest.add(rivet(m.goldDeep, [x, y, D / 2 + 0.034]));
  }
  for (const [y, h] of [[TOP - 0.05, 0.1], [FEET + 0.05, 0.1]]) {
    chest.add(box(W + 0.05, h, 0.05, 0.015, m.gold, [0, y, D / 2 + 0.008]));
    chest.add(box(W + 0.05, h, 0.05, 0.015, m.gold, [0, y, -D / 2 - 0.008]));
    chest.add(box(0.05, h, D + 0.05, 0.015, m.gold, [W / 2 + 0.008, y, 0]));
    chest.add(box(0.05, h, D + 0.05, 0.015, m.gold, [-W / 2 - 0.008, y, 0]));
  }
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      chest.add(box(0.15, H + 0.03, 0.15, 0.03, m.goldDeep, [x * (W / 2 - 0.035), y0, z * (D / 2 - 0.035)]));
      chest.add(box(0.22, FEET + 0.02, 0.22, 0.035, m.goldDeep, [x * (W / 2 - 0.08), (FEET + 0.02) / 2, z * (D / 2 - 0.08)]));
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.9 + i * 0.3;
    if (Math.abs(Math.abs(x) - 0.62) < 0.1) continue;
    chest.add(rivet(m.goldDeep, [x, TOP - 0.05, D / 2 + 0.034], undefined, 0.024));
    chest.add(rivet(m.goldDeep, [x, FEET + 0.05, D / 2 + 0.034], undefined, 0.024));
  }

  // Serrure : plaque d'or et pièce Okodukai en médaillon.
  chest.add(box(0.44, 0.48, 0.05, 0.03, m.gold, [0, FEET + 0.6, D / 2 + 0.02]));
  const cm = coinMaterials();
  const emblem = buildCoin(cm.caps, cm);
  emblem.scale.setScalar(0.15);
  emblem.position.set(0, FEET + 0.57, D / 2 + 0.065);
  chest.add(emblem);

  // Couvercle bombé, articulé sur l'arête arrière.
  const pivot = new THREE.Group();
  pivot.position.set(0, TOP, -D / 2);
  const lid = new THREE.Group();
  lid.position.set(0, 0, D / 2);
  // Deux coques : l'extérieur en bois clair, l'intérieur plus sombre (visible une fois ouvert).
  lid.add(halfRing(R - SHELL / 2, R, W, m.lidWood, { uv: lidUV }));
  lid.add(halfRing(R - SHELL, R - SHELL / 2 + 0.002, W - 0.01, m.lidInner, { uv: lidUV }));
  for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) {
    const cap = halfDisc(R - 0.02, 0.06, m.wood);
    cap.position.x = x;
    lid.add(cap);
  }
  for (const x of [-0.62, 0.62]) {
    const b = halfRing(R - 0.01, R + 0.035, 0.17, m.gold, { bevel: 0.012 });
    b.position.x = x;
    lid.add(b);
  }
  for (const x of [-W / 2 + 0.025, W / 2 - 0.025]) {
    const b = halfRing(R - SHELL - 0.01, R + 0.03, 0.06, m.goldDeep, { bevel: 0.012 });
    b.position.x = x;
    lid.add(b);
  }
  lid.add(box(W + 0.05, 0.08, 0.06, 0.02, m.gold, [0, 0.04, R + 0.005]));
  lid.add(box(W + 0.05, 0.08, 0.06, 0.02, m.gold, [0, 0.04, -R - 0.005]));
  // Moraillon qui retombe sur la serrure.
  lid.add(box(0.17, 0.26, 0.045, 0.02, m.goldDeep, [0, -0.06, R + 0.045]));
  lid.add(rivet(m.gold, [0, -0.13, R + 0.07], undefined, 0.035));
  pivot.add(lid);
  if (open) pivot.rotation.x = -1.86;
  chest.add(pivot);

  if (HEAPS[state]) chest.add(coinHeap(HEAPS[state], m));
  if (state === "reached") chest.add(spilledCoins(m));
  return chest;
}

export async function render(canvas, params) {
  // `groundShadow` : ombre portée longue sur un sol invisible. Désactivée par défaut, car
  // l'objet est posé sur des panneaux d'interface, pas sur un sol ; l'ombre de contact reste.
  const { width, height, state = "closed", exposure = 1.08, mood = "golden", camera = [2.8, 3.95, 5.7], target = [0.05, 1.1, 0.1], fov = 30, groundShadow = false } = params;
  const stage = createStage(canvas, { width, height, fov, exposure, mood, shadows: true });
  const chest = buildChest({ state });
  stage.scene.add(chest);

  const sc = stage.key.shadow.camera;
  Object.assign(sc, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
  sc.updateProjectionMatrix();
  stage.key.position.set(-4.5, 6.5, 4.5);

  // Ombre portée et ombre de contact, seules visibles du sol (fond transparent).
  if (groundShadow) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.3 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    stage.scene.add(ground);
  }
  const blob = document.createElement("canvas");
  blob.width = blob.height = 256;
  const g = blob.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(28,18,10,0.55)");
  grad.addColorStop(0.6, "rgba(28,18,10,0.2)");
  grad.addColorStop(1, "rgba(28,18,10,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, D * 1.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  stage.scene.add(contact);

  if (state === "almost" || state === "reached") {
    const glow = new THREE.PointLight(0xffc870, state === "reached" ? 5 : 3, 3.2, 1.6);
    glow.position.set(0, TOP + 0.45, 0.1);
    stage.scene.add(glow);
  }

  stage.camera.fov = fov;
  stage.camera.position.set(...camera);
  stage.camera.lookAt(...target);
  stage.camera.updateProjectionMatrix();
  await stage.done();
}
