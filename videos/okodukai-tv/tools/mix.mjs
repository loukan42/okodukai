// Bande-son du spot Okodukai (30 s) : musique originale 125 BPM (ré majeur), design sonore calé sur
// l'image, voix off placée sur ses fenêtres, ducking, puis masters au loudness diffusion.
//
//   node tools/mix.mjs            → assets/soundtrack.wav (TV, −23 LUFS, TP ≤ −3 dBTP, 48 kHz 24 bits)
//                                   assets/soundtrack-web.wav (web, −14 LUFS, TP ≤ −1 dBTP)
//
// Voix : assets/vo/vo-1..7.(wav|mp3|m4a) si présentes (ElevenLabs), sinon la piste témoin assets/vo-guide/.
// Musique sous licence : déposer assets/music.wav (30 s, calée au temps 0) pour remplacer la synthèse.
// Aucune dépendance npm ; ffmpeg vient de ffmpeg-static (dossier de la v1) ou du PATH.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = (p) => path.join(ROOT, "assets", p);
const SR = 48000, DUR = 30, N = SR * DUR;
const BPM = 125, BEAT = 60 / BPM; // 0,48 s

const FFMPEG = [
  process.env.FFMPEG,
  path.join(ROOT, "node_modules/ffmpeg-static/ffmpeg.exe"),
  path.join(ROOT, "../okodukai-pitch/node_modules/ffmpeg-static/ffmpeg.exe"),
  "ffmpeg",
].find((p) => p && (p === "ffmpeg" || fs.existsSync(p)));
const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-y", ...args], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
const ffErr = (args) => String(spawnSync(FFMPEG, ["-hide_banner", ...args], { maxBuffer: 1 << 28 }).stderr);

// ------------------------------------------------------------------ outils DSP
let seed = 20260928;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const dbg = (db) => 10 ** (db / 20);
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });

function biquad(type, f, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), Ag = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "hs") { const sq = 2 * Math.sqrt(Ag) * al; b0 = Ag * ((Ag + 1) + (Ag - 1) * c + sq); b1 = -2 * Ag * ((Ag - 1) + (Ag + 1) * c); b2 = Ag * ((Ag + 1) + (Ag - 1) * c - sq); a0 = (Ag + 1) - (Ag - 1) * c + sq; a1 = 2 * ((Ag - 1) - (Ag + 1) * c); a2 = (Ag + 1) - (Ag - 1) * c - sq; }
  else if (type === "pk") { b0 = 1 + al * Ag; b1 = -2 * c; b2 = 1 - al * Ag; a0 = 1 + al / Ag; a1 = -2 * c; a2 = 1 - al / Ag; }
  const k = { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  k.run = (x) => { const y = k.b0 * x + k.b1 * k.x1 + k.b2 * k.x2 - k.a1 * k.y1 - k.a2 * k.y2; k.x2 = k.x1; k.x1 = x; k.y2 = k.y1; k.y1 = y; return y; };
  return k;
}
function filt(buf, type, f, q, g) { const k = biquad(type, f, q, g); for (let i = 0; i < buf.length; i++) buf[i] = k.run(buf[i]); return buf; }
// Filtre passe-bande à fréquence glissante (souffles, montées).
function sweepBP(buf, f0, f1, q, curve = 1) {
  let k = biquad("bp", f0, q);
  for (let i = 0; i < buf.length; i++) {
    if (i % 32 === 0) { const p = (i / buf.length) ** curve; const nk = biquad("bp", f0 * (f1 / f0) ** p, q); Object.assign(k, { b0: nk.b0, b1: nk.b1, b2: nk.b2, a1: nk.a1, a2: nk.a2 }); }
    buf[i] = k.run(buf[i]);
  }
  return buf;
}
function put(b, sig, t, gain = 1, pan = 0) {
  const i0 = Math.round(t * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < sig.length; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; b.L[j] += sig[i] * gl; b.R[j] += sig[i] * gr; }
}
const len = (s) => new Float32Array(Math.round(s * SR));

