// Tableau d'aventurier (Journal de quêtes) : panneau de planches sous un petit toit,
// trois avis de quête épinglés, une lanterne. Aucun texte : les avis portent des tracés.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, goldMaterial } from "../lib/stage.js";
import { woodPlanks, hammeredMetal } from "../lib/textures.js";
import { parchmentTexture } from "./props.js";

function box(w, h, d, r, material, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Avis de quête : feuille de parchemin légèrement gondolée. */
function notice(texture, { w, h, pos, rot }) {
  const g = new THREE.PlaneGeometry(w, h, 16, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin((y / h) * Math.PI) * 0.015 + (x / w) * (y / h) * 0.03 + Math.max(0, -y / h - 0.3) * 0.05);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }));
  m.position.set(...pos);
  m.rotation.set(0, 0, rot);
  m.castShadow = true;
  return m;
}

function pin(color, pos) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.6 }));
  head.scale.set(1, 1, 0.7);
  g.add(head);
  g.position.set(...pos);
  return g;
}

export function buildBoard() {
  const group = new THREE.Group();
  const planks = woodPlanks({ size: 1024, planks: 5, seed: 12, light: [170, 104, 60], dark: [78, 40, 22] });
  const wood = new THREE.MeshStandardMaterial({ map: planks.map, normalMap: planks.normal, roughnessMap: planks.roughness, normalScale: new THREE.Vector2(0.8, 0.8) });
  const darkPlanks = woodPlanks({ size: 512, planks: 2, seed: 3, light: [120, 70, 40], dark: [58, 30, 16] });
  const darkWood = new THREE.MeshStandardMaterial({ map: darkPlanks.map, normalMap: darkPlanks.normal, roughness: 0.8 });
  const roofTex = woodPlanks({ size: 512, planks: 6, seed: 21, light: [150, 62, 44], dark: [82, 30, 22] });
  const roof = new THREE.MeshStandardMaterial({ map: roofTex.map, normalMap: roofTex.normal, roughness: 0.7 });
  const ham = hammeredMetal({ size: 256, seed: 2 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });

  // Poteaux et panneau.
  for (const x of [-1.12, 1.12]) group.add(box(0.16, 2.9, 0.16, 0.03, darkWood, [x, 1.45, 0]));
  group.add(box(2.1, 1.5, 0.1, 0.03, wood, [0, 1.62, 0.02]));
  // Cadre du panneau.
  group.add(box(2.26, 0.1, 0.16, 0.03, darkWood, [0, 2.4, 0.03]));
  group.add(box(2.26, 0.1, 0.16, 0.03, darkWood, [0, 0.84, 0.03]));
  // Toit à deux pans, légèrement débordant.
  const roofL = box(1.42, 0.12, 0.78, 0.03, roof, [-0.62, 3.0, 0.04], [0, 0, 0.42]);
  const roofR = box(1.42, 0.12, 0.78, 0.03, roof, [0.62, 3.0, 0.04], [0, 0, -0.42]);
  group.add(roofL, roofR);
  group.add(box(0.14, 0.14, 0.82, 0.03, darkWood, [0, 3.3, 0.04]));
  // Pignon plein sous le toit (sinon on voit un triangle vide de face).
  const gable = new THREE.Shape();
  gable.moveTo(-1.12, 2.46);
  gable.lineTo(1.12, 2.46);
  gable.lineTo(0, 3.24);
  gable.closePath();
  const gableMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), darkWood);
  gableMesh.position.z = -0.04;
  gableMesh.castShadow = gableMesh.receiveShadow = true;
  group.add(gableMesh);
  // Écusson doré au centre du pignon : la pièce Okodukai en médaillon.
  const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 40), gold);
  medal.rotation.x = Math.PI / 2;
  medal.position.set(0, 2.78, 0.07);
  group.add(medal);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), darkWood);
  hole.rotation.z = -0.2;
  hole.position.set(0, 2.78, 0.08);
  group.add(hole);
  // Pierres au pied des poteaux.
  const stone = new THREE.MeshStandardMaterial({ color: 0x6d6a5c, roughness: 0.95 });
  for (const [x, s] of [[-1.12, 0.2], [-0.95, 0.12], [1.12, 0.18], [1.3, 0.11]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), stone);
    rock.scale.set(1.2, 0.6, 1);
    rock.position.set(x, s * 0.45, 0.1);
    group.add(rock);
  }
  // Ferrures dorées aux coins du cadre.
  for (const x of [-1.05, 1.05]) for (const y of [0.84, 2.4]) group.add(box(0.14, 0.14, 0.04, 0.02, gold, [x, y, 0.12]));

  // Trois avis épinglés, dont un qui déborde (effet « nouvelle quête »).
  const notes = [
    { w: 0.62, h: 0.78, pos: [-0.58, 1.72, 0.09], rot: 0.06, seed: 3, pin: 0xc0392b },
    { w: 0.58, h: 0.7, pos: [0.14, 1.52, 0.09], rot: -0.05, seed: 8, pin: 0xe0a93e },
    { w: 0.52, h: 0.62, pos: [0.72, 1.86, 0.1], rot: 0.09, seed: 14, pin: 0x2d7254 },
  ];
  for (const n of notes) {
    group.add(notice(parchmentTexture(n.seed), n));
    group.add(pin(n.pin, [n.pos[0] + Math.sin(n.rot) * -n.h * 0.42, n.pos[1] + n.h * 0.42, n.pos[2] + 0.03]));
  }

  // Lanterne suspendue au pan droit du toit.
  const lantern = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa84a, emissiveIntensity: 1.6, roughness: 0.6 }));
  lantern.add(glow);
  for (const y of [-0.12, 0.12]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20), gold);
    cap.position.y = y;
    lantern.add(cap);
  }
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), darkWood);
  cord.position.y = 0.27;
  lantern.add(cord);
  lantern.position.set(1.22, 2.55, 0.28);
  group.add(lantern);
  const light = new THREE.PointLight(0xffb35c, 1.2, 1.6, 2);
  light.position.set(1.22, 2.5, 0.4);
  group.add(light);
  return group;
}

export async function render(canvas, params) {
  const { width, height, exposure = 1.08, mood = "golden" } = params;
  const stage = createStage(canvas, { width, height, fov: 28, exposure, mood });
  const board = buildBoard();
  board.rotation.y = 0.28;
  stage.scene.add(board);
  const box3 = new THREE.Box3().setFromObject(board);
  const size = box3.getSize(new THREE.Vector3());
  const center = box3.getCenter(new THREE.Vector3());
  const dist = (Math.max(size.x, size.y) * 0.6) / Math.tan(THREE.MathUtils.degToRad(14));
  stage.camera.position.set(center.x - dist * 0.08, center.y + dist * 0.14, center.z + dist);
  stage.camera.lookAt(center);
  await stage.done();
}
