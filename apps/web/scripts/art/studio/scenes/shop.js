// Échoppe de la boutique familiale : comptoir de planches, auvent rayé festonné, étagère,
// marchandises (bourse de pièces, paquets cadeaux, parchemin), lanterne. Aucun texte.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, goldMaterial } from "../lib/stage.js";
import { woodPlanks, hammeredMetal } from "../lib/textures.js";
import { scatterCoins } from "../lib/coins.js";
import { coinPouch, questScroll } from "./props.js";

function box(w, h, d, r, material, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Toile rayée (rouge brique et crème de la bible), trame de tissu légère. */
function stripeTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#f1e2bf" : "#a53a27";
    g.fillRect((i * size) / stripes, 0, size / stripes + 1, size);
  }
  // Trame : fines lignes horizontales et verticales à peine visibles.
  g.globalAlpha = 0.07;
  g.fillStyle = "#000";
  for (let y = 0; y < size; y += 3) g.fillRect(0, y, size, 1);
  for (let x = 0; x < size; x += 4) g.fillRect(x, 0, 1, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Paquet cadeau : boîte, deux rubans d'or croisés et un nœud. */
function giftBox(color, gold, [w, h, d]) {
  const g = new THREE.Group();
  const paper = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  g.add(box(w, h, d, 0.02, paper, [0, h / 2, 0]));
  g.add(box(w + 0.01, h + 0.01, 0.05, 0.01, gold, [0, h / 2, 0]));
  g.add(box(0.05, h + 0.01, d + 0.01, 0.01, gold, [0, h / 2, 0]));
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 12, 28), gold);
    loop.position.set(side * 0.05, h + 0.04, 0);
    loop.rotation.set(0, Math.PI / 2, side * 0.6);
    loop.castShadow = true;
    g.add(loop);
  }
  return g;
}

