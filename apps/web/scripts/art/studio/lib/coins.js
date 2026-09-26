// Pièces « de foule » : géométrie simplifiée (disque à trou carré + liseré) fusionnée
// en un seul maillage, pour les tas, les cascades et les éclats de pièces instanciés.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function squareHole(s, angle) {
  const p = new THREE.Path();
  const c = Math.cos(angle), si = Math.sin(angle), h = s / 2;
  const pts = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, y]) => [x * c - y * si, x * si + y * c]);
  p.moveTo(...pts[0]);
  for (let i = 1; i < 4; i++) p.lineTo(...pts[i]);
  p.closePath();
  return p;
}

/** Pièce de rayon 1, épaisseur ~0.2, centrée, face vers +Z. */
export function coinGeometry({ segments = 48 } = {}) {
  const disc = new THREE.Shape();
  disc.absarc(0, 0, 1, 0, Math.PI * 2, false);
  disc.holes.push(squareHole(0.34, (-12 * Math.PI) / 180));
  const base = new THREE.ExtrudeGeometry(disc, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: segments });
  base.translate(0, 0, -0.05);
  const parts = [base];
  for (const side of [1, -1]) {
    const ring = new THREE.Shape();
    ring.absarc(0, 0, 0.96, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.8, 0, Math.PI * 2, true);
    ring.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(ring, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: segments });
    g.translate(0, 0, side > 0 ? 0.095 : -0.115);
    parts.push(g);
  }
  // mergeGeometries exige les mêmes attributs : on retire les groupes de matériaux.
  for (const p of parts) p.clearGroups();
  return mergeGeometries(parts, false);
}

/**
 * Remplit un InstancedMesh de pièces. `place(i, rand)` renvoie
 * { position: Vector3, normal: Vector3, spin, scale } pour la pièce i.
 */
export function scatterCoins({ count, material, place, radius = 0.15, seed = 1, tint = true }) {
  const geo = coinGeometry();
  const mesh = new THREE.InstancedMesh(geo, material, count);
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const p = place(i, rand);
    q.setFromUnitVectors(z, p.normal.clone().normalize());
    spin.setFromAxisAngle(z, p.spin ?? rand() * Math.PI * 2);
    q.multiply(spin);
    const k = radius * (p.scale ?? 1);
    m.compose(p.position, q, new THREE.Vector3(k, k, k));
    mesh.setMatrixAt(i, m);
    if (tint) mesh.setColorAt(i, color.setRGB(1, 0.93 + rand() * 0.07, 0.86 + rand() * 0.14));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
