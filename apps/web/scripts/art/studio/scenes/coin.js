// Pièce Okodukai en 3D : disque d'or à trou carré (silhouette du logo), liseré en
// relief, anneau intérieur, cadre du trou et huit rivets. Aucun texte gravé.
import * as THREE from "three";
import { createStage, goldMaterial } from "../lib/stage.js";
import { hammeredMetal, engravedCoinFace } from "../lib/textures.js";

function roundedSquare(path, s, r, angle) {
  const c = Math.cos(angle), si = Math.sin(angle);
  const P = (x, y) => [x * c - y * si, x * si + y * c];
  const h = s / 2;
  const pts = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (let i = 0; i < 4; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[(i + 3) % 4];
    const [nx, ny] = pts[(i + 1) % 4];
    const k = r / s;
    const a = P(x + (px - x) * k, y + (py - y) * k);
    const b = P(x + (nx - x) * k, y + (ny - y) * k);
    const v = P(x, y);
    if (i === 0) path.moveTo(a[0], a[1]);
    else path.lineTo(a[0], a[1]);
    path.quadraticCurveTo(v[0], v[1], b[0], b[1]);
  }
  path.closePath();
}

function ring(inner, outer, depth, bevel) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, inner, 0, Math.PI * 2, true);
  s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 4, curveSegments: 160 });
}

export function buildCoin(material, { caps = material, sides = material, details = material } = {}) {
  const group = new THREE.Group();
  const HOLE = 0.34, ANG = (-12 * Math.PI) / 180;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  roundedSquare(hole, HOLE, 0.06, ANG);
  shape.holes.push(hole);
  const depth = 0.12, bev = 0.045;
  const base = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.035, bevelSegments: 6, curveSegments: 160 });
  base.translate(0, 0, -depth / 2);
  group.add(new THREE.Mesh(base, [caps, sides]));
  const front = depth / 2 + bev - 0.004;

  for (const side of [1, -1]) {
    const z = side * front;
    const rim = new THREE.Mesh(ring(0.86, 0.975, 0.02, 0.014), details);
    rim.position.z = side > 0 ? z : z - 0.02;
    const inner = new THREE.Mesh(ring(0.57, 0.61, 0.012, 0.008), details);
    inner.position.z = side > 0 ? z : z - 0.012;
    group.add(rim, inner);

    // Cadre en relief autour du trou carré.
    const frame = new THREE.Shape();
    roundedSquare(frame, HOLE + 0.14, 0.08, ANG);
    const fh = new THREE.Path();
    roundedSquare(fh, HOLE, 0.06, ANG);
    frame.holes.push(fh);
    const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 });
    const fm = new THREE.Mesh(fg, details);
    fm.position.z = side > 0 ? z : z - 0.018;
    group.add(fm);

    // Blason à quatre pétales autour du trou (à la manière des mon japonais), sans texte.
    for (let k = 0; k < 4; k++) {
      const petal = new THREE.Shape();
      petal.moveTo(0, 0.3);
      petal.quadraticCurveTo(0.075, 0.405, 0, 0.5);
      petal.quadraticCurveTo(-0.075, 0.405, 0, 0.3);
      const pg = new THREE.ExtrudeGeometry(petal, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 24 });
      const pm = new THREE.Mesh(pg, details);
      pm.rotation.z = ANG + (k * Math.PI) / 2 + Math.PI / 4;
      pm.position.z = side > 0 ? z : z - 0.01;
      group.add(pm);
    }

    // Huit rivets entre l'anneau intérieur et le liseré.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), details);
      stud.rotation.x = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      stud.position.set(Math.cos(a) * 0.735, Math.sin(a) * 0.735, z);
      group.add(stud);
    }
  }
  return group;
}

/** Jeu de matières de la pièce : faces gravées, tranche brossée, reliefs polis. */
export function coinMaterials() {
  const face = engravedCoinFace({ size: 1024 });
  const { normal, roughness } = hammeredMetal({ size: 512, seed: 5, dents: 10, scratches: 16 });
  normal.repeat.set(0.5, 0.5);
  roughness.repeat.set(0.5, 0.5);
  return {
    caps: goldMaterial({ normalMap: face.normal, roughnessMap: face.roughness }),
    sides: goldMaterial({ normalMap: normal, roughnessMap: roughness, tint: 0xdca440 }),
    details: new THREE.MeshPhysicalMaterial({ color: 0xf2c25a, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 }),
  };
}

export async function render(canvas, params) {
  const { width, height, rotY = -0.38, rotX = 0.26, rotZ = 0.05, exposure = 1.0, mood = "golden" } = params;
  const stage = createStage(canvas, { width, height, fov: 26, exposure, mood });
  const m = coinMaterials();
  const coin = buildCoin(m.caps, m);
  coin.rotation.set(rotX, rotY, rotZ);
  stage.scene.add(coin);
  stage.camera.position.set(0, 0, 5.1);
  stage.camera.lookAt(0, 0, 0);
  await stage.done();
}
