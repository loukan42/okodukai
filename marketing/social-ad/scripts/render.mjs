/**
 * Rend la campagne parent-organic-v1 depuis la composition HTML premium.
 * Playwright (enregistrement temps réel) + FFmpeg (H.264 / AAC / stills).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile, copyFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const compositionDir = path.resolve(__dirname, "../composition");
const outRoot = path.resolve(root, "apps/web/public/social/parent-organic-v1");
const tmpRoot = path.resolve(__dirname, "../.render-tmp");
const webPublic = path.resolve(root, "apps/web/public");

const EXPORTS = [
  { id: "story-12s", variant: "story12", ratio: "9x16", width: 1080, height: 1920, file: "video/okodukai-story-12s.mp4", muted: "video/okodukai-story-12s-silent.mp4" },
  { id: "story-6s", variant: "story6", ratio: "9x16", width: 1080, height: 1920, file: "video/okodukai-story-6s.mp4", muted: "video/okodukai-story-6s-silent.mp4" },
  { id: "feed-12s", variant: "story12", ratio: "4x5", width: 1080, height: 1350, file: "video/okodukai-feed-12s.mp4", muted: "video/okodukai-feed-12s-silent.mp4" },
  { id: "square-12s", variant: "story12", ratio: "1x1", width: 1080, height: 1080, file: "video/okodukai-square-12s.mp4", muted: "video/okodukai-square-12s-silent.mp4" },
  { id: "landscape-15s", variant: "landscape15", ratio: "16x9", width: 1920, height: 1080, file: "video/okodukai-landscape-15s.mp4", muted: "video/okodukai-landscape-15s-silent.mp4" },
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

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "ms-playwright"),
  ].filter(Boolean);

  for (const c of candidates) {
    if (c.endsWith(".exe") && existsSync(c)) return { type: "exe", path: c };
  }

  // Playwright cache (sandbox or user)
  const cacheRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(process.env.TEMP || "", "cursor-sandbox-cache"),
    path.join(process.env.LOCALAPPDATA || "", "ms-playwright"),
  ].filter(Boolean);

  for (const rootCache of cacheRoots) {
    if (!existsSync(rootCache)) continue;
    // shallow search for chrome-headless-shell.exe / chrome.exe
  }
  return { type: "exe", path: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" };
}

async function buildAudio(audioDir) {
  await mkdir(audioDir, { recursive: true });
  const bed = path.join(audioDir, "bed.wav");
  const ding = path.join(audioDir, "ding.wav");
  const whoosh = path.join(audioDir, "whoosh.wav");
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=196:duration=15", "-f", "lavfi", "-i", "sine=frequency=294:duration=15", "-f", "lavfi", "-i", "sine=frequency=247:duration=15", "-filter_complex", "[0]volume=0.035[a];[1]volume=0.02[b];[2]volume=0.025[c];[a][b][c]amix=inputs=3:duration=longest,afade=t=in:st=0:d=0.5,afade=t=out:st=14.1:d=0.8", bed]);
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.14", "-af", "afade=t=out:st=0.06:d=0.08,volume=0.4", ding]);
  await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=520:duration=0.2", "-af", "afade=t=in:st=0:d=0.03,afade=t=out:st=0.1:d=0.1,volume=0.22", whoosh]);
  return { bed, ding, whoosh };
}

async function playTimeline(page, duration) {
  const started = Date.now();
  while (true) {
    const elapsed = (Date.now() - started) / 1000;
    if (elapsed >= duration) break;
    await page.evaluate((t) => window.__okodukaiAd.seekTo(t), elapsed);
    await page.waitForTimeout(33);
  }
  await page.evaluate((t) => window.__okodukaiAd.seekTo(t), duration - 0.04);
  await page.waitForTimeout(250);
}

async function renderExport(browser, exp, audio) {
  const videoDir = path.join(tmpRoot, exp.id, "record");
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: exp.width, height: exp.height },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: exp.width, height: exp.height } },
  });
  const page = await context.newPage();
  const htmlPath = path.join(compositionDir, "index.html");
  const url = `${pathToFileURL(htmlPath).href}?variant=${exp.variant}&ratio=${exp.ratio}&assets=${encodeURIComponent(pathToFileURL(webPublic).href)}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__okodukaiAd?.ready === true, null, { timeout: 60000 });
  const duration = await page.evaluate(() => window.__okodukaiAd.duration);

  await playTimeline(page, duration);
  await page.close();
  await context.close();

  const recorded = (await readdir(videoDir)).find((f) => f.endsWith(".webm"));
  if (!recorded) throw new Error(`Pas de vidéo pour ${exp.id}`);
  const webm = path.join(videoDir, recorded);
  const outMp4 = path.join(outRoot, exp.file);
  await mkdir(path.dirname(outMp4), { recursive: true });

  const dingAt = exp.variant === "story6" ? 3.25 : 4.25;
  const whooshAt = 1.55;

  await run("ffmpeg", [
    "-y",
    "-i", webm,
    "-i", audio.bed,
    "-i", audio.ding,
    "-i", audio.whoosh,
    "-filter_complex",
    `[0:v]fps=30,format=yuv420p,scale=${exp.width}:${exp.height}:flags=lanczos[v];` +
      `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=0.75[bed];` +
      `[2:a]adelay=${Math.round(dingAt * 1000)}|${Math.round(dingAt * 1000)},volume=0.95[ding];` +
      `[3:a]adelay=${Math.round(whooshAt * 1000)}|${Math.round(whooshAt * 1000)},volume=0.75[whoosh];` +
      `[bed][ding][whoosh]amix=inputs=3:duration=first:dropout_transition=0[a]`,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-crf", "20",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "160k",
    "-t", String(duration),
    outMp4,
  ]);

  await run("ffmpeg", ["-y", "-i", outMp4, "-c:v", "copy", "-an", path.join(outRoot, exp.muted)]);
  return duration;
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
  await run("ffmpeg", ["-y", "-ss", "11.1", "-i", sourceMp4, "-frames:v", "1", "-update", "1", posterPng]);
  await run("ffmpeg", ["-y", "-i", posterPng, "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-update", "1", path.join(posterDir, "okodukai-story-poster.jpg")]);
  await run("ffmpeg", ["-y", "-i", path.join(posterDir, "okodukai-story-poster.jpg"), "-update", "1", path.join(posterDir, "okodukai-story-poster.webp")]);
  await run("ffmpeg", ["-y", "-i", posterPng, "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280", "-update", "1", path.join(thumbDir, "okodukai-story-thumb.jpg")]);
  await run("ffmpeg", ["-y", "-i", path.join(thumbDir, "okodukai-story-thumb.jpg"), "-update", "1", path.join(thumbDir, "okodukai-story-thumb.webp")]);
  await run("ffmpeg", ["-y", "-ss", "11.3", "-i", sourceMp4, "-frames:v", "1", "-update", "1", ogPng]);
  await run("ffmpeg", ["-y", "-i", ogPng, "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630", "-update", "1", path.join(ogDir, "okodukai-og.jpg")]);
  await run("ffmpeg", ["-y", "-i", path.join(ogDir, "okodukai-og.jpg"), "-update", "1", path.join(ogDir, "okodukai-og.webp")]);
  await copyFile(path.join(ogDir, "okodukai-og.jpg"), path.join(webPublic, "og-image.jpg"));
}

async function writeManifest() {
  const manifest = {
    campaignId: "parent-organic-v1",
    landingUrl: "https://okodukai-gold.vercel.app/",
    headline: "Son premier compte. Pour de faux.",
    concept: "A",
    demoChildName: "Lina",
    engine: "html-composition + playwright + ffmpeg",
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
  console.log("social:render — premium HTML composition");
  await mkdir(outRoot, { recursive: true });
  await mkdir(tmpRoot, { recursive: true });
  const audio = await buildAudio(path.join(tmpRoot, "audio"));
  const browserInfo = findBrowser();
  if (!(await exists(browserInfo.path))) throw new Error(`Navigateur introuvable: ${browserInfo.path}`);

  const browser = await chromium.launch({
    executablePath: browserInfo.path,
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

  try {
    for (const exp of EXPORTS) {
      console.log(`→ ${exp.id}`);
      await renderExport(browser, exp, audio);
    }
  } finally {
    await browser.close();
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
