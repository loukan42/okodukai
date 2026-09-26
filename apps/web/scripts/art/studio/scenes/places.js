// Objets des lieux de l'argent (même plateau et même lumière que les objets de la boucle) :
//   telescope (l'observatoire) · orchard-tree (le verger du temps long) · bookshelf (la bibliothèque)
// Paramètre `object` pour choisir. Aucun texte dans les images.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createStage, goldMaterial } from "../lib/stage.js";
import { hammeredMetal, woodPlanks } from "../lib/textures.js";
import { makeNoise } from "../lib/noise.js";
import { scatterCoins } from "../lib/coins.js";

function box(w, h, d, r, material, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
}

function wood(seed = 9, light = [168, 108, 62], dark = [80, 44, 24]) {
  const p = woodPlanks({ size: 512, planks: 3, seed, light, dark });
  return new THREE.MeshStandardMaterial({ map: p.map, normalMap: p.normal, roughnessMap: p.roughness, normalScale: new THREE.Vector2(0.7, 0.7) });
}

/** Lunette de l'observatoire : trépied de bois, tube de laiton cerclé d'or, lentille bleu nuit. */
function telescope() {
  const g = new THREE.Group();
  const legs = wood(4, [150, 96, 54], [70, 40, 20]);
  const ham = hammeredMetal({ size: 256, seed: 5 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc98f3a, metalness: 1, roughness: 0.3, clearcoat: 0.3 });
  // Trépied.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.5, 12), legs);
    leg.position.set(Math.cos(a) * 0.32, -0.55, Math.sin(a) * 0.32);
    leg.lookAt(0, 0.2, 0);
    leg.rotateX(Math.PI / 2);
    g.add(leg);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), gold);
  head.position.y = 0.18;
  g.add(head);
  // Tube incliné vers le ciel.
  const tube = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.5, 48), brass);
  tube.add(body);
  for (const y of [-0.62, -0.1, 0.45, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(y > 0.6 ? 0.17 : 0.16, 0.025, 12, 48), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    tube.add(ring);
  }
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 48, 1, true), gold);
  hood.position.y = 0.8;
  tube.add(hood);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshPhysicalMaterial({ color: 0x1d3a72, metalness: 0.2, roughness: 0.05, clearcoat: 1, emissive: 0x0d1f45, emissiveIntensity: 0.4 }));
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = 0.86;
  tube.add(lens);
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 24), gold);
  eyepiece.position.y = -0.85;
  tube.add(eyepiece);
  tube.position.set(0, 0.32, 0);
  tube.rotation.set(0, 0, -0.9);
  g.add(tube);
  // Une étoile dorée qui brille au bout de la visée.
  const star = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 0.035 : 0.12;
    const a = (i / 8) * Math.PI * 2;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01 }), new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffc24a, emissiveIntensity: 1.4 }));
  starMesh.position.set(0.95, 1.12, 0);
  g.add(starMesh);
  g.rotation.set(0.12, -0.5, 0);
  return g;
}

