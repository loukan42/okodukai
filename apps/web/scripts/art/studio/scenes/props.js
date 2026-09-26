// Objets de la boucle produit, même plateau et même lumière que la pièce et le coffre :
//   quest-scroll (gagner) · coin-pouch (dépenser) · hourglass (attendre) · coin-sprout (investir)
// Paramètre `object` pour choisir l'objet. Aucun texte dans les images.
import * as THREE from "three";
import { createStage, goldMaterial } from "../lib/stage.js";
import { hammeredMetal, woodPlanks } from "../lib/textures.js";
import { makeNoise } from "../lib/noise.js";
import { scatterCoins, coinGeometry } from "../lib/coins.js";

function canvasTexture(size, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Parchemin : fibres, taches d'âge, bords brunis. */
function parchmentTexture(seed = 3) {
  const n = makeNoise(seed);
  return canvasTexture(1024, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / s, v = y / s;
        const f = n.fbm(u * 6, v * 6, 5) * 0.5 + 0.5;
        const fib = n.fbm(u * 140, v * 12, 2) * 0.5 + 0.5;
        const edge = Math.min(u, 1 - u, v, 1 - v);
        const burn = Math.max(0, 1 - edge / 0.07) ** 2;
        const k = 0.9 + f * 0.12 + fib * 0.05 - burn * 0.35;
        const i = (y * s + x) * 4;
        img.data[i] = 240 * k;
        img.data[i + 1] = 222 * k - burn * 20;
        img.data[i + 2] = 180 * k - burn * 36;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Tracé de carte au trait (chemin pointillé, sommets, croix d'arrivée), sans texte.
    ctx.strokeStyle = "rgba(92, 58, 30, 0.55)";
    ctx.lineWidth = 7;
    ctx.setLineDash([22, 18]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.78);
    ctx.bezierCurveTo(s * 0.35, s * 0.5, s * 0.55, s * 0.9, s * 0.62, s * 0.55);
    ctx.bezierCurveTo(s * 0.68, s * 0.3, s * 0.8, s * 0.36, s * 0.8, s * 0.24);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 9;
    ctx.strokeStyle = "rgba(170, 52, 34, 0.8)";
    const X = s * 0.8, Y = s * 0.22, r = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(X - r, Y - r);
    ctx.lineTo(X + r, Y + r);
    ctx.moveTo(X + r, Y - r);
    ctx.lineTo(X - r, Y + r);
    ctx.stroke();
    ctx.strokeStyle = "rgba(92, 58, 30, 0.5)";
    ctx.lineWidth = 6;
    for (const [mx, my, w] of [[0.2, 0.32, 0.1], [0.32, 0.26, 0.08], [0.45, 0.34, 0.07]]) {
      ctx.beginPath();
      ctx.moveTo(s * (mx - w), s * (my + 0.05));
      ctx.lineTo(s * mx, s * (my - 0.05));
      ctx.lineTo(s * (mx + w), s * (my + 0.05));
      ctx.stroke();
    }
  });
}

function questScroll() {
  const g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ map: parchmentTexture(), roughness: 0.85, side: THREE.DoubleSide });
  // Feuille déroulée, légèrement ondulée, avec un rouleau à chaque extrémité.
  const W = 1.5, H = 1.9;
  const sheet = new THREE.PlaneGeometry(W, H, 40, 40);
  const p = sheet.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin(y * 2.2) * 0.04 + Math.sin(x * 3.1 + 1) * 0.02);
  }
  sheet.computeVertexNormals();
  const sheetMesh = new THREE.Mesh(sheet, paper);
  g.add(sheetMesh);
  const rollMat = new THREE.MeshStandardMaterial({ map: parchmentTexture(8), roughness: 0.8 });
  for (const [y, r] of [[H / 2, 0.13], [-H / 2, 0.11]]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(r, r, W + 0.06, 40), rollMat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, y, 0.06);
    g.add(roll);
    // Embouts de bois tourné.
    const planks = woodPlanks({ size: 256, planks: 2, seed: 4, light: [150, 88, 48], dark: [70, 36, 20] });
    const wood = new THREE.MeshStandardMaterial({ map: planks.map, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 24, 16), wood);
      knob.scale.set(0.7, 1, 1);
      knob.position.set(sx * (W / 2 + 0.07), y, 0.06);
      g.add(knob);
    }
  }
  // Sceau de cire rouge frappé de la pièce (trou carré).
  const wax = new THREE.MeshPhysicalMaterial({ color: 0xb3261e, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const blob = new THREE.Shape();
  const n = makeNoise(12);
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 0.27 + n.noise2(Math.cos(a) * 2, Math.sin(a) * 2) * 0.04;
    if (i === 0) blob.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else blob.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const seal = new THREE.Mesh(new THREE.ExtrudeGeometry(blob, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4 }), wax);
  seal.position.set(0.38, -0.55, 0.05);
  g.add(seal);
  const emblem = new THREE.Mesh(coinGeometry({ segments: 40 }), wax);
  emblem.scale.setScalar(0.15);
  emblem.position.set(0.38, -0.55, 0.14);
  g.add(emblem);
  // Ruban qui pend du sceau.
  const ribbon = new THREE.MeshStandardMaterial({ color: 0x8e1f1a, roughness: 0.55, side: THREE.DoubleSide });
  for (const [dx, rot] of [[-0.08, 0.18], [0.1, -0.12]]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.55), ribbon);
    r.position.set(0.38 + dx, -0.85, 0.03);
    r.rotation.z = rot;
    g.add(r);
  }
  g.rotation.set(-0.35, 0.35, -0.12);
  return g;
}

