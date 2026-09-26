// La Vallée d'Okodukai en 3D : rivière sinueuse, collines dorées, bosquets, montagnes
// dans la brume. Deux ambiances (bible « Mix A + B ») : `golden` (heure dorée, soleil
// en haut à gauche hors champ) et `dusk` (crépuscule, lanternes le long de la rivière).
// Rendu en fond plein cadre, sans texte ; le haut de l'image reste calme pour le titre.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { makeNoise } from "../lib/noise.js";

const MOODS = {
  golden: {
    skyTop: 0x4f8ad0, skyMid: 0xf2d0a0, horizon: 0xffe2b0, sun: 0xfff1d0,
    fog: 0xf2dcbc, fogDensity: 0.0012, haze: 0x8ea2d8,
    sunDir: [-0.82, 0.36, -0.44], sunColor: 0xffd29a, sunIntensity: 3.6,
    hemiSky: 0xffe2bc, hemiGround: 0x4a4a78, hemi: 0.62,
    grass: [0x86a24c, 0xc2a95a, 0x5f8440], rock: 0xb08c6c, sand: 0xd9c08c,
    water: 0x6f98a8, exposure: 1.0, lanterns: false,
  },
  dusk: {
    skyTop: 0x1d2a55, skyMid: 0x6b5f93, horizon: 0xf29a64, sun: 0xffb27a,
    fog: 0x7a6488, fogDensity: 0.0024, haze: 0x6a5f96,
    sunDir: [-0.8, 0.08, -0.6], sunColor: 0xff9a64, sunIntensity: 1.6,
    hemiSky: 0x8a86c0, hemiGround: 0x2a2038, hemi: 0.9,
    grass: [0x4a6048, 0x6a6a52, 0x3a5040], rock: 0x6a6070, sand: 0x9a8a80,
    water: 0x3a4a78, exposure: 1.05, lanterns: true,
  },
};

const riverX = (z) => 14 * Math.sin(z * 0.013 + 0.6) + 6 * Math.sin(z * 0.031);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function terrainHeight(n, x, z) {
  const d = Math.abs(x - riverX(z));
  const valley = smooth(4, 70, d) * 16 - 2.2 * (1 - smooth(3, 12, d));
  const hills = n.fbm(x * 0.018, z * 0.018, 5) * 14 * smooth(6, 40, d);
  const far = smooth(-230, -430, z);
  const ridge = (1 - Math.abs(n.fbm(x * 0.006 + 7, z * 0.006, 5))) ** 3 * 120 * far;
  return valley + hills + ridge;
}

