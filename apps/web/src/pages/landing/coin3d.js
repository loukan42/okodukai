// La pièce Okodukai en 3D temps réel, l'objet signature de la landing. Même géométrie que l'asset
// du studio (`buildCoin`), même plateau de lumière ; les textures de gravure sont cuites une fois
// (`scripts/art/studio/bake-coin.mjs`). Ce module est chargé à la demande, jamais sous
// `prefers-reduced-motion` : la page affiche alors l'image fixe de la pièce.
import * as THREE from "three";
import { buildCoin } from "../../../scripts/art/studio/scenes/coin.js";
import { studioEnvironment, goldMaterial } from "../../../scripts/art/studio/lib/stage.js";

const TEXTURES = "/assets/coins/okodukai-coin-";

function loadTexture(loader, name, { face }) {
  return new Promise((resolve, reject) => {
    loader.load(
      `${TEXTURES}${name}.webp`,
      (t) => {
        if (face) {
          // Les UV d'une forme extrudée vont de -1 à 1 : on centre la gravure sur la face.
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.repeat.set(0.5, 0.5);
          t.offset.set(0.5, 0.5);
        } else {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(0.5, 0.5);
        }
        resolve(t);
      },
      undefined,
      reject
    );
  });
}

/**
 * Monte la pièce dans `canvas`. `getScroll()` renvoie la progression du hero (0 → 1) : la pièce
 * tourne et la lumière glisse quand on quitte le monde. Rien ne tourne tant que `setActive(false)`.
 */
export async function mountCoin(canvas, { getScroll = () => 0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment({ mood: "golden" }), 0.035).texture;
  pmrem.dispose();

  const loader = new THREE.TextureLoader();
  const [faceNormal, faceRough, edgeNormal, edgeRough] = await Promise.all([
    loadTexture(loader, "face-normal", { face: true }),
    loadTexture(loader, "face-roughness", { face: true }),
    loadTexture(loader, "edge-normal", { face: false }),
    loadTexture(loader, "edge-roughness", { face: false }),
  ]);
  const caps = goldMaterial({ normalMap: faceNormal, roughnessMap: faceRough });
  const sides = goldMaterial({ normalMap: edgeNormal, roughnessMap: edgeRough, tint: 0xdca440 });
  const details = new THREE.MeshPhysicalMaterial({ color: 0xf2c25a, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 });
  const coin = buildCoin(caps, { caps, sides, details });
  scene.add(coin);

  // Bible §4 : clé chaude en haut à gauche, contre-jour froid à droite, remplissage bleuté.
  const key = new THREE.DirectionalLight(0xffe0b0, 2.8);
  key.position.set(-4, 5, 4);
  const rim = new THREE.DirectionalLight(0x9fc0ff, 1.6);
  rim.position.set(4, 2.5, -3.5);
  scene.add(key, rim, new THREE.HemisphereLight(0xfff1dc, 0x3b4f78, 0.45));

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let active = false;
  let frame = 0;
  let last = performance.now();
  let spin = 0;

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = getScroll();
    spin += dt * 0.32;
    // Le pointeur incline la pièce avec un ressort doux (jamais de secousse).
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3.2);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3.2);
    coin.rotation.set(-0.32 + pointer.y * 0.35 + s * 0.6, 0.35 + Math.sin(spin) * 0.55 + pointer.x * 0.5 + s * Math.PI * 1.1, 0.08);
    coin.position.y = Math.sin(now / 1400) * 0.05;
    // En quittant le hero, la lumière glisse de la gauche vers le dessus.
    key.position.set(-4 + s * 5, 5 + s * 2, 4 - s * 2);
    renderer.render(scene, camera);
  }

  function loop(now) {
    draw(now);
    frame = active ? requestAnimationFrame(loop) : 0;
  }

  resize();
  draw(performance.now());

  return {
    setActive(next) {
      if (next === active) return;
      active = next;
      if (active) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    /** Position du pointeur dans la fenêtre, de -1 à 1. */
    pointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    resize,
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      active = false;
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      for (const m of [caps, sides, details]) m.dispose();
      for (const t of [faceNormal, faceRough, edgeNormal, edgeRough]) t.dispose();
      renderer.dispose();
    },
  };
}