// ------------------------------------------------------------------ instruments
function kalimba(m, dur = 1.4, bright = 1) {
  const f = mtof(m), o = len(dur);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR, att = Math.min(1, t / 0.003);
    o[i] = att * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.8) + 0.32 * bright * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 10) + 0.12 * bright * Math.sin(2 * Math.PI * f * 5.43 * t) * Math.exp(-t * 22) + (t < 0.004 ? noise() * 0.25 * (1 - t / 0.004) : 0));
  }
  return o;
}
function bell(m, dur = 2.2) {
  const f = mtof(m), o = len(dur), parts = [[1, 1, 2.2], [2.76, 0.42, 4], [5.4, 0.22, 7], [8.93, 0.1, 11]];
  for (let i = 0; i < o.length; i++) { const t = i / SR; let v = 0; for (const [r, a, d] of parts) v += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t * d); o[i] = v * Math.min(1, t / 0.002); }
  return o;
}
function pad(ms, dur, attack = 0.5, release = 0.8, cutoff = 1400) {
  const o = len(dur + release);
  for (const m of ms) for (const det of [-0.08, 0, 0.07]) {
    const f = mtof(m + det), ph = rnd() * 6.28;
    for (let i = 0; i < o.length; i++) { const t = i / SR; let v = 0; for (let h = 1; h <= 10; h++) v += Math.sin(2 * Math.PI * f * h * t + ph * h) / h; o[i] += v * 0.05; }
  }
  filt(o, "lp", cutoff, 0.6);
  for (let i = 0; i < o.length; i++) { const t = i / SR; const env = Math.min(1, t / attack) * (t > dur ? Math.exp(-(t - dur) / (release / 4)) : 1); o[i] *= env; }
  return o;
}
function bassNote(m, dur) {
  const f = mtof(m), o = len(dur);
  for (let i = 0; i < o.length; i++) { const t = i / SR; const env = Math.min(1, t / 0.006) * Math.exp(-t * 2.4) * (t > dur - 0.03 ? (dur - t) / 0.03 : 1); o[i] = Math.tanh(1.6 * (Math.sin(2 * Math.PI * f * t) + 0.28 * Math.sin(4 * Math.PI * f * t))) * env; }
  return o;
}
function kick(g = 1) {
  const o = len(0.45); let ph = 0;
  for (let i = 0; i < o.length; i++) { const t = i / SR, f = 46 + 110 * Math.exp(-t * 28); ph += (2 * Math.PI * f) / SR; o[i] = (Math.sin(ph) * Math.exp(-t * 7.5) + (t < 0.003 ? noise() * 0.5 : 0)) * g; }
  return o;
}
function clap() {
  const o = len(0.35);
  for (let i = 0; i < o.length; i++) { const t = i / SR; let e = 0; for (const d of [0, 0.011, 0.022]) if (t >= d) e = Math.max(e, Math.exp(-(t - d) * (d === 0.022 ? 18 : 140))); o[i] = noise() * e; }
  return filt(filt(o, "bp", 1300, 0.9), "hp", 500);
}
function hat(open = false) { const o = len(open ? 0.3 : 0.07); for (let i = 0; i < o.length; i++) o[i] = noise() * Math.exp(-(i / SR) * (open ? 14 : 70)); return filt(filt(o, "hp", 7500, 0.7), "pk", 10000, 1, 3); }
function shaker() { const o = len(0.06); for (let i = 0; i < o.length; i++) { const t = i / SR; o[i] = noise() * Math.min(1, t / 0.012) * Math.exp(-t * 60); } return filt(o, "hp", 5500); }

