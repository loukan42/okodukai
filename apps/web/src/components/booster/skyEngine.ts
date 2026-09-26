// Ciel de l'invocation : étoiles (scintillement puis traînées de vitesse) et gerbes d'éclats, sur un
// seul canvas plein écran. Les halos sont pré-rendus une fois par couleur (pas de shadowBlur à chaque
// image, trop coûteux sur mobile) et composés en mode additif.

export interface BurstOptions {
  x: number;
  y: number;
  colors: string[];
  count: number;
  /** Vitesse de départ en px/s. */
  speed?: number;
  /** Accélération verticale en px/s² (positive : les éclats retombent). */
  gravity?: number;
  /** Durée de vie moyenne en secondes. */
  life?: number;
  size?: number;
  /** Angle et ouverture (radians) ; par défaut, dans toutes les directions. */
  angle?: number;
  spread?: number;
  kind?: "spark" | "shard" | "dot";
}

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  twinkle: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  rotation: number;
  spin: number;
  sprite: HTMLCanvasElement;
  kind: "spark" | "shard" | "dot";
}

export interface SkyEngine {
  /** 0 : ciel calme ; 1 : pleine vitesse (traînées). Transition douce. */
  setWarp(target: number): void;
  burst(options: BurstOptions): void;
  resize(): void;
  destroy(): void;
}

const MAX_PARTICLES = 700;

function glowSprite(color: string, size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.45, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function createSkyEngine(canvas: HTMLCanvasElement): SkyEngine {
  const ctx = canvas.getContext("2d")!;
  const sprites = new Map<string, HTMLCanvasElement>();
  const spriteFor = (color: string) => {
    let sprite = sprites.get(color);
    if (!sprite) {
      sprite = glowSprite(color);
      sprites.set(color, sprite);
    }
    return sprite;
  };
  const starSprite = glowSprite("#dfe9ff", 32);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];
  let particles: Particle[] = [];
  let warp = 0;
  let warpTarget = 0;
  let frame = 0;
  let last = performance.now();

  function makeStar(): Star {
    return { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() * 0.9 + 0.1, px: NaN, py: NaN, twinkle: Math.random() * Math.PI * 2, size: Math.random() * 1.3 + 0.4 };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(260, Math.round((width * height) / 4200));
    stars = Array.from({ length: count }, makeStar);
  }

  function drawStars(dt: number) {
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.max(width, height) * 0.62;
    const speed = 0.06 + warp * 1.9;
    ctx.lineCap = "round";
    for (const star of stars) {
      star.z -= speed * dt * (0.4 + warp);
      star.twinkle += dt * (1.5 + star.size);
      if (star.z <= 0.02) {
        Object.assign(star, makeStar(), { z: 1 });
        continue;
      }
      const sx = cx + (star.x / star.z) * scale * 0.5;
      const sy = cy + (star.y / star.z) * scale * 0.5;
      if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
        Object.assign(star, makeStar(), { z: 1 });
        continue;
      }
      const depth = 1 - star.z;
      const alpha = Math.min(1, 0.25 + depth * 0.9) * (0.75 + Math.sin(star.twinkle) * 0.25);
      if (warp > 0.08 && !Number.isNaN(star.px)) {
        ctx.strokeStyle = `rgba(214,229,255,${(alpha * Math.min(1, warp * 1.4)).toFixed(3)})`;
        ctx.lineWidth = star.size * (0.6 + depth * 1.6);
        ctx.beginPath();
        ctx.moveTo(star.px, star.py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      const size = star.size * (1.5 + depth * 4.5);
      ctx.globalAlpha = alpha;
      ctx.drawImage(starSprite, sx - size, sy - size, size * 2, size * 2);
      ctx.globalAlpha = 1;
      star.px = sx;
      star.py = sy;
    }
  }

  function drawParticles(dt: number) {
    const alive: Particle[] = [];
    for (const p of particles) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vx *= 1 - 1.6 * dt;
      p.vy = p.vy * (1 - 1.6 * dt) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      const t = p.age / p.life;
      const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      ctx.globalAlpha = Math.max(0, alpha);
      if (p.kind === "shard") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(p.sprite, -p.size * 1.6, -p.size * 0.5, p.size * 3.2, p.size);
        ctx.restore();
      } else if (p.kind === "spark") {
        // Étoile à quatre branches : deux halos étirés en croix + un cœur.
        const s = p.size * (1 - t * 0.35);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(p.sprite, -s * 2.4, -s * 0.35, s * 4.8, s * 0.7);
        ctx.drawImage(p.sprite, -s * 0.35, -s * 2.4, s * 0.7, s * 4.8);
        ctx.drawImage(p.sprite, -s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        const s = p.size;
        ctx.drawImage(p.sprite, p.x - s, p.y - s, s * 2, s * 2);
      }
      alive.push(p);
    }
    ctx.globalAlpha = 1;
    particles = alive;
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    warp += (warpTarget - warp) * Math.min(1, dt * 3.2);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    drawStars(dt);
    drawParticles(dt);
    ctx.globalCompositeOperation = "source-over";
    frame = requestAnimationFrame(tick);
  }

  resize();
  frame = requestAnimationFrame(tick);

  return {
    setWarp(target) {
      warpTarget = Math.max(0, Math.min(1, target));
    },
    burst(options) {
      const { x, y, colors, count, speed = 420, gravity = 0, life = 1.1, size = 7, angle = 0, spread = Math.PI * 2, kind = "spark" } = options;
      const room = Math.max(0, MAX_PARTICLES - particles.length);
      for (let i = 0; i < Math.min(count, room); i++) {
        const direction = angle + (Math.random() - 0.5) * spread;
        const velocity = speed * (0.35 + Math.random() * 0.75);
        particles.push({
          x,
          y,
          vx: Math.cos(direction) * velocity,
          vy: Math.sin(direction) * velocity,
          gravity,
          age: 0,
          life: life * (0.6 + Math.random() * 0.7),
          size: size * (0.5 + Math.random() * 0.8),
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 6,
          sprite: spriteFor(colors[i % colors.length]),
          kind,
        });
      }
    },
    resize,
    destroy() {
      cancelAnimationFrame(frame);
      particles = [];
    },
  };
}
