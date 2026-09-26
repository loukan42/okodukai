// Sons de l'invocation, synthétisés avec Web Audio (aucun fichier à charger). Le contexte audio
// n'est créé qu'après un geste de l'enfant (règle des navigateurs). Coupure mémorisée par appareil.
import type { CardRarity } from "@okodukai/shared";

const STORAGE_KEY = "okodukai:sons-booster";
let context: AudioContext | null = null;
let master: GainNode | null = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* stockage indisponible : le réglage vaut pour cette ouverture seulement */
  }
  if (!enabled) void context?.suspend();
  else void context?.resume();
}

function audio() {
  if (!soundEnabled()) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.32;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

function tone(freq: number, start: number, duration: number, { type = "sine" as OscillatorType, gain = 0.4, glide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), t + duration);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env).connect(a.out);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noise(start: number, duration: number, { from = 800, to = 4000, gain = 0.3, q = 0.8 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const buffer = a.ctx.createBuffer(1, Math.ceil(a.ctx.sampleRate * duration), a.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = a.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = a.ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + duration);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + duration * 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(env).connect(a.out);
  source.start(t);
}

// Gamme pentatonique de do : toujours consonante, quel que soit l'enchaînement.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export const sfx = {
  summon() {
    noise(0, 1.2, { from: 300, to: 2400, gain: 0.18 });
    tone(110, 0, 1.3, { type: "triangle", gain: 0.12, glide: 110 });
  },
  hit(index: number) {
    const base = [1046.5, 1318.51, 1567.98][Math.min(2, index)];
    tone(base, 0, 0.5, { gain: 0.3 });
    tone(base * 2.01, 0, 0.25, { gain: 0.08 });
    noise(0, 0.09, { from: 5000, to: 9000, gain: 0.12, q: 2 });
  },
  shatter() {
    noise(0, 0.8, { from: 7000, to: 900, gain: 0.35, q: 0.6 });
    tone(1568, 0, 0.6, { type: "triangle", gain: 0.12, glide: -900 });
    tone(65, 0.02, 0.9, { gain: 0.35, glide: -25 });
  },
  announce(rarity: CardRarity) {
    tone(55, 0, 1.4, { gain: 0.35, glide: -10 });
    const notes = rarity === "LEGENDAIRE" ? [0, 2, 4, 5, 7, 9] : [0, 2, 4, 7];
    notes.forEach((n, i) => tone(PENTA[n], 0.25 + i * 0.09, 1.1, { type: "triangle", gain: 0.12 }));
  },
  flip(rarity: CardRarity) {
    const rank = { COMMUNE: 0, PEU_COMMUNE: 1, RARE: 2, EPIQUE: 3, LEGENDAIRE: 4 }[rarity];
    noise(0, 0.22, { from: 1200, to: 5000, gain: 0.1 });
    const steps = 2 + rank;
    for (let i = 0; i < steps; i++) tone(PENTA[i * 2 > 9 ? 9 : i * 2], 0.04 + i * 0.07, 0.7 + rank * 0.15, { type: rank >= 3 ? "triangle" : "sine", gain: 0.16 });
    if (rank >= 3) [PENTA[0], PENTA[2], PENTA[4]].forEach((f) => tone(f / 2, 0.1, 1.8, { gain: 0.07 }));
  },
  tick() {
    tone(1318.51, 0, 0.12, { gain: 0.08 });
  },
};