function skyMaterial(mood) {
  const m = MOODS[mood];
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(m.skyTop) },
      mid: { value: new THREE.Color(m.skyMid) },
      horizon: { value: new THREE.Color(m.horizon) },
      sun: { value: new THREE.Color(m.sun) },
      sunDir: { value: new THREE.Vector3(...m.sunDir).normalize() },
      dusk: { value: mood === "dusk" ? 1 : 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, mid, horizon, sun, sunDir; uniform float dusk; varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.06, h));
        col = mix(col, top, smoothstep(0.05, 0.42, h));
        float s = max(dot(d, sunDir), 0.0);
        col += sun * (pow(s, 6.0) * 0.55 + pow(s, 48.0) * 0.8 + pow(s, 900.0) * 6.0);
        // Nuages étirés, éclairés par-dessous côté soleil.
        vec2 uv = d.xz / max(d.y + 0.08, 0.06);
        float c = fbm(uv * vec2(0.55, 1.6) + vec2(3.1, 0.0));
        c = smoothstep(0.6, 0.82, c) * smoothstep(0.015, 0.07, h) * (1.0 - smoothstep(0.3, 0.6, h));
        vec3 cloudShade = mix(top, vec3(0.86, 0.72, 0.78), 0.55) * (0.95 + dusk * 0.2);
        vec3 cloudLit = mix(horizon * 1.05, sun * 1.2, pow(s, 2.0));
        float lit = fbm(uv * vec2(0.55, 1.6) + vec2(3.1 - 0.08, 0.05));
        vec3 cloud = mix(cloudShade, cloudLit, smoothstep(0.45, 0.8, lit + pow(s, 3.0) * 0.4));
        col = mix(col, cloud, c * 0.85);
        if (dusk > 0.5) {
          float star = step(0.9985, hash(floor(d.xz / (d.y + 0.2) * 220.0))) * smoothstep(0.25, 0.6, h);
          col += vec3(star) * 0.9;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function canopyGeometry(n) {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.IcosahedronGeometry(1, 4);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const bump = 1 + n.fbm(v.x * 1.8 + k * 5, v.y * 1.8 + v.z * 1.3, 3) * 0.35;
      v.multiplyScalar(bump);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.scale(1 - k * 0.18, 0.85 - k * 0.1, 1 - k * 0.18);
    g.translate([0, 0.55, -0.5][k] * 0.8, [0, 0.55, 0.25][k], [0, 0.3, -0.2][k]);
    parts.push(g);
  }
  const g = mergeGeometries(parts.map((p) => mergeVertices(p)), false);
  g.computeVertexNormals();
  // Occlusion peinte : dessous du feuillage plus sombre.
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = smooth(-0.9, 1.1, p.getY(i));
    col.set([0.55 + 0.45 * t, 0.55 + 0.45 * t, 0.6 + 0.4 * t], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function buildTerrain(n, mood, { size, seg, center = [0, 0], tint }) {
  const m = MOODS[mood];
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  g.translate(center[0], 0, center[1]);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(n, p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const grassA = new THREE.Color(m.grass[0]), grassB = new THREE.Color(m.grass[1]), grassC = new THREE.Color(m.grass[2]);
  const rock = new THREE.Color(m.rock), sand = new THREE.Color(m.sand);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const slope = 1 - nrm.getY(i);
    const v = n.fbm(x * 0.03 + 11, z * 0.03, 4) * 0.5 + 0.5;
    c.copy(grassA).lerp(grassB, smooth(0.35, 0.75, v)).lerp(grassC, smooth(0.6, 0.9, n.fbm(x * 0.07, z * 0.07 + 4, 3) + 0.5) * 0.6);
    c.lerp(rock, smooth(0.18, 0.42, slope));
    c.lerp(rock.clone().multiplyScalar(1.1), smooth(40, 110, y));
    c.lerp(sand, 1 - smooth(0.1, 1.4, y));
    // Perspective atmosphérique : le lointain bleuit avant de se fondre dans la brume.
    c.lerp(new THREE.Color(m.haze), smooth(140, 620, 70 - z) * 0.5);
    if (tint) c.multiply(tint);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function forest(n, mood, count, seed) {
  const m = MOODS[mood];
  const canopy = canopyGeometry(n);
  const trunk = new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6);
  trunk.translate(0, -0.9, 0);
  const leaves = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3e2a, roughness: 1 });
  const crowns = new THREE.InstancedMesh(canopy, leaves, count);
  const trunks = new THREE.InstancedMesh(trunk, bark, count);
  const r = makeNoise(seed).rand;
  const palette = mood === "dusk" ? [0x3e5a44, 0x4d5e3c, 0x5a4e46, 0x34503e] : [0x6e9a3e, 0x8fae4a, 0xc9a24a, 0x5a8a3c, 0xd08a3c, 0x7c9e44];
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 40) {
    const z = 18 - r() * 250;
    const x = riverX(z) + (r() * 2 - 1) * (40 + (40 - z) * 0.55);
    const d = Math.abs(x - riverX(z));
    if (d < 7) continue;
    const y = terrainHeight(n, x, z);
    if (y < 0.8 || y > 38) continue;
    const e = 0.8;
    const slope = Math.hypot(terrainHeight(n, x + e, z) - y, terrainHeight(n, x, z + e) - y) / e;
    if (slope > 0.9) continue;
    // Bosquets : densité modulée par un bruit basse fréquence.
    if (n.fbm(x * 0.025 + 3, z * 0.025, 3) < -0.02 + r() * 0.1) continue;
    const k = 1.6 + r() * 1.6;
    const tall = r() < 0.25;
    s.set(k, k * (tall ? 1.7 : 1), k);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
    pos.set(x, y + k * (tall ? 1.55 : 1.05), z);
    mat.compose(pos, q, s);
    crowns.setMatrixAt(placed, mat);
    crowns.setColorAt(placed, new THREE.Color(palette[Math.floor(r() * palette.length)]).multiplyScalar(0.9 + r() * 0.2));
    s.set(k, k, k);
    pos.set(x, y + k * 1.05, z);
    mat.compose(pos, q, s);
    trunks.setMatrixAt(placed, mat);
    placed++;
  }
  crowns.count = trunks.count = placed;
  crowns.castShadow = trunks.castShadow = true;
  crowns.receiveShadow = true;
  return [crowns, trunks];
}

