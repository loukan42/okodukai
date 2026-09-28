// Masters de livraison à partir du rendu 4K (renders/okodukai-tv-4k.mp4) :
//   renders/okodukai-tv-30s-PAD-1080p25-ProRes422HQ.mov  diffusion TV (PCM 24 bits, −23 LUFS, TP ≤ −3 dBTP)
//   renders/okodukai-tv-30s-PAD-1080p25.mp4              TV en H.264 40 Mb/s CBR (même mix, AAC 320 k)
//   renders/okodukai-tv-30s-web-1080p.mp4                web / réseaux (−14 LUFS)
// Réduction 4K → 1080p en lanczos (supersampling), étiquetage BT.709, 25 i/s progressif.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => path.join(ROOT, "renders", p);
const FFMPEG = [process.env.FFMPEG, path.join(ROOT, "node_modules/ffmpeg-static/ffmpeg.exe"), path.join(ROOT, "../okodukai-pitch/node_modules/ffmpeg-static/ffmpeg.exe"), "ffmpeg"].find((p) => p && (p === "ffmpeg" || fs.existsSync(p)));
const run = (args) => { const r = spawnSync(FFMPEG, ["-hide_banner", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 28 }); if (r.status !== 0) { console.error(r.stderr.slice(-3000)); process.exit(1); } return r.stderr; };

const src = R("okodukai-tv-4k.mp4");
if (!fs.existsSync(src)) { console.error("Rendu 4K absent : lancer d'abord hyperframes render (voir README)."); process.exit(1); }
const tv = path.join(ROOT, "assets/soundtrack.wav"), web = path.join(ROOT, "assets/soundtrack-web.wav");
const scale = "scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1,fps=25";
const tags = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"];

console.log("ProRes 422 HQ…");
run(["-i", src, "-i", tv, "-map", "0:v", "-map", "1:a", "-vf", scale + ",format=yuv422p10le", "-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0", "-bits_per_mb", "8000", ...tags,
  "-c:a", "pcm_s24le", "-ar", "48000", "-t", "30", "-timecode", "10:00:00:00", R("okodukai-tv-30s-PAD-1080p25-ProRes422HQ.mov")]);
console.log("H.264 TV…");
run(["-i", src, "-i", tv, "-map", "0:v", "-map", "1:a", "-vf", scale + ",format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level", "4.1", "-b:v", "40M", "-maxrate", "40M", "-bufsize", "40M", "-g", "12", "-bf", "2", "-x264-params", "nal-hrd=cbr", ...tags,
  "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-t", "30", "-movflags", "+faststart", R("okodukai-tv-30s-PAD-1080p25.mp4")]);
console.log("H.264 web…");
run(["-i", src, "-i", web, "-map", "0:v", "-map", "1:a", "-vf", scale + ",format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-profile:v", "high", ...tags,
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", "30", "-movflags", "+faststart", R("okodukai-tv-30s-web-1080p.mp4")]);

// Vérification : durée, images, loudness de chaque master.
for (const f of ["okodukai-tv-30s-PAD-1080p25-ProRes422HQ.mov", "okodukai-tv-30s-PAD-1080p25.mp4", "okodukai-tv-30s-web-1080p.mp4"]) {
  const e = spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", R(f), "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).stderr;
  const sum = e.slice(e.lastIndexOf("Summary"));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1], P = /Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1];
  const v = /Stream #0:0.*Video: ([^,]+).*?, (\d+x\d+).*?(\d+(?:\.\d+)?) fps/.exec(e);
  const d = /Duration: ([\d:.]+)/.exec(e)?.[1];
  console.log(`${f} — ${d} — ${v?.[1]} ${v?.[2]} ${v?.[3]} i/s — ${I} LUFS, TP ${P} dBTP — ${(fs.statSync(R(f)).size / 1e6).toFixed(1)} Mo`);
}