// ------------------------------------------------------------------ design sonore
function whoosh(dur, f0 = 300, f1 = 3500, q = 1.2, shape = "swell") {
  const o = len(dur);
  for (let i = 0; i < o.length; i++) { const p = i / o.length; const env = shape === "in" ? p ** 2.2 : shape === "out" ? (1 - p) ** 2 : Math.sin(Math.PI * p) ** 1.5; o[i] = noise() * env; }
  return sweepBP(o, f0, f1, q);
}
function riser(dur, m0 = 50, m1 = 86) {
  const o = len(dur); let ph = 0;
  const nz = whoosh(dur, 400, 7000, 1.4, "in");
  for (let i = 0; i < o.length; i++) { const p = i / o.length, f = mtof(m0 + (m1 - m0) * p ** 1.6); ph += (2 * Math.PI * f) / SR; o[i] = (0.22 * Math.sin(ph) + 0.7 * nz[i]) * p ** 1.8; }
  return o;
}
function impact(g = 1) {
  const o = len(2.4); let ph = 0;
  const nz = new Float32Array(o.length); for (let i = 0; i < nz.length; i++) nz[i] = noise() * Math.exp(-(i / SR) * 5); filt(nz, "lp", 2400, 0.7);
  for (let i = 0; i < o.length; i++) { const t = i / SR, f = 38 + 70 * Math.exp(-t * 9); ph += (2 * Math.PI * f) / SR; o[i] = (Math.sin(ph) * Math.exp(-t * 2.4) * 0.95 + nz[i] * 0.55) * g; }
  return o;
}
function tick() { const o = len(0.05); for (let i = 0; i < o.length; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * 1900 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 170); } return filt(o, "hp", 900); }
function popS(f0 = 420, f1 = 1250) { const o = len(0.12); let ph = 0; for (let i = 0; i < o.length; i++) { const t = i / SR, p = Math.min(1, t / 0.06); ph += (2 * Math.PI * (f0 + (f1 - f0) * p)) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 34) * Math.min(1, t / 0.002); } return o; }
function thud() {
  const o = len(0.5); let ph = 0;
  for (let i = 0; i < o.length; i++) { const t = i / SR, f = 70 + 90 * Math.exp(-t * 30); ph += (2 * Math.PI * f) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 11) + noise() * 0.6 * Math.exp(-t * 60); }
  return filt(o, "lp", 3200);
}
function coin(m = 93) { const a = bell(m, 0.9), b = bell(m + 7, 0.9), o = len(1.0); for (let i = 0; i < a.length; i++) { o[i] += a[i] * 0.6; const j = i + Math.round(0.055 * SR); if (j < o.length) o[j] += b[i] * 0.5; } return filt(o, "hp", 900); }
function sparkle(dur = 0.6, n = 9, base = 96) { const o = len(dur + 1.2); for (let k = 0; k < n; k++) { const b = bell(base + [0, 4, 7, 11, 12, 16, 19][Math.floor(rnd() * 7)], 1.0); const off = Math.round(rnd() * dur * SR); for (let i = 0; i < b.length && off + i < o.length; i++) o[off + i] += b[i] * 0.22; } return filt(o, "hp", 1800); }
function crinkle(dur) { const o = len(dur); for (let i = 0; i < o.length; i++) o[i] = rnd() < 0.02 ? noise() : 0; return filt(filt(o, "bp", 3200, 0.8), "lp", 7000); }

// ------------------------------------------------------------------ réverbération (Freeverb)
function freeverb(inL, inR, room = 0.84, damp = 0.28) {
  const sc = SR / 44100, combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225];
  const mk = (off) => ({ c: combT.map((t) => ({ b: new Float32Array(Math.round((t + off) * sc)), i: 0, s: 0 })), a: apT.map((t) => ({ b: new Float32Array(Math.round((t + off) * sc)), i: 0 })) });
  const chans = [mk(0), mk(23)], outs = [new Float32Array(N), new Float32Array(N)], ins = [inL, inR];
  for (let ch = 0; ch < 2; ch++) {
    const { c, a } = chans[ch], x = ins[ch], y = outs[ch];
    for (let n = 0; n < N; n++) {
      const inp = x[n] * 0.015; let s = 0;
      for (const cb of c) { const o = cb.b[cb.i]; cb.s = o * (1 - damp) + cb.s * damp; cb.b[cb.i] = inp + cb.s * room; if (++cb.i >= cb.b.length) cb.i = 0; s += o; }
      for (const ap of a) { const bo = ap.b[ap.i]; const o = -s + bo; ap.b[ap.i] = s + bo * 0.5; if (++ap.i >= ap.b.length) ap.i = 0; s = o; }
      y[n] = s;
    }
  }
  return outs;
}