function lanterns(n, count, seed) {
  const r = makeNoise(seed).rand;
  const g = new THREE.Group();
  const bulb = new THREE.SphereGeometry(0.22, 12, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(3) });
  for (let i = 0; i < count; i++) {
    const z = 30 - r() * 200;
    const side = r() < 0.5 ? -1 : 1;
    const x = riverX(z) + side * (7 + r() * 5);
    const y = terrainHeight(n, x, z);
    const l = new THREE.Mesh(bulb, mat);
    l.position.set(x, y + 1.6, z);
    g.add(l);
    if (i % 3 === 0) {
      const p = new THREE.PointLight(0xffa860, 12, 16, 2);
      p.position.copy(l.position);
      g.add(p);
    }
  }
  return g;
}

// Vignettage et léger grain de pellicule, appliqués après le bloom.
const Finish = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.32 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1.0 - dot(d, d) * strength * 2.2;
      c.rgb *= v; c.rgb += (hash(vUv * 1000.0) - 0.5) * 0.018; gl_FragColor = c; }`,
};

export async function render(canvas, params) {
  const { width, height, mood = "golden", seed = 4, camera = [0, 26, 70], target = [-5, 14, -150], fov = 38, trees = 1400 } = params;
  const m = MOODS[mood];
  const n = makeNoise(seed);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = m.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(m.fog, m.fogDensity);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), skyMaterial(mood));
  sky.material.fog = false;
  scene.add(sky);

  // Reflets de l'eau : environnement tiré du ciel lui-même.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(mood)));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;

  const sunDir = new THREE.Vector3(...m.sunDir).normalize();
  const sun = new THREE.DirectionalLight(m.sunColor, m.sunIntensity);
  sun.position.copy(sunDir).multiplyScalar(200);
  sun.target.position.set(0, 0, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 600 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(m.hemiSky, m.hemiGround, m.hemi));

  scene.add(buildTerrain(n, mood, { size: 420, seg: 360, center: [0, -150] }));
  scene.add(buildTerrain(n, mood, { size: 1400, seg: 260, center: [0, -700] }));
  for (const f of forest(n, mood, trees, seed + 1)) scene.add(f);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshPhysicalMaterial({ color: m.water, roughness: 0.08, metalness: 0.1, envMapIntensity: 1.4 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.35, -400);
  scene.add(water);
  if (m.lanterns) scene.add(lanterns(n, 26, seed + 2));

  const cam = new THREE.PerspectiveCamera(fov, width / height, 0.5, 2000);
  cam.position.set(...camera);
  cam.lookAt(...target);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), mood === "dusk" ? 0.55 : 0.28, 0.6, 0.86));
  composer.addPass(new ShaderPass(Finish));
  composer.addPass(new OutputPass());
  composer.render();
  await new Promise((r) => requestAnimationFrame(() => r()));
}
