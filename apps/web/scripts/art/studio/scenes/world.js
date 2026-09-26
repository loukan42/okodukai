// Le monde de la landing : la Vallée d'Okodukai vue depuis le chemin, en plans séparés pour la
// parallaxe et la profondeur (bible §3 : 3 à 5 plans).
//   layer "bg"   : ciel, montagnes, vallée, rivière, chemin, hameau et observatoire (opaque)
//   layer "fg"   : avant-plan en bas du cadre (touffes, fougères, pierres moussues, pièces), transparent
//   layer "base" : socle du téléphone (pierre plate moussue, touffes, pièces), objet isolé transparent
// Ambiances : `golden` (le hero) et `dawn` (la fin de page : le chemin mène au hameau au lever du jour).
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { makeNoise } from "../lib/noise.js";
import { scatterCoins } from "../lib/coins.js";
import { stoneSurface } from "../lib/textures.js";
import { studioEnvironment } from "../lib/stage.js";
import { MOODS, riverX, smooth, terrainHeight, skyMaterial, canopyGeometry, buildTerrain, forest, Finish } from "./valley.js";

/** Le chemin longe la rive droite puis monte vers le hameau. */
export const pathX = (z) => riverX(z) + 17 + 5 * Math.sin(z * 0.045 + 1.2);
const PATH_FROM = 90;
const PATH_TO = -66;
const HAMLET = { z: -74, spread: 15, scale: 1.55 };

function onPath(x, z, margin = 0) {
  if (z > PATH_FROM || z < PATH_TO - 6) return false;
  return Math.abs(x - pathX(z)) < 3.2 + margin + Math.max(0, z) * 0.03;
}

function nearHamlet(x, z) {
  return Math.hypot(x - pathX(HAMLET.z), (z - HAMLET.z) * 1.3) < HAMLET.spread + 6;
}

/** Teinte le terrain le long du chemin (terre battue claire, bords herbeux adoucis). */
function paintPath(mesh, mood) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const col = g.attributes.color;
  const dirt = new THREE.Color(mood === "dawn" ? 0xd7ae82 : 0xdcaa6c);
  const edge = new THREE.Color(0x4f6a34);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (z > PATH_FROM + 4 || z < PATH_TO - 8) continue;
    const half = 3 + Math.max(0, z) * 0.03;
    const d = Math.abs(x - pathX(z));
    const fade = smooth(PATH_TO - 8, PATH_TO + 4, z);
    const k = (1 - smooth(half * 0.6, half * 1.25, d)) * fade;
    // Bord d'herbe plus sombre : le chemin se lit même à contre-jour.
    const rim = (smooth(half * 0.9, half * 1.3, d) - smooth(half * 1.3, half * 2.2, d)) * fade;
    if (k <= 0 && rim <= 0) continue;
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(edge, rim * 0.35).lerp(dirt, k * 0.9);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

function house(rand, mood) {
  const g = new THREE.Group();
  const w = 3.4 + rand() * 1.8, d = 3 + rand() * 1.2, h = 2.6 + rand() * 1.1;
  const plaster = new THREE.MeshStandardMaterial({ color: [0xf1e3c4, 0xeadcc0, 0xf4e8cf][Math.floor(rand() * 3)], roughness: 0.92 });
  const roofMat = new THREE.MeshStandardMaterial({ color: [0x9c4a2e, 0x3f5a78, 0xb5653e, 0x8a3f2c][Math.floor(rand() * 4)], roughness: 0.75 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3624, roughness: 0.9 });
  const lit = mood === "dawn";
  const glass = new THREE.MeshStandardMaterial({ color: lit ? 0xffd58a : 0x3a4a60, emissive: lit ? 0xffb050 : 0x000000, emissiveIntensity: lit ? 2.2 : 0, roughness: 0.4 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster);
  walls.position.y = h / 2;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-w / 2 - 0.4, 0);
  roofShape.lineTo(0, h * 0.72);
  roofShape.lineTo(w / 2 + 0.4, 0);
  roofShape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 }), roofMat);
  roof.position.set(0, h - 0.05, -(d + 0.6) / 2);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), wood);
  door.position.set(-w * 0.18, 0.75, d / 2 + 0.03);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), glass);
  win.position.set(w * 0.22, h * 0.58, d / 2 + 0.03);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), plaster);
  chimney.position.set(w * 0.25, h + h * 0.45, -d * 0.1);
  for (const m of [walls, roof, door, win, chimney]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** Tour d'observation (bible : Investir = l'observatoire) : pierre, dôme bleu nuit cerclé d'or, lunette. */