// ------------------------------------------------------------------ lecture audio via ffmpeg
function readMono(file) {
  const raw = ff(["-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"]);
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}
function readStereo(file) {
  const raw = ff(["-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"]);
  const f = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)), L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < Math.min(N, f.length / 2); i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { L, R };
}
function trim(x) {
  const th = dbg(-42); let a = 0, b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < th) a++;
  while (b > a && Math.abs(x[b]) < th) b--;
  return x.subarray(Math.max(0, a - Math.round(0.03 * SR)), Math.min(x.length, b + Math.round(0.06 * SR)));
}

// =================================================================== 1. MUSIQUE
const music = bus(), send = bus();
const licensed = fs.existsSync(A("music.wav"));
if (licensed) {
  const m = readStereo(A("music.wav")); music.L.set(m.L); music.R.set(m.R);
  console.log("musique : assets/music.wav (sous licence)");
} else {
  const CH = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]; // D A Bm G
  const ROOTS = [38, 33, 35, 31];
  const bt = (b) => b * BEAT;
  const chordAt = (b) => Math.floor(b / 4) % 4;
  // Intro (temps 0 → 6) : nappe qui s'ouvre, kalimba sur les mots, montée vers la traversée de la pièce.
  put(music, pad([50, 62, 66, 69], bt(6), 1.2, 0.3, 900), 0, 0.5);
  [[0.34, 81], [0.66, 78], [1.14, 74], [1.3, 76], [1.46, 78]].forEach(([t, m]) => { const k = kalimba(m, 1.6); put(music, k, t, 0.34, 0.2); put(send, k, t, 0.5); });
  // Groove principal : temps 6 → 25 et 32 → 56 ; pont feutré 25 → 32 ; coda 56 → fin.
  for (let b = 6; b < 56; b++) {
    const t = bt(b), ci = chordAt(b), ch = CH[ci], bridge = b >= 25 && b < 32;
    if (!bridge || b % 4 === 0) put(music, kick(bridge ? 0.6 : 1), t, 0.72);
    if (!bridge && b % 2 === 1) { const c = clap(); put(music, c, t, 0.28, -0.1); put(send, c, t, 0.35); }
    if (!bridge) { put(music, hat(b % 8 === 7), t + BEAT / 2, 0.12, 0.35); }
    for (let s = 0; s < 4; s++) if (!bridge || s % 2 === 1) put(music, shaker(), t + (s * BEAT) / 4, s % 2 ? 0.05 : 0.03, -0.35);
    // Basse en croches, sidechainée par le kick.
    for (let e = 0; e < 2; e++) { const bn = bassNote(ROOTS[ci] + (e === 1 && b % 2 ? 12 : 0), BEAT / 2 - 0.02); put(music, bn, t + (e * BEAT) / 2 + (e === 0 ? 0.03 : 0), bridge ? 0.14 : 0.24); }
    // Arpège de kalimba en croches.
    const tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24];
    const pat = [0, 1, 2, 3, 2, 1, 2, 3];
    for (let e = 0; e < 2; e++) { const idx = pat[((b % 4) * 2 + e) % 8]; const k = kalimba(tones[idx], 1.2, bridge ? 0.6 : 1); const pan = e ? 0.4 : -0.4; put(music, k, t + (e * BEAT) / 2, bridge ? 0.12 : 0.15, pan); put(send, k, t + (e * BEAT) / 2, 0.28); }
    // Nappe par mesure.
    if (b % 4 === 0 || b === 6) { const p = pad(ch.map((m) => m - 12), bt(4) - 0.05, 0.25, 0.5, bridge ? 900 : 1600); put(music, p, t, bridge ? 0.28 : 0.2); put(send, p, t, 0.2); }
  }
  // Pont (placements) : cloches rêveuses.
  [[12.24, 86], [12.96, 83], [13.68, 81], [14.4, 78], [14.88, 83]].forEach(([t, m]) => { const b = bell(m, 2.4); put(music, b, t, 0.08, 0.3); put(send, b, t, 0.3); });
  // Coda : accord final sur le clic de la pilule (temps 56 = 26,88 s), tenu jusqu'à la fin.
  const fin = pad([50, 57, 62, 66, 69, 74], 2.4, 0.02, 1.2, 2200); put(music, fin, bt(56), 0.34); put(send, fin, bt(56), 0.35);
  [74, 78, 81, 86].forEach((m, i) => { const k = kalimba(m, 2.2); put(music, k, bt(56) + i * 0.06, 0.2, i % 2 ? 0.3 : -0.3); put(send, k, bt(56) + i * 0.06, 0.4); });
  put(music, bassNote(38, 1.6), bt(56), 0.3); put(music, kick(1.1), bt(56), 0.7);
  for (let b = 48; b < 56; b++) put(music, bassNote(38 + (b % 2 ? 12 : 0), BEAT - 0.02), bt(b), 0.05);
  const [rl, rr] = freeverb(send.L, send.R);
  for (let i = 0; i < N; i++) { music.L[i] += rl[i] * 0.9; music.R[i] += rr[i] * 0.9; }
}