/** Arbre du verger : tronc noueux, feuillage en boules, pièces en guise de fruits, butte d'herbe. */
function orchardTree() {
  const g = new THREE.Group();
  const n = makeNoise(17);
  const bark = new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.9 });
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.8, 0), new THREE.Vector3(0.05, -0.3, 0), new THREE.Vector3(-0.06, 0.1, 0.02), new THREE.Vector3(0.02, 0.4, 0)]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 32, 0.11, 16), bark);
  g.add(trunk);
  for (const [x, y, z, s] of [[-0.3, 0.35, 0.05, 0.06], [0.28, 0.42, -0.05, 0.05]]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.6, s, 0.45, 10), bark);
    branch.position.set(x / 2, y, z);
    branch.rotation.z = x > 0 ? -0.9 : 0.9;
    g.add(branch);
  }
  // Feuillage : sphères déformées au bruit, trois verts.
  const greens = [0x3f7a2c, 0x346b26, 0x4f8c34];
  const blobs = [[0, 0.78, 0, 0.5], [-0.42, 0.62, 0.05, 0.36], [0.42, 0.66, -0.02, 0.38], [-0.16, 1.05, -0.05, 0.34], [0.2, 1.02, 0.08, 0.32], [0.02, 0.6, 0.35, 0.3]];
  blobs.forEach(([x, y, z, r], i) => {
    const geo = new THREE.IcosahedronGeometry(r, 6);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k));
      const d = 1 + n.fbm(v.x * 3 + i, v.y * 3, 3) * 0.12;
      p.setXYZ(k, v.x * d, v.y * d, v.z * d);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: greens[i % 3], roughness: 0.85, sheen: 0.25, sheenColor: new THREE.Color(0xb8d890) }));
    m.position.set(x, y, z);
    g.add(m);
  });
  // Les fruits sont des pièces : ce qui pousse avec le temps (dans le jeu, en unités école).
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0b848, metalness: 1, roughness: 0.22, clearcoat: 0.35 });
  // Devant le feuillage (surface des boules), pour qu'on voie les fruits.
  const fruits = [[-0.36, 0.52, 0.42], [0.38, 0.6, 0.42], [0.04, 0.5, 0.66], [-0.14, 0.98, 0.4], [0.28, 0.92, 0.42], [-0.62, 0.7, 0.18]];
  g.add(
    scatterCoins({
      count: fruits.length,
      material: gold,
      radius: 0.1,
      seed: 3,
      place: (i) => ({ position: new THREE.Vector3(...fruits[i]), normal: new THREE.Vector3(fruits[i][0] * 0.6, 0.3, 1) }),
    })
  );
  // Butte d'herbe et deux pièces tombées.
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4f7f33, roughness: 0.95 }));
  mound.scale.y = 0.28;
  mound.position.y = -0.82;
  g.add(mound);
  g.add(
    scatterCoins({
      count: 2,
      material: gold,
      radius: 0.09,
      seed: 8,
      place: (i) => ({ position: new THREE.Vector3(i ? 0.42 : -0.35, -0.72, 0.3), normal: new THREE.Vector3(0.1, 1, 0.2) }),
    })
  );
  g.rotation.set(0.1, -0.35, 0);
  return g;
}

/** Étagère de la bibliothèque : cadre de planches, deux rayons de livres reliés, un parchemin. */
function bookshelf() {
  const g = new THREE.Group();
  const frame = wood(21, [150, 92, 52], [72, 40, 20]);
  const ham = hammeredMetal({ size: 256, seed: 7 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  g.add(box(1.5, 0.08, 0.5, 0.02, frame, [0, 0.84, 0]));
  g.add(box(1.5, 0.08, 0.5, 0.02, frame, [0, -0.84, 0]));
  g.add(box(1.4, 0.06, 0.46, 0.02, frame, [0, 0, 0]));
  for (const x of [-0.72, 0.72]) g.add(box(0.08, 1.76, 0.5, 0.02, frame, [x, 0, 0]));
  g.add(box(1.46, 1.7, 0.04, 0.01, frame, [0, 0, -0.23]));
  const colors = [0x8d2f2a, 0x2d5a86, 0x2d7254, 0xb07a2a, 0x5b3a78, 0x9c4a2e, 0x234a6b, 0x6d7c35];
  const shelf = (y, seed) => {
    let x = -0.62;
    let i = seed;
    while (x < 0.55) {
      const w = 0.09 + ((i * 37) % 5) * 0.012;
      const h = 0.52 + ((i * 53) % 4) * 0.05;
      const tilt = i % 7 === 3 ? -0.18 : 0;
      const mat = new THREE.MeshPhysicalMaterial({ color: colors[i % colors.length], roughness: 0.55, clearcoat: 0.25 });
      const book = box(w, h, 0.36, 0.015, mat, [x + w / 2 + (tilt ? 0.04 : 0), y + h / 2, 0.02], [0, 0, tilt]);
      g.add(book);
      for (const band of [0.12, -0.12]) g.add(box(w + 0.004, 0.025, 0.365, 0.005, gold, [x + w / 2 + (tilt ? 0.04 : 0), y + h / 2 + band * h, 0.02], [0, 0, tilt]));
      x += w + 0.012;
      i++;
    }
  };
  shelf(0.03, 1);
  shelf(-0.8, 4);
  g.rotation.set(0.08, 0.35, 0);
  return g;
}

const BUILDERS = { telescope, "orchard-tree": orchardTree, bookshelf };

export async function render(canvas, params) {
  const { width, height, object = "telescope", exposure = 1.1, mood = "golden" } = params;
  const stage = createStage(canvas, { width, height, fov: 28, exposure, mood });
  const model = BUILDERS[object]();
  stage.scene.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y) * 0.62;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(14));
  stage.camera.position.set(center.x, center.y + dist * 0.12, center.z + dist);
  stage.camera.lookAt(center);
  await stage.done();
}