export function buildShop() {
  const group = new THREE.Group();
  const planks = woodPlanks({ size: 1024, planks: 5, seed: 31, light: [176, 110, 64], dark: [84, 44, 24] });
  const wood = new THREE.MeshStandardMaterial({ map: planks.map, normalMap: planks.normal, roughnessMap: planks.roughness, normalScale: new THREE.Vector2(0.8, 0.8) });
  const darkPlanks = woodPlanks({ size: 512, planks: 2, seed: 5, light: [120, 70, 40], dark: [58, 30, 16] });
  const darkWood = new THREE.MeshStandardMaterial({ map: darkPlanks.map, normalMap: darkPlanks.normal, roughness: 0.8 });
  const ham = hammeredMetal({ size: 256, seed: 6 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  const canvas = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.9, side: THREE.DoubleSide });

  // Comptoir : caisson de planches, plateau débordant, ferrures d'or aux angles.
  group.add(box(2.3, 0.92, 0.78, 0.03, wood, [0, 0.46, 0.1]));
  group.add(box(2.48, 0.09, 0.92, 0.03, darkWood, [0, 0.965, 0.12]));
  for (const x of [-1.12, 1.12]) group.add(box(0.12, 0.12, 0.04, 0.02, gold, [x, 0.84, 0.5]));
  // Médaillon de la pièce Okodukai au milieu du comptoir.
  const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 40), gold);
  medal.rotation.x = Math.PI / 2;
  medal.position.set(0, 0.5, 0.51);
  group.add(medal);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), darkWood);
  hole.rotation.z = -0.2;
  hole.position.set(0, 0.5, 0.525);
  group.add(hole);

  // Poteaux et fond d'échoppe avec une étagère.
  for (const x of [-1.16, 1.16]) group.add(box(0.13, 2.26, 0.13, 0.03, darkWood, [x, 1.13, 0.44]));
  group.add(box(2.3, 1.45, 0.06, 0.02, wood, [0, 1.72, -0.28]));
  group.add(box(2.1, 0.05, 0.24, 0.015, darkWood, [0, 1.62, -0.16]));

  // Auvent rayé en pente, festons alternés sur le bord avant.
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 1.05, 32, 8), canvas);
  const ap = awning.geometry.attributes.position;
  for (let i = 0; i < ap.count; i++) ap.setZ(i, Math.sin(((ap.getX(i) + 1.31) / 2.62) * Math.PI * 8) * 0.012);
  awning.geometry.computeVertexNormals();
  awning.position.set(0, 2.52, 0.2);
  awning.rotation.x = -1.02;
  awning.castShadow = true;
  group.add(awning);
  const scallops = 10;
  for (let i = 0; i < scallops; i++) {
    const tex = i % 2 ? 0xf1e2bf : 0xa53a27;
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.131, 24, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: tex, roughness: 0.9, side: THREE.DoubleSide }));
    s.position.set(-1.31 + 0.131 + i * 0.262, 2.24, 0.66);
    s.rotation.x = -0.18;
    group.add(s);
  }
  // Barre d'or qui tient l'auvent.
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.62, 16), gold);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 2.25, 0.66);
  group.add(rod);

  // Marchandises sur le comptoir.
  const pouch = coinPouch();
  pouch.scale.setScalar(0.3);
  pouch.position.set(-0.7, 1.25, 0.18);
  group.add(pouch);
  const gift1 = giftBox(0x2d7254, gold, [0.34, 0.28, 0.32]);
  gift1.position.set(0.12, 1.01, 0.16);
  gift1.rotation.y = 0.35;
  group.add(gift1);
  const gift2 = giftBox(0xbd5140, gold, [0.24, 0.2, 0.24]);
  gift2.position.set(0.14, 1.33, 0.16);
  gift2.rotation.y = -0.2;
  group.add(gift2);
  const scroll = questScroll();
  scroll.scale.setScalar(0.22);
  scroll.position.set(0.8, 1.08, 0.24);
  scroll.rotation.set(-1.2, 0.15, -0.35);
  group.add(scroll);
  // Quelques pièces sur le plateau.
  const coinMat = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  group.add(
    scatterCoins({
      count: 5,
      material: coinMat,
      radius: 0.07,
      seed: 4,
      place: (i) => ({ position: new THREE.Vector3(-0.25 + i * 0.07, 1.02 + (i % 2) * 0.012, 0.42 - (i % 3) * 0.05), normal: new THREE.Vector3(0.1 * (i % 2 ? 1 : -1), 1, 0.05) }),
    })
  );
  // Sur l'étagère : deux petits paquets et une bourse.
  const shelfGift = giftBox(0x4a7895, gold, [0.2, 0.18, 0.18]);
  shelfGift.position.set(-0.55, 1.645, -0.16);
  group.add(shelfGift);
  const shelfGift2 = giftBox(0xd59b38, gold, [0.16, 0.22, 0.16]);
  shelfGift2.position.set(0.55, 1.645, -0.16);
  group.add(shelfGift2);

  // Lanterne accrochée au poteau droit, sous l'auvent.
  const lantern = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa84a, emissiveIntensity: 1.6, roughness: 0.6 }));
  lantern.add(glow);
  for (const y of [-0.12, 0.12]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20), gold);
    cap.position.y = y;
    lantern.add(cap);
  }
  lantern.position.set(1.33, 1.95, 0.62);
  group.add(lantern);
  const light = new THREE.PointLight(0xffb35c, 1.4, 2, 2);
  light.position.set(1.2, 1.9, 0.8);
  group.add(light);
  return group;
}

export async function render(canvas, params) {
  const { width, height, exposure = 1.08, mood = "golden" } = params;
  const stage = createStage(canvas, { width, height, fov: 28, exposure, mood });
  const shop = buildShop();
  shop.rotation.y = -0.32;
  stage.scene.add(shop);
  const box3 = new THREE.Box3().setFromObject(shop);
  const size = box3.getSize(new THREE.Vector3());
  const center = box3.getCenter(new THREE.Vector3());
  const dist = (Math.max(size.x, size.y) * 0.6) / Math.tan(THREE.MathUtils.degToRad(14));
  stage.camera.position.set(center.x + dist * 0.06, center.y + dist * 0.16, center.z + dist);
  stage.camera.lookAt(center);
  await stage.done();
}