function coinPouch() {
  const g = new THREE.Group();
  const n = makeNoise(21);
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  // Bourse en cuir : panse ronde, col serré, collerette évasée (un seul profil tourné).
  const NECK = 0.74;
  const profile = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const y = -0.9 + t * 1.62;
    let r;
    if (t < NECK) r = 0.08 + Math.pow(Math.sin((Math.PI * t) / NECK), 0.85) * 0.86 * (1 - 0.25 * t);
    else r = 0.16 + Math.pow((t - NECK) / (1 - NECK), 0.7) * 0.36;
    profile.push(new THREE.Vector2(Math.max(0.03, r), y));
  }
  const neckY = -0.9 + NECK * 1.62;
  const geo = new THREE.LatheGeometry(profile, 128);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    // Fronces : plis verticaux qui convergent vers le lien, plus un bruit de cuir souple.
    const gather = smooth(neckY - 0.55, neckY, v.y) * (1 - smooth(neckY, neckY + 0.12, v.y) * 0.6);
    const fold = 1 + Math.sin(a * 11 + n.noise2(a, v.y * 3) * 2) * 0.07 * gather + n.fbm(a * 1.3, v.y * 2.2, 3) * 0.05;
    const sag = v.y < -0.4 ? 1 + (v.y + 0.4) * 0.08 : 1;
    p.setXYZ(i, v.x * fold * sag, v.y, v.z * fold * sag);
  }
  geo.computeVertexNormals();
  const grain = canvasTexture(512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const f = n.fbm(x / 22, y / 22, 4) * 0.5 + 0.5;
        const pebble = n.fbm(x / 3.5, y / 3.5, 2) * 0.5 + 0.5;
        const i = (y * s + x) * 4;
        const k = 0.8 + f * 0.3 + pebble * 0.08;
        img.data[i] = 128 * k;
        img.data[i + 1] = 68 * k;
        img.data[i + 2] = 36 * k;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 2);
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x8a5a40, map: grain, bumpMap: grain, bumpScale: 1.5, roughness: 0.66, clearcoat: 0.18, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xffb870), side: THREE.DoubleSide });
  g.add(new THREE.Mesh(geo, leather));
  // Lien doré au col, deux bouts qui pendent.
  const cord = new THREE.MeshPhysicalMaterial({ color: 0xe6ad40, metalness: 0.7, roughness: 0.32 });
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 16, 64), cord);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = neckY;
  g.add(tie);
  for (const [dx, bend] of [[0.05, 0.35], [0.14, -0.1]]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, neckY, 0.14), new THREE.Vector3(0.22 + dx, neckY - 0.18, 0.22), new THREE.Vector3(0.26 + dx + bend * 0.2, neckY - 0.42, 0.2)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 10), cord));
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), cord);
    knot.position.copy(curve.getPoint(1));
    g.add(knot);
  }
  // Pièces qui débordent de la collerette et quelques-unes posées devant.
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0b848, metalness: 1, roughness: 0.24, clearcoat: 0.3 });
  g.add(
    scatterCoins({
      count: 6,
      material: gold,
      radius: 0.14,
      seed: 3,
      place: (i, r) => ({ position: new THREE.Vector3((r() - 0.5) * 0.4, neckY + 0.3 + r() * 0.1, (r() - 0.3) * 0.34), normal: new THREE.Vector3((r() - 0.5) * 1.2, 1, 0.3 + r() * 0.9), scale: 1.1 }),
    })
  );
  g.add(
    scatterCoins({
      count: 4,
      material: gold,
      radius: 0.15,
      seed: 5,
      place: (i) => [
        { position: new THREE.Vector3(0.82, -0.88, 0.45), normal: new THREE.Vector3(0.1, 1, 0.1) },
        { position: new THREE.Vector3(0.83, -0.83, 0.46), normal: new THREE.Vector3(-0.1, 1, 0.15) },
        { position: new THREE.Vector3(0.84, -0.78, 0.45), normal: new THREE.Vector3(0.05, 1, -0.1) },
        { position: new THREE.Vector3(0.55, -0.74, 0.78), normal: new THREE.Vector3(0.5, 0.5, 1) },
      ][i],
    })
  );
  g.rotation.set(0.14, -0.5, 0.04);
  return g;
}