function observatory(mood) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.95 });
  const dome = new THREE.MeshStandardMaterial({ color: 0x243d55, roughness: 0.45, metalness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0ae45, roughness: 0.3, metalness: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb050, emissiveIntensity: mood === "dawn" ? 2.4 : 0.6, roughness: 0.4 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 11, 28), stone);
  tower.position.y = 5.5;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), dome);
  cap.position.y = 11;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.18, 10, 48), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 11.05;
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.6, 16), gold);
  scope.position.set(0.9, 12.6, 0.4);
  scope.rotation.z = -0.8;
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.2), glass);
  win.position.set(0, 7.5, 2.95);
  for (const m of [tower, cap, ring, scope, win]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function hamlet(n, mood, seed) {
  const r = makeNoise(seed).rand;
  const g = new THREE.Group();
  const cx = pathX(HAMLET.z);
  const spots = [
    [-7, 4], [5, 7], [-12, -6], [9, -5], [-2, -12], [14, 3],
  ];
  for (const [dx, dz] of spots) {
    const x = cx + dx, z = HAMLET.z + dz;
    const hse = house(r, mood);
    hse.scale.setScalar(HAMLET.scale);
    hse.position.set(x, terrainHeight(n, x, z) - 0.3, z);
    hse.rotation.y = Math.atan2(pathX(z) - x, 6) * 0.6 + (r() - 0.5) * 0.3;
    g.add(hse);
  }
  // L'observatoire domine le hameau, sur la colline derrière.
  const ox = cx + 20, oz = HAMLET.z - 30;
  const obs = observatory(mood);
  obs.scale.setScalar(1.7);
  obs.position.set(ox, terrainHeight(n, ox, oz) - 0.4, oz);
  g.add(obs);
  return g;
}

/** Lanternes le long du chemin (aube : encore allumées). */
function pathLanterns(n, mood) {
  const g = new THREE.Group();
  if (mood !== "dawn") return g;
  const bulb = new THREE.SphereGeometry(0.28, 12, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(3) });
  const post = new THREE.CylinderGeometry(0.08, 0.1, 2, 6);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2e1e });
  for (let z = 40; z > PATH_TO; z -= 16) {
    const x = pathX(z) + (z % 32 === 0 ? 2.8 : -2.8);
    const y = terrainHeight(n, x, z);
    const p = new THREE.Mesh(post, wood);
    p.position.set(x, y + 1, z);
    const l = new THREE.Mesh(bulb, mat);
    l.position.set(x, y + 2.1, z);
    const light = new THREE.PointLight(0xffa860, 10, 14, 2);
    light.position.copy(l.position);
    g.add(p, l, light);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Végétation d'avant-plan : touffes (jamais brin par brin), buissons ronds, pierres moussues.
// ---------------------------------------------------------------------------

/** Feuille large à bout arrondi (feuillage rond de la bible), courbée vers l'arrière. */
function bladeGeometry(len = 1, width = 0.3, bend = 0.4) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width, len * 0.18, width * 0.95, len * 0.82, 0, len);
  s.bezierCurveTo(-width * 0.95, len * 0.82, -width, len * 0.18, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, p.getY(i) / len);
    p.setZ(i, -bend * t * t * len + Math.sin(p.getX(i) * 9) * 0.01);
    // Pied dans l'ombre, pointe dorée (heure dorée).
    col.set([0.68 + 0.5 * t, 0.72 + 0.4 * t, 0.62 + 0.18 * t], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const LEAF_GREENS = [0x3f7a57, 0x5d8f4a, 0x7fb06a, 0x2a5540, 0x8aa84e];

/** Une seule InstancedMesh de brins pour toutes les touffes. `tufts` : [{ at, scale, lean }]. */
function tuftField(tufts, rand, { blades = 11, len = 1, width = 0.2, bend = 0.4, greens = LEAF_GREENS } = {}) {
  const geo = bladeGeometry(len, width, bend);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 });
  const total = tufts.length * blades;
  const mesh = new THREE.InstancedMesh(geo, mat, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  let k = 0;
  for (const t of tufts) {
    for (let b = 0; b < blades; b++) {
      const a = (b / blades) * Math.PI * 2 + rand() * 0.6;
      const tilt = 0.35 + rand() * 0.6;
      e.set(Math.cos(a) * tilt + (t.lean ?? 0), a, Math.sin(a) * tilt * 0.6, "YXZ");
      q.setFromEuler(e);
      const sc = t.scale * (0.65 + rand() * 0.55);
      s.set(sc, sc * (0.8 + rand() * 0.5), sc);
      m.compose(t.at.clone().add(new THREE.Vector3(Math.cos(a) * 0.08 * t.scale, 0, Math.sin(a) * 0.08 * t.scale)), q, s);
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, new THREE.Color(greens[Math.floor(rand() * greens.length)]).multiplyScalar(0.85 + rand() * 0.3));
      k++;
    }
  }
  mesh.castShadow = true;
  return mesh;
}