// =================================================================== 2. DESIGN SONORE (calé sur index.html)
const sfx = bus(), sfxSend = bus();
const S = (sig, t, g, pan = 0, verb = 0.25) => { put(sfx, sig, t, g, pan); if (verb) put(sfxSend, sig, t, g * verb); };
S(whoosh(0.9, 2500, 500, 1.1, "out"), 0.0, 0.5, 0);           // pièces qui tombent de la profondeur
S(sparkle(0.6, 8, 98), 0.25, 0.5, 0.2);
S(whoosh(0.5, 400, 2600, 1.4), 1.95, 0.55, 0.5);               // la pièce arrive en tournoyant
S(coin(91), 2.4, 0.35, 0);
S(riser(0.45, 55, 90), 2.42, 0.6, 0);                           // traversée du trou
S(whoosh(0.35, 3000, 400, 1.2, "out"), 2.84, 0.6);
S(impact(1), 2.88, 0.85, 0, 0.35);                              // flash or + logo
S(sparkle(0.7, 12, 96), 2.92, 0.7, 0);
S(whoosh(0.5, 3200, 500, 1.3), 3.48, 0.45, 0.3);               // le fond or rejoint l'écran
S(tick(), 4.74, 0.55, 0.3, 0);                                  // « C'est fait ! »
S(popS(600, 900), 4.86, 0.2, 0.3, 0);
S(thud(), 5.33, 0.8, 0.25, 0.3);                                // tampon « Validée par Papa »
S(popS(), 5.7, 0.28, 0.3);
for (let i = 0; i < 9; i++) S(coin(88 + ((i * 2) % 7)), 6.38 + i * 0.045, 0.16, -0.6 + i * 0.05, 0.3);
S(popS(300, 900), 6.1, 0.35, -0.5);
S(sparkle(0.4, 6, 100), 6.15, 0.35, -0.5);
S(whoosh(0.34, 600, 5200, 1.1, "in"), 6.9, 0.7, 0.6);          // fouetté vers S3
S(whoosh(0.45, 5000, 700, 1.1, "out"), 7.2, 0.5, -0.4);
S(whoosh(0.5, 500, 2200, 1.4), 8.2, 0.45, -0.7);                // panneaux
S(whoosh(0.5, 500, 2400, 1.4), 8.3, 0.45, 0.7);
S(popS(500, 1100), 8.6, 0.2, -0.5);
S(popS(360, 820), 9.5, 0.45, 0);                                 // « ou »
S(tick(), 9.15, 0.3, -0.5, 0);
for (let i = 0; i < 6; i++) S(coin(86 + (i % 3) * 3), 10.45 + i * 0.1, 0.2, 0.55, 0.3);
S(thud(), 10.52, 0.45, 0.55);
S(sparkle(0.5, 7, 98), 11.05, 0.35, 0.5);
S(whoosh(0.4, 3500, 600, 1.2, "out"), 11.92, 0.45, 0);
S(whoosh(0.4, 400, 3000, 1.2), 11.95, 0.5, 0);
{ const r = riser(1.7, 62, 86); for (let i = 0; i < r.length; i++) r[i] *= 0.35; S(r, 12.65, 0.35, 0.2, 0.4); }
for (let i = 0; i < 4; i++) S(popS(420 + i * 60, 1000 + i * 80), 13.85 + i * 0.1, 0.18, -0.3 + i * 0.2);
S(impact(0.5), 15.36, 0.45, 0, 0.3);
S(sparkle(0.5, 8, 94), 15.4, 0.35);
S(crinkle(0.36), 15.94, 0.9, 0);
S(riser(0.9, 50, 88), 15.42, 0.55, 0);
S(impact(1.1), 16.3, 0.95, 0, 0.4);                             // ouverture du booster
S(sparkle(1.0, 16, 96), 16.32, 0.75);
for (let i = 0; i < 7; i++) S(whoosh(0.22, 1200, 4200, 2), 16.34 + Math.abs(i - 3) * 0.05, 0.14, (i - 3) / 3.5, 0.1);
S(sparkle(0.3, 5, 103), 17.15, 0.4, 0);
S(whoosh(0.34, 700, 5000, 1.1, "in"), 18.62, 0.6);
S(whoosh(0.45, 4500, 600, 1.1, "out"), 18.72, 0.45);
S(tick(), 20.08, 0.55, 0.5, 0);                                  // « Valider »
S(coin(88), 20.14, 0.3, 0.5);
S(whoosh(0.45, 400, 1800, 1.4), 20.6, 0.35, 0.5);
[21.18, 21.4].forEach((t) => S(tick(), t, 0.45, 0.6, 0));
[0, 1, 2, 3].forEach((k) => S(popS(700, 1100), 21.22 + k * 0.2, 0.14, 0.6, 0));
S(whoosh(0.36, 600, 4800, 1.2, "in"), 22.9, 0.55);              // tout converge
S(popS(300, 1000), 23.14, 0.45, 0);
S(impact(0.8), 23.42, 0.7, 0, 0.4);                             // logo
S(sparkle(0.7, 12, 96), 23.5, 0.55);
S(whoosh(0.8, 300, 1500, 1.2), 25.95, 0.25, 0.4);
S(tick(), 26.86, 0.55, 0.2, 0);                                  // clic final
S(sparkle(0.8, 14, 98), 26.9, 0.6, 0.1);
for (let i = 0; i < 3; i++) S(popS(520 + i * 80, 1100 + i * 90), 27.15 + i * 0.12, 0.14, -0.3 + i * 0.3);
{ const [rl, rr] = freeverb(sfxSend.L, sfxSend.R, 0.8, 0.35); for (let i = 0; i < N; i++) { sfx.L[i] += rl[i] * 0.8; sfx.R[i] += rr[i] * 0.8; } }

