/**
 * Rend les formats parent-organic-v1 avec FFmpeg (lavfi + ASS + overlays).
 * Aucune dépendance npm requise.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const outRoot = path.resolve(root, "apps/web/public/social/parent-organic-v1");
const tmpRoot = path.resolve(__dirname, "../.render-tmp");
const webPublic = path.resolve(root, "apps/web/public");
const coin = path.join(webPublic, "assets/coins/okodukai-coin-192.webp");
const logo = path.join(webPublic, "assets/brand/logo-full-640.webp");

const EXPORTS = [
  { id: "story-12s", width: 1080, height: 1920, duration: 12.5, file: "video/okodukai-story-12s.mp4", muted: "video/okodukai-story-12s-silent.mp4", script: "full" },
  { id: "story-6s", width: 1080, height: 1920, duration: 6, file: "video/okodukai-story-6s.mp4", muted: "video/okodukai-story-6s-silent.mp4", script: "short" },
  { id: "feed-12s", width: 1080, height: 1350, duration: 12.5, file: "video/okodukai-feed-12s.mp4", muted: "video/okodukai-feed-12s-silent.mp4", script: "full" },
  { id: "square-12s", width: 1080, height: 1080, duration: 12.5, file: "video/okodukai-square-12s.mp4", muted: "video/okodukai-square-12s-silent.mp4", script: "full" },
  { id: "landscape-15s", width: 1920, height: 1080, duration: 15, file: "video/okodukai-landscape-15s.mp4", muted: "video/okodukai-landscape-15s-silent.mp4", script: "long" },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function ts(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss(exp) {
  const cues =
    exp.script === "short"
      ? [
          [0, 1.5, "Vous répétez ça tous les jours ?"],
          [0.2, 1.5, "Range ta chambre."],
          [1.5, 3, "Transformez les routines en missions."],
          [1.5, 3, "Ranger sa chambre  ·  +10"],
          [3, 4.5, "Une mission. Une validation. +10."],
          [4.5, 6, "Le quotidien devient un jeu.\\NL'argent s'apprend en faisant.\\N100 % gratuit"],
        ]
      : exp.script === "long"
        ? [
            [0, 2, "Vous répétez ça tous les jours ?"],
            [0.2, 2, "Range ta chambre. Prépare ton sac. Mets la table."],
            [2, 4.2, "Transformez les routines en missions."],
            [2, 4.2, "Ranger sa chambre  ·  +10"],
            [4.2, 6.5, "Une mission. Une validation. +10."],
            [6.5, 9.2, "Après, c'est à elle de choisir."],
            [6.5, 9.2, "Dépenser  ·  Mon coffre  ·  Placer"],
            [9.2, 12.2, "Dépenser. Économiser. Comprendre."],
            [12.2, 15, "Son premier compte. Pour de faux.\\NSes premiers réflexes avec l'argent. Pour de vrai.\\N100 % gratuit"],
          ]
        : [
            [0, 1.5, "Vous répétez ça tous les jours ?"],
            [0.2, 1.5, "Range ta chambre."],
            [0.45, 1.5, "Prépare ton sac."],
            [0.7, 1.5, "Mets la table."],
            [1.5, 3.5, "Transformez les routines en missions."],
            [1.5, 3.5, "Ranger sa chambre  ·  +10"],
            [3.5, 5.5, "Une mission. Une validation. +10."],
            [5.5, 8, "Après, c'est à elle de choisir."],
            [5.5, 8, "Dépenser  ·  Mon coffre  ·  Placer"],
            [8, 10.5, "Dépenser. Économiser. Comprendre."],
            [10.5, 12.5, "Son premier compte. Pour de faux.\\NSes premiers réflexes avec l'argent. Pour de vrai.\\N100 % gratuit"],
          ];

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${exp.width}
PlayResY: ${exp.height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,${Math.round(Math.min(exp.width, exp.height) * 0.055)},&H00F0F6F6,&H000000FF,&H00412917,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,5,60,60,${Math.round(exp.height * 0.12)},1
Style: Body,Arial,${Math.round(Math.min(exp.width, exp.height) * 0.038)},&H00F0F6F6,&H000000FF,&H00412917,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,5,60,60,${Math.round(exp.height * 0.22)},1
Style: Gold,Arial,${Math.round(Math.min(exp.width, exp.height) * 0.04)},&H0038D5D5,&H000000FF,&H00412917,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,5,60,60,${Math.round(exp.height * 0.28)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = cues
    .map(([start, end, text], i) => {
      const style = text.includes("100 %") ? "Gold" : i === 0 || text.includes("Transformez") || text.includes("mission") || text.includes("Dépenser.") || text.includes("premier compte") || text.includes("quotidien") ? "Title" : "Body";
      return `Dialogue: 0,${ts(start)},${ts(end)},${style},,0,0,0,,${text}`;
    })
    .join("\n");

  return `${header}${events}\n`;
}

async function buildAudio(audioDir, duration) {
  await mkdir(audioDir, { recursive: true });
  const bed = path.join(audioDir, "bed.wav");
  const ding = path.join(audioDir, "ding.wav");
  const whoosh = path.join(audioDir, "whoosh.wav");
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", `sine=frequency=196:duration=${duration}`, "-f", "lavfi", "-i", `sine=frequency=247:duration=${duration}`, "-filter_complex", `[0]volume=0.04[a];[1]volume=0.03[b];[a][b]amix=inputs=2:duration=longest,afade=t=in:st=0:d=0.35,afade=t=out:st=${Math.max(0.2, duration - 0.8)}:d=0.7`, bed]);
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.12", "-af", "afade=t=out:st=0.05:d=0.07,volume=0.35", ding]);
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=420:duration=0.18", "-af", "afade=t=in:st=0:d=0.04,afade=t=out:st=0.1:d=0.08,volume=0.2", whoosh]);
  return { bed, ding, whoosh };
}

async function renderExport(exp, audio) {
  const outMp4 = path.join(outRoot, exp.file);
  await mkdir(path.dirname(outMp4), { recursive: true });
  const assPath = path.join(tmpRoot, `${exp.id}.ass`);
  await writeFile(assPath, buildAss(exp), "utf8");

  const assEsc = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const hasCoin = await exists(coin);
  const hasLogo = await exists(logo);
  const dingAt = exp.script === "short" ? 3.2 : 4.2;
  const whooshAt = 1.55;
  const logoEnable = exp.script === "short" ? "gte(t\\,4.5)" : exp.script === "long" ? "gte(t\\,12.2)" : "gte(t\\,10.5)";
  const coinEnable = exp.script === "short" ? "between(t\\,3\\,4.5)" : exp.script === "long" ? "between(t\\,4.2\\,6.5)" : "between(t\\,3.5\\,5.5)";

  const inputs = ["-f", "lavfi", "-i", `color=c=0x1C2E4A:s=${exp.width}x${exp.height}:d=${exp.duration}`];
  let filter = `[0:v]format=yuv420p,ass='${assEsc}'[txt]`;
  let last = "txt";
  let idx = 1;

  if (hasCoin) {
    inputs.push("-i", coin);
    filter += `;[${idx}:v]scale=${Math.round(exp.width * 0.12)}:-1[coin];[${last}][coin]overlay=(W-w)/2:H*0.62:enable='${coinEnable}'[vcoin]`;
    last = "vcoin";
    idx += 1;
  }
  if (hasLogo) {
    inputs.push("-i", logo);
    filter += `;[${idx}:v]scale=${Math.round(exp.width * 0.42)}:-1[logo];[${last}][logo]overlay=(W-w)/2:H*0.08:enable='${logoEnable}'[vout]`;
    last = "vout";
    idx += 1;
  } else {
    filter += `;[${last}]copy[vout]`;
  }

  inputs.push("-i", audio.bed, "-i", audio.ding, "-i", audio.whoosh);
  filter +=
    `;[${idx}:a]atrim=0:${exp.duration},asetpts=PTS-STARTPTS,volume=0.75[bed];` +
    `[${idx + 1}:a]adelay=${Math.round(dingAt * 1000)}|${Math.round(dingAt * 1000)},volume=0.9[ding];` +
    `[${idx + 2}:a]adelay=${Math.round(whooshAt * 1000)}|${Math.round(whooshAt * 1000)},volume=0.7[whoosh];` +
    `[bed][ding][whoosh]amix=inputs=3:duration=first:dropout_transition=0[a]`;

  await run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-crf",
    "22",
    "-r",
    "30",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-t",
    String(exp.duration),
    outMp4,
  ]);

  await run("ffmpeg", ["-y", "-i", outMp4, "-c:v", "copy", "-an", path.join(outRoot, exp.muted)]);
}

async function makeStills(sourceMp4) {
  const posterDir = path.join(outRoot, "poster");
  const thumbDir = path.join(outRoot, "thumbnail");
  const ogDir = path.join(outRoot, "og");
  await mkdir(posterDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });
  await mkdir(ogDir, { recursive: true });

  const posterPng = path.join(tmpRoot, "poster.png");
  const ogPng = path.join(tmpRoot, "og.png");
  await run("ffmpeg", ["-y", "-ss", "11", "-i", sourceMp4, "-frames:v", "1", posterPng]);
  await run("ffmpeg", ["-y", "-i", posterPng, "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", path.join(posterDir, "okodukai-story-poster.jpg")]);
  await run("ffmpeg", ["-y", "-i", posterPng, "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280", path.join(thumbDir, "okodukai-story-thumb.jpg")]);
  await run("ffmpeg", ["-y", "-i", path.join(posterDir, "okodukai-story-poster.jpg"), path.join(posterDir, "okodukai-story-poster.webp")]);
  await run("ffmpeg", ["-y", "-i", path.join(thumbDir, "okodukai-story-thumb.jpg"), path.join(thumbDir, "okodukai-story-thumb.webp")]);
  await run("ffmpeg", ["-y", "-ss", "11.2", "-i", sourceMp4, "-frames:v", "1", ogPng]);
  await run("ffmpeg", ["-y", "-i", ogPng, "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630", path.join(ogDir, "okodukai-og.jpg")]);
  await run("ffmpeg", ["-y", "-i", path.join(ogDir, "okodukai-og.jpg"), path.join(ogDir, "okodukai-og.webp")]);
  await copyFile(path.join(ogDir, "okodukai-og.jpg"), path.join(webPublic, "og-image.jpg"));
}

async function writeManifest() {
  const manifest = {
    campaignId: "parent-organic-v1",
    landingUrl: "https://okodukai-gold.vercel.app/",
    headline: "Son premier compte. Pour de faux.",
    concept: "A",
    demoChildName: "Lina",
    formats: {
      story12: { url: "/social/parent-organic-v1/video/okodukai-story-12s.mp4", silentUrl: "/social/parent-organic-v1/video/okodukai-story-12s-silent.mp4", width: 1080, height: 1920, duration: 12.5 },
      story6: { url: "/social/parent-organic-v1/video/okodukai-story-6s.mp4", silentUrl: "/social/parent-organic-v1/video/okodukai-story-6s-silent.mp4", width: 1080, height: 1920, duration: 6 },
      feed: { url: "/social/parent-organic-v1/video/okodukai-feed-12s.mp4", silentUrl: "/social/parent-organic-v1/video/okodukai-feed-12s-silent.mp4", width: 1080, height: 1350, duration: 12.5 },
      square: { url: "/social/parent-organic-v1/video/okodukai-square-12s.mp4", silentUrl: "/social/parent-organic-v1/video/okodukai-square-12s-silent.mp4", width: 1080, height: 1080, duration: 12.5 },
      landscape: { url: "/social/parent-organic-v1/video/okodukai-landscape-15s.mp4", silentUrl: "/social/parent-organic-v1/video/okodukai-landscape-15s-silent.mp4", width: 1920, height: 1080, duration: 15 },
    },
    poster: "/social/parent-organic-v1/poster/okodukai-story-poster.webp",
    thumbnail: "/social/parent-organic-v1/thumbnail/okodukai-story-thumb.webp",
    ogImage: "/social/parent-organic-v1/og/okodukai-og.jpg",
  };
  await writeFile(path.join(outRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  console.log("social:render — parent-organic-v1 (ffmpeg + ASS)");
  await mkdir(outRoot, { recursive: true });
  await mkdir(tmpRoot, { recursive: true });
  const audio = await buildAudio(path.join(tmpRoot, "audio"), 15);
  for (const exp of EXPORTS) {
    console.log(`→ ${exp.id}`);
    await renderExport(exp, audio);
  }
  await makeStills(path.join(outRoot, "video/okodukai-story-12s.mp4"));
  await writeManifest();
  await rm(tmpRoot, { recursive: true, force: true });
  console.log("OK — apps/web/public/social/parent-organic-v1/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
