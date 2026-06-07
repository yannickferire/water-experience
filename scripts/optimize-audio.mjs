// Trim + compress the season tracks. Requires ffmpeg on PATH (brew install ffmpeg).
// Usage: npm run optimize:audio   (optionally: SECONDS=40 BITRATE=112k npm run optimize:audio)
//
// The first run backs up each full track to `<name>.orig.mp3` and ALWAYS encodes
// from that backup, so you can re-run at any duration without losing quality.
import { execFileSync } from "node:child_process";
import { renameSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/audio";
const SECONDS = process.env.SECONDS ?? "40";
const BITRATE = process.env.BITRATE ?? "112k";
const TRACKS = ["spring", "summer", "autumn", "winter"];

for (const t of TRACKS) {
  const src = join(DIR, `${t}.mp3`);
  const orig = join(DIR, `${t}.orig.mp3`);

  if (!existsSync(orig)) {
    if (!existsSync(src)) {
      console.warn(`skip ${t}.mp3 (missing)`);
      continue;
    }
    copyFileSync(src, orig); // keep the full-length source once
  }

  const tmp = join(DIR, `${t}.opt.mp3`);
  console.log(`Optimizing ${t}.mp3 -> ${SECONDS}s @ ${BITRATE}`);
  // encode FROM the preserved original; -t trims, re-encode to bitrate, stereo.
  execFileSync(
    "ffmpeg",
    ["-y", "-i", orig, "-t", SECONDS, "-b:a", BITRATE, "-ac", "2", tmp],
    { stdio: "inherit" }
  );
  renameSync(tmp, src);
}
console.log("Done.");