// =================================================================== 3. VOIX OFF
const TARGETS = [0.36, 2.96, 7.4, 12.25, 15.6, 19.0, 23.42];
const voice = new Float32Array(N);
const userVo = (k) => ["wav", "mp3", "m4a", "flac"].map((e) => A(`vo/vo-${k}.${e}`)).find((f) => fs.existsSync(f));
const usingUser = [1, 2, 3, 4, 5, 6, 7].every((k) => userVo(k));
let prevEnd = 0; const placed = [];
for (let k = 1; k <= 7; k++) {
  const file = usingUser ? userVo(k) : A(`vo-guide/vo-${k}.wav`);
  const x = trim(readMono(file));
  // Chaîne voix : passe-haut 80 Hz, présence légère, compression douce.
  const y = Float32Array.from(x); filt(y, "hp", 80, 0.7); filt(y, "pk", 3200, 0.9, 2); filt(y, "hs", 9000, 0.7, 1.5);
  let env = 0; for (let i = 0; i < y.length; i++) { const a = Math.abs(y[i]); env = a > env ? env + (a - env) * 0.02 : env + (a - env) * 0.0004; const over = env > 0.18 ? (env / 0.18) ** (1 / 3 - 1) : 1; y[i] *= over; }
  const start = Math.max(TARGETS[k - 1], prevEnd + 0.12), i0 = Math.round(start * SR);
  let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < y.length && i0 + i < N; i++) voice[i0 + i] += (y[i] / peak) * 0.7;
  prevEnd = start + y.length / SR; placed.push({ line: k, start: +start.toFixed(2), end: +prevEnd.toFixed(2), file: path.relative(ROOT, file) });
}
console.log("voix :", usingUser ? "ElevenLabs (assets/vo)" : "piste témoin Windows (assets/vo-guide)");
console.table(placed);
if (prevEnd > 29.7) console.warn(`⚠ la voix finit à ${prevEnd.toFixed(2)} s : raccourcir la dernière ligne.`);

