// Plateau de tournage commun : rendu ACES, environnement HDR de studio, éclairage
// de la bible (clé chaude en haut à gauche, contre-jour froid, remplissage bleuté).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Environnement « photo produit » : fond sombre et chaud, grande boîte à lumière chaude
 * en haut à gauche (clé), bande froide à droite (contre-jour), rebond chaud au sol.
 * Les métaux y gagnent de vrais reflets contrastés au lieu d'un gris uniforme.
 */
const MOODS = {
  // Heure dorée : ciel crème lumineux, horizon ambré, sol brun chaud, nadir bleu nuit
  // (les ombres froides de la bible). Les reflets sombres de l'or restent chauds.
  golden: [
    [-1, 0x1c2438, 0.45],
    [-0.62, 0x5a3a1e, 0.7],
    [-0.2, 0xa87038, 0.95],
    [0.02, 0xb27a40, 0.8],
    [0.35, 0xb98c52, 0.7],
    [1, 0xe9cc96, 0.85],
  ],
  // Crépuscule aux lanternes : zénith bleu nuit, horizon orangé, sol très sombre.
  dusk: [
    [-1, 0x0b1020, 0.4],
    [-0.3, 0x2a1c1a, 0.6],
    [0.02, 0xd9784a, 1.3],
    [0.4, 0x5b5f8f, 0.9],
    [1, 0x1f2b52, 0.7],
  ],
};

/**
 * Environnement « photo produit » : dôme en dégradé (voir MOODS) + boîtes à lumière
 * (clé chaude en haut à gauche, contre-jour froid à droite, plafond). Les métaux y
 * prennent de vrais reflets contrastés sans jamais tomber dans le noir.
 */
export function studioEnvironment({ mood = "golden" } = {}) {
  const env = new THREE.Scene();
  const R = 40;
  const dome = new THREE.SphereGeometry(R, 96, 48);
  const stops = MOODS[mood].map(([y, hex, k]) => [y, new THREE.Color(hex).multiplyScalar(k)]);
  const pos = dome.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / R;
    let j = 0;
    while (j < stops.length - 2 && y > stops[j + 1][0]) j++;
    const [y0, c0] = stops[j];
    const [y1, c1] = stops[j + 1];
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    c.copy(c0).lerp(c1, t * t * (3 - 2 * t));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  dome.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const panel = (w, h, color, intensity, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  const warm = mood === "dusk" ? 0xffb070 : 0xfff0d6;
  panel(9, 6, warm, 9, [-7, 8, 7]);
  panel(1.6, 10, 0xcfe0ff, mood === "dusk" ? 7 : 5, [9, 2, -4]);
  panel(8, 4, 0xfff6e8, 4, [2, 11, 3]);
  panel(3, 3, 0xffc27a, 3, [-9, -1, -5]);
  // Réflecteur bas devant le sujet : les surfaces verticales en or restent dorées.
  panel(14, 3, 0xffd8a0, 1.1, [1, 1.2, 12]);
  // Sol clair devant le sujet (comme un fond de studio) : vu d'en haut, l'or vertical le reflète.
  panel(12, 7, 0xffc890, mood === "dusk" ? 0.8 : 1.5, [-1, -7, 7]);
  return env;
}

export function createStage(canvas, { width, height, fov = 28, exposure = 1.05, transparent = true, envIntensity = 1, shadows = false, env = "studio", mood = "golden" } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(0x000000, transparent ? 0 : 1);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env === "room" ? new RoomEnvironment() : studioEnvironment({ mood }), 0.035).texture;
  scene.environmentIntensity = envIntensity;

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.05, 200);

  const key = new THREE.DirectionalLight(0xffe0b0, 2.8);
  key.position.set(-4, 5, 4);
  const rim = new THREE.DirectionalLight(0x9fc0ff, 1.8);
  rim.position.set(4, 2.5, -3.5);
  const fill = new THREE.HemisphereLight(0xfff1dc, 0x3b4f78, 0.45);
  scene.add(key, rim, fill);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
  }

  const done = () =>
    new Promise((resolve) => {
      renderer.render(scene, camera);
      requestAnimationFrame(() => resolve());
    });

  return { THREE, renderer, scene, camera, key, rim, fill, done };
}

/** Or : métal PBR, légèrement patiné (rugosité variable fournie par une texture). */
export function goldMaterial({ normalMap, roughnessMap, tint = 0xe8b04c } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 1,
    roughness: 0.32,
    normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
  });
}
