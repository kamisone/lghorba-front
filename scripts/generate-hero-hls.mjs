/**
 * Generates static HLS renditions for the homepage hero videos into
 * public/assets/cars/hls/. Run whenever the source mp4s change:
 *
 *   node scripts/generate-hero-hls.mjs
 *
 * Uses the ffmpeg binary bundled with the backend (@ffmpeg-installer);
 * override with FFMPEG_PATH=/path/to/ffmpeg if needed.
 * The heroes are muted/decorative, so audio is stripped from the renditions.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(FRONT, "..", "back", "package.json"));
const ffmpegPath = process.env.FFMPEG_PATH ?? require("@ffmpeg-installer/ffmpeg").path;

const SEGMENT_SECONDS = 4;

/** rungs: [{ height, maxrate (kbps), crf }] — capped CRF keeps sizes near the already-compressed sources */
const VIDEOS = [
  {
    source: "public/assets/cars/rentals_hero.mp4",
    outDir: "public/assets/cars/hls/hero",
    // First frame of the video — the poster must match so playback start doesn't jump
    poster: { out: "public/assets/cars/rentals_hero_poster.jpg", width: 1024 },
    rungs: [
      { height: 1080, maxrate: 1600, crf: 23 },
      { height: 540,  maxrate: 700,  crf: 24 },
    ],
  },
  {
    source: "public/assets/cars/rentals_hero_mobile.mp4",
    outDir: "public/assets/cars/hls/hero_mobile",
    poster: { out: "public/assets/cars/rentals_hero_mobile_poster.jpg", width: 640 },
    rungs: [
      { height: 1280, maxrate: 1200, crf: 23 },
      { height: 640,  maxrate: 500,  crf: 24 },
    ],
  },
];

function ffprobeDims(file) {
  const ffprobePath = process.env.FFPROBE_PATH ?? require("@ffprobe-installer/ffprobe").path;
  const out = execFileSync(ffprobePath, [
    "-v", "quiet", "-print_format", "json", "-show_streams", file,
  ]).toString();
  const video = JSON.parse(out).streams.find(s => s.codec_type === "video");
  return { width: video.width, height: video.height };
}

for (const { source, outDir, rungs, poster } of VIDEOS) {
  const src = path.join(FRONT, source);
  const dir = path.join(FRONT, outDir);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const { width, height } = ffprobeDims(src);
  console.log(`\n${source} (${width}x${height})`);

  for (const rung of rungs) {
    const name = `${rung.height}p`;
    console.log(`  encoding ${name} (maxrate ${rung.maxrate}k)…`);
    execFileSync(ffmpegPath, [
      "-y", "-i", src,
      "-c:v", "libx264", "-preset", "medium", "-profile:v", "main",
      "-vf", `scale=-2:${rung.height}`,
      "-crf", String(rung.crf),
      "-maxrate", `${rung.maxrate}k`, "-bufsize", `${rung.maxrate * 2}k`,
      "-g", String(SEGMENT_SECONDS * 30), "-keyint_min", String(SEGMENT_SECONDS * 30), "-sc_threshold", "0",
      "-an",
      "-hls_time", String(SEGMENT_SECONDS),
      "-hls_playlist_type", "vod",
      "-hls_segment_type", "fmp4",
      "-hls_fmp4_init_filename", `${name}_init.mp4`,
      "-hls_segment_filename", path.join(dir, `${name}_%03d.m4s`),
      path.join(dir, `${name}.m3u8`),
    ], { stdio: ["ignore", "ignore", "pipe"] });
  }

  const master = ["#EXTM3U", "#EXT-X-VERSION:7"];
  for (const rung of rungs) {
    const rungWidth = Math.round((width / height) * rung.height / 2) * 2;
    master.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${rung.maxrate * 1000},RESOLUTION=${rungWidth}x${rung.height},CODECS="avc1.4d401f"`,
      `${rung.height}p.m3u8`,
    );
  }
  fs.writeFileSync(path.join(dir, "master.m3u8"), master.join("\n") + "\n");

  const total = fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`  → ${outDir}/master.m3u8 (${(total / 1024 / 1024).toFixed(1)} MB total)`);

  if (poster) {
    const posterPath = path.join(FRONT, poster.out);
    execFileSync(ffmpegPath, [
      "-y", "-i", src,
      "-frames:v", "1",
      "-vf", `scale=${poster.width}:-2`,
      "-q:v", "5",
      posterPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    console.log(`  → ${poster.out} (${(fs.statSync(posterPath).size / 1024).toFixed(0)} KB)`);
  }
}