// =================================================================== 4. MIXAGE
// Ducking : la musique baisse de ~8 dB sous la voix (attaque 30 ms, relâche 350 ms).
const duck = new Float32Array(N); { let e = 0; for (let i = 0; i < N; i++) { const a = Math.abs(voice[i]); const c = a > e ? 1 - Math.exp(-1 / (0.03 * SR)) : 1 - Math.exp(-1 / (0.35 * SR)); e += (a - e) * c; duck[i] = e; } }
let dmax = 0; for (const v of duck) dmax = Math.max(dmax, v);
const L = new Float32Array(N), R = new Float32Array(N);
const fadeOut = (i) => { const t = i / SR; return t > 29.2 ? Math.max(0, (29.95 - t) / 0.75) : 1; };
for (let i = 0; i < N; i++) {
  const d = Math.min(1, duck[i] / (dmax * 0.25)), mg = dbg(-3) * (1 - d * (1 - dbg(-8))), f = fadeOut(i);
  L[i] = (music.L[i] * mg + sfx.L[i] * dbg(-4)) * f + voice[i];
  R[i] = (music.R[i] * mg + sfx.R[i] * dbg(-4)) * f + voice[i];
}
// Écrêteur doux (évite les crêtes isolées avant la normalisation).
let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
for (let i = 0; i < N; i++) { L[i] = Math.tanh((L[i] / pk) * 1.3) / Math.tanh(1.3); R[i] = Math.tanh((R[i] / pk) * 1.3) / Math.tanh(1.3); }
// Silence strict sur les 3 dernières images (fin de spot propre).
for (let i = Math.round(29.88 * SR); i < N; i++) { L[i] = 0; R[i] = 0; }

// WAV flottant 32 bits intermédiaire.
function writeWavF32(file, l, r) {
  const data = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { data.writeFloatLE(l[i], i * 8); data.writeFloatLE(r[i], i * 8 + 4); }
  const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
const pre = path.join(os.tmpdir(), `okodukai-mix-pre-${process.pid}.wav`);
writeWavF32(pre, L, R);

// =================================================================== 5. MASTERS (EBU R128 / PAD France)
function master(out, I, TP) {
  const m = ffErr(["-i", pre, "-af", `loudnorm=I=${I}:TP=${TP}:LRA=11:print_format=json`, "-f", "null", "-"]);
  const j = JSON.parse(m.slice(m.lastIndexOf("{"), m.lastIndexOf("}") + 1));
  ff(["-i", pre, "-af", `loudnorm=I=${I}:TP=${TP}:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=${SR}`, "-t", String(DUR), "-c:a", "pcm_s24le", "-ar", String(SR), out]);
  const r = ffErr(["-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const I2 = /I:\s+(-?[\d.]+) LUFS/.exec(r.slice(r.lastIndexOf("Summary")))?.[1], P2 = /Peak:\s+(-?[\d.]+) dBFS/.exec(r.slice(r.lastIndexOf("Summary")))?.[1];
  console.log(`${path.basename(out)} : ${I2} LUFS intégré, true peak ${P2} dBTP (cible ${I} / ${TP})`);
}
master(A("soundtrack.wav"), -23, -3);
master(A("soundtrack-web.wav"), -14, -1);
fs.unlinkSync(pre);
fs.writeFileSync(path.join(ROOT, "audio_meta.json"), JSON.stringify({ duration: DUR, sample_rate: SR, bpm: BPM, music: licensed ? "assets/music.wav" : "synthèse originale (tools/mix.mjs)", voice: usingUser ? "ElevenLabs" : "piste témoin Windows Hortense", lines: placed }, null, 2));