/** Buisson rond : même feuillage que les arbres de la vallée, écrasé. */
function bush(n, at, scale, color) {
  const g = canopyGeometry(n);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, color, roughness: 0.9 }));
  m.scale.set(scale, scale * 0.72, scale);
  m.position.copy(at).add(new THREE.Vector3(0, scale * 0.35, 0));
  m.castShadow = true;
  return m;
}

/** Pierre moussue : icosaèdre déformé, mousse sur le dessus (bible : pierre + mousse, une fissure au plus). */
function mossyStone(n, seed, scale, flat = 0.55, mossLine = 0.55) {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const d = 1 + n.fbm(v.x * 1.4 + v.z * 0.9 + seed, v.y * 1.4 + v.z * 0.7, 3) * 0.28;
    v.multiplyScalar(d);
    v.y *= flat;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const stone = new THREE.Color(0x9a8f7a), light = new THREE.Color(0xc4b99f), moss = new THREE.Color(0x587f42), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const up = nrm.getY(i);
    c.copy(stone).lerp(light, smooth(-0.2, 0.6, up) * 0.6);
    c.lerp(moss, smooth(mossLine, mossLine + 0.3, up + n.fbm(p.getX(i) * 3, p.getZ(i) * 3, 2) * 0.35) * 0.85);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const tex = stoneSurface({ size: 256, seed: 11 + seed });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.35, normalMap: tex.normal, normalScale: new THREE.Vector2(0.9, 0.9) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Or des pièces : reflets du plateau de studio (comme la pièce du logo), pas du ciel bleu. */
function coinGold(r) {
  const envMap = new THREE.PMREMGenerator(r).fromScene(studioEnvironment({ mood: "golden" }), 0.035).texture;
  return new THREE.MeshPhysicalMaterial({ color: 0xf0b848, metalness: 1, roughness: 0.26, clearcoat: 0.35, envMap, envMapIntensity: 1.1 });
}

/** Point du monde vu à l'écran en (x, y) NDC, à `dist` de la caméra. */
function atScreen(cam, x, y, dist) {
  const dir = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
  return cam.position.clone().add(dir.multiplyScalar(dist));
}

/** Reflets tirés du ciel de la vallée : l'or des pièces reste doré, jamais noir. */
function skyEnvironment(r, scene, mood) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(mood)));
  scene.environment = new THREE.PMREMGenerator(r).fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.9;
}

function lightScene(scene, mood) {
  const m = MOODS[mood];
  // Remplissage chaud côté caméra : l'avant-plan est à contre-jour, il ne doit pas tomber dans le noir.
  const fill = new THREE.DirectionalLight(0xffe6c0, 1.1);
  fill.position.set(8, 10, 40);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(m.sunColor, m.sunIntensity * 0.9);
  sun.position.set(...m.sunDir).multiplyScalar(60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(m.hemiSky, m.hemiGround, m.hemi + 0.25));
  // Contre-jour chaud qui découpe les bords des feuilles (liseré de la bible).
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.4);
  rim.position.set(-20, 12, -40);
  scene.add(rim);
  return sun;
}

function renderer(canvas, width, height, mood, transparent) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(width, height, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = MOODS[mood].exposure;
  r.setClearColor(0x000000, transparent ? 0 : 1);
  return r;
}