function hourglass() {
  const g = new THREE.Group();
  const ham = hammeredMetal({ size: 512, seed: 6, dents: 12, scratches: 20 });
  const gold = goldMaterial({ normalMap: ham.normal, roughnessMap: ham.roughness });
  const planks = woodPlanks({ size: 512, planks: 3, seed: 9, light: [150, 86, 46], dark: [66, 32, 18] });
  const wood = new THREE.MeshStandardMaterial({ map: planks.map, normalMap: planks.normal, roughness: 0.55 });
  // Plateaux haut et bas, colonnes torsadées.
  for (const y of [-1.05, 1.05]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.16, 64), wood);
    plate.position.y = y;
    g.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 12, 96), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y + (y > 0 ? 0.085 : -0.085);
    g.add(rim);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.0, 16), gold);
    col.position.set(Math.cos(a) * 0.64, 0, Math.sin(a) * 0.64);
    g.add(col);
    for (const y of [-0.6, 0, 0.6]) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), gold);
      knot.position.set(Math.cos(a) * 0.64, y, Math.sin(a) * 0.64);
      g.add(knot);
    }
  }
  // Verre : deux ampoules tournées, matière transmissive.
  const glassProfile = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const y = -0.95 + t * 1.9;
    const r = 0.06 + Math.pow(Math.abs(y) / 0.95, 0.8) * 0.5 * (1 - Math.pow(Math.abs(y) / 0.95, 6) * 0.5);
    glassProfile.push(new THREE.Vector2(r, y));
  }
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(glassProfile, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.2, ior: 1.45, transparent: true, opacity: 1, side: THREE.DoubleSide, envMapIntensity: 1.2 })
  );
  g.add(glass);
  // Sable doré : tas en bas, reste en haut, filet au centre.
  const sand = new THREE.MeshStandardMaterial({ color: 0xf2c46a, roughness: 0.9, emissive: 0x6b3e10, emissiveIntensity: 0.15 });
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.34, 48), sand);
  bottom.position.y = -0.74;
  g.add(bottom);
  const topSand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.36, 0.3, 48), sand);
  topSand.position.y = 0.3;
  g.add(topSand);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), sand);
  stream.position.y = -0.2;
  g.add(stream);
  g.rotation.set(0.28, 0.4, -0.08);
  return g;
}

function coinSprout() {
  const g = new THREE.Group();
  const n = makeNoise(31);
  // Pot de terre cuite.
  const clay = canvasTexture(512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const f = n.fbm(x / 30, y / 30, 4) * 0.5 + 0.5;
        const i = (y * s + x) * 4;
        img.data[i] = 186 + f * 30;
        img.data[i + 1] = 98 + f * 20;
        img.data[i + 2] = 60 + f * 12;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const potMat = new THREE.MeshStandardMaterial({ map: clay, roughness: 0.85 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.46, 0.8, 64), potMat);
  pot.position.y = -0.7;
  g.add(pot);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.08, 16, 64), potMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.3;
  g.add(lip);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = -0.34;
  g.add(soil);
  // Tige courbe et feuilles charnues.
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.34, 0), new THREE.Vector3(0.05, 0.1, 0.02), new THREE.Vector3(-0.06, 0.5, 0), new THREE.Vector3(0.02, 0.9, 0.03)]);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f7f34, roughness: 0.6 });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 12), stemMat));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.2, 0.08, 0.34, 0.24, 0.5, 0.02);
  leafShape.bezierCurveTo(0.32, -0.16, 0.14, -0.1, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 24 });
  const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x6fa844, roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color(0xd8f0a0) });
  for (const [y, side, rot, s] of [[0.05, 1, 0.3, 1], [0.35, -1, -0.2, 0.9], [0.62, 1, 0.5, 0.75], [0.82, -1, -0.4, 0.6]]) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.setScalar(s);
    leaf.position.set(0, y, 0);
    leaf.rotation.set(0.3, side > 0 ? 0 : Math.PI, rot);
    g.add(leaf);
  }
  // Les fruits de l'arbre sont des pièces : l'intérêt qui pousse avec le temps.
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0b848, metalness: 1, roughness: 0.22, clearcoat: 0.35 });
  g.add(
    scatterCoins({
      count: 3,
      material: gold,
      radius: 0.17,
      seed: 7,
      place: (i) => [
        { position: new THREE.Vector3(0.36, 0.28, 0.12), normal: new THREE.Vector3(0.2, 0.75, 1), spin: 0.3 },
        { position: new THREE.Vector3(-0.38, 0.58, 0.1), normal: new THREE.Vector3(0.35, 0.9, 1), spin: 1.2 },
        { position: new THREE.Vector3(0.08, 1.02, 0.1), normal: new THREE.Vector3(0, 0.9, 1), spin: 2.1 },
      ][i],
    })
  );
  g.rotation.set(0.18, -0.3, 0);
  return g;
}

const BUILDERS = { "quest-scroll": questScroll, "coin-pouch": coinPouch, hourglass, "coin-sprout": coinSprout };

export async function render(canvas, params) {
  const { width, height, object = "quest-scroll", exposure = 1.1, mood = "golden" } = params;
  const stage = createStage(canvas, { width, height, fov: 28, exposure, mood });
  const model = BUILDERS[object]();
  stage.scene.add(model);
  // Cadrage automatique : l'objet remplit ~80 % du cadre.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y) * 0.62;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(14));
  stage.camera.position.set(center.x, center.y + dist * 0.12, center.z + dist);
  stage.camera.lookAt(center);
  await stage.done();
}