const CAMERAS = {
  wide: { camera: [30, 19, 84], target: [6, 5, -120], fov: 38 },
  tall: { camera: [22, 28, 84], target: [8, 6, -140], fov: 58 },
  // Fin de page : plus loin sur le chemin, le hameau se rapproche.
  "dawn-wide": { camera: [24, 16, 0], target: [8, 30, -180], fov: 42 },
  "dawn-tall": { camera: [22, 18, 6], target: [10, 26, -180], fov: 60 },
  top: { camera: [0, 420, -60], target: [0, 0, -61], fov: 50 },
};

async function renderBackground(canvas, params) {
  const { width, height, mood = "golden", seed = 4, frame = "wide", trees = 1500 } = params;
  const m = MOODS[mood];
  const view = CAMERAS[frame] ?? CAMERAS.wide;
  const n = makeNoise(seed);
  const r = renderer(canvas, width, height, mood, false);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(m.fog, m.fogDensity);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), skyMaterial(mood));
  sky.material.fog = false;
  scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(mood)));
  const pmrem = new THREE.PMREMGenerator(r);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;

  const sunDir = new THREE.Vector3(...m.sunDir).normalize();
  const sun = new THREE.DirectionalLight(m.sunColor, m.sunIntensity);
  sun.position.copy(sunDir).multiplyScalar(200);
  sun.target.position.set(10, 0, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 1, far: 650 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(m.hemiSky, m.hemiGround, m.hemi));

  const near = buildTerrain(n, mood, { size: 460, seg: 420, center: [0, -140] });
  paintPath(near, mood);
  scene.add(near);
  scene.add(buildTerrain(n, mood, { size: 1400, seg: 260, center: [0, -700] }));
  for (const f of forest(n, mood, trees, seed + 1, (x, z) => onPath(x, z, 3) || nearHamlet(x, z))) scene.add(f);
  scene.add(hamlet(n, mood, seed + 5));
  scene.add(pathLanterns(n, mood));

  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshPhysicalMaterial({ color: m.water, roughness: 0.08, metalness: 0.1, envMapIntensity: 1.4 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.35, -400);
  scene.add(water);

  const cam = new THREE.PerspectiveCamera(view.fov, width / height, 0.5, 2000);
  cam.position.set(...view.camera);
  cam.lookAt(...view.target);

  const composer = new EffectComposer(r);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), mood === "dawn" ? 0.4 : 0.26, 0.6, 0.86));
  composer.addPass(new ShaderPass(Finish));
  composer.addPass(new OutputPass());
  composer.render();
  await new Promise((res) => requestAnimationFrame(() => res()));
}

/** Avant-plan : un bandeau de végétation posé sur le bas du cadre, le centre plus bas que les coins. */
async function renderForeground(canvas, params) {
  const { width, height, mood = "golden", seed = 9, frame = "wide" } = params;
  const view = CAMERAS[frame] ?? CAMERAS.wide;
  const n = makeNoise(seed);
  const rand = makeNoise(seed + 3).rand;
  const r = renderer(canvas, width, height, mood, true);
  const scene = new THREE.Scene();
  skyEnvironment(r, scene, mood);
  lightScene(scene, mood);
  const cam = new THREE.PerspectiveCamera(view.fov, width / height, 0.05, 200);
  cam.position.set(...view.camera);
  cam.lookAt(...view.target);

  const tall = frame.includes("tall");
  const tufts = [];
  // Coins gauche et droit bien fournis, centre plus ras : la lecture du titre et des boutons reste libre.
  const count = tall ? 12 : 22;
  for (let i = 0; i < count; i++) {
    // Plus dense vers la droite (le produit) ; à gauche, sous le titre, la végétation reste basse.
    const side = rand() < 0.35 ? -1 : 1;
    const edge = Math.pow(rand(), 0.55) * 1.15;
    const x = side * edge;
    const rise = smooth(0.3, 1.05, edge) * (side < 0 ? 0.45 : 1);
    if (rise < 0.15 && rand() < 0.45) continue;
    const dist = 4.5 + rand() * 5;
    const y = -1.2 + rise * 0.2 + rand() * 0.07;
    tufts.push({ at: atScreen(cam, x, y, dist), scale: (0.45 + rise * 0.75 + rand() * 0.35) * dist * 0.11, lean: -0.1 });
  }
  scene.add(tuftField(tufts, rand, { blades: 10, len: 1.1, width: 0.3, bend: 0.45 }));
  // Fougères longues aux deux coins.
  const ferns = [0.92, 1.05].map((x) => ({ at: atScreen(cam, x, -1.14, 4.6), scale: 0.5, lean: -0.25 }));
  scene.add(tuftField(ferns, rand, { blades: 9, len: 2.1, width: 0.36, bend: 0.8, greens: [0x3f7a57, 0x4f8a50, 0x5d8f4a] }));
  // Buissons et pierres moussues aux coins.
  scene.add(bush(n, atScreen(cam, -1.08, -1.22, 7), 0.9, 0x6e9a3e));
  scene.add(bush(n, atScreen(cam, 1.06, -1.02, 8), 1.4, 0x5a8a3c));
  const s1 = mossyStone(n, 1, 0.85);
  s1.position.copy(atScreen(cam, -0.8, -1.2, 6));
  const s2 = mossyStone(n, 4, 0.6, 0.7);
  s2.position.copy(atScreen(cam, 0.72, -1.1, 5.5));
  scene.add(s1, s2);
  // Quelques pièces tombées dans l'herbe.
  const spots = [[-0.62, -0.98, 5.2], [0.55, -1.0, 5], [0.63, -0.96, 5.6]];
  scene.add(
    scatterCoins({
      count: spots.length,
      material: coinGold(r),
      radius: 0.16,
      seed: 5,
      place: (i) => ({ position: atScreen(cam, ...spots[i]), normal: new THREE.Vector3(0.15 * (i - 1), 1, 0.55) }),
    })
  );
  r.render(scene, cam);
  await new Promise((res) => requestAnimationFrame(() => res()));
}

/** Socle du téléphone : dalle de pierre moussue, touffes autour, deux pièces. Trois-quarts plongeant. */
async function renderBase(canvas, params) {
  const { width, height, mood = "golden", seed = 7 } = params;
  const n = makeNoise(seed);
  const rand = makeNoise(seed + 1).rand;
  const r = renderer(canvas, width, height, mood, true);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  skyEnvironment(r, scene, mood);
  const sun = lightScene(scene, mood);
  sun.position.set(-6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });

  const slab = mossyStone(n, 2, 1, 0.34, 0.8);
  slab.scale.set(2.5, 1.1, 1.35);
  scene.add(slab);
  const pebble = mossyStone(n, 6, 0.45, 0.6);
  pebble.position.set(2.5, 0, 0.9);
  scene.add(pebble);
  const tufts = [
    { at: new THREE.Vector3(-2.3, 0, 0.6), scale: 0.8 },
    { at: new THREE.Vector3(-1.6, 0, 1.2), scale: 0.6 },
    { at: new THREE.Vector3(2.0, 0, 1.1), scale: 0.7 },
    { at: new THREE.Vector3(2.6, 0, -0.2), scale: 0.9 },
    { at: new THREE.Vector3(-2.7, 0, -0.5), scale: 1 },
    { at: new THREE.Vector3(0.4, 0, 1.45), scale: 0.45 },
  ];
  scene.add(tuftField(tufts, rand, { blades: 10, len: 0.95, width: 0.3, bend: 0.4 }));
  scene.add(
    scatterCoins({
      count: 2,
      material: coinGold(r),
      radius: 0.28,
      seed: 3,
      place: (i) => ({ position: new THREE.Vector3(i ? 1.3 : -1.1, 0.2, 1.25), normal: new THREE.Vector3(i ? 0.2 : -0.1, 1, 0.4) }),
    })
  );
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x3b4f78 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.18;
  ground.receiveShadow = true;
  scene.add(ground);

  const cam = new THREE.PerspectiveCamera(24, width / height, 0.1, 100);
  cam.position.set(0, 2.9, 10.2);
  cam.lookAt(0, 0.3, 0);
  r.render(scene, cam);
  await new Promise((res) => requestAnimationFrame(() => res()));
}

export async function render(canvas, params) {
  const layer = params.layer ?? "bg";
  if (layer === "fg") return renderForeground(canvas, params);
  if (layer === "base") return renderBase(canvas, params);
  return renderBackground(canvas, params);
}
