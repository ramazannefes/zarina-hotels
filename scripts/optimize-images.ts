/**
 * One-off script: convert the 24 raw ChatGPT PNG exports into optimized WebP
 * files with descriptive, category-based names under public/images/zarina/.
 *
 * Categories (from visual inspection of the contact sheet):
 *   lobby, rooms (x15), spa/hamam (x6), restaurant, bathroom
 *
 * Run: npx tsx scripts/optimize-images.ts
 */
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "public/images/zarina";
const OUT_DIR = "public/images/zarina/web";

/** Descriptive names indexed by the original copy order (img-01 .. img-24). */
const NAMES: Record<string, string> = {
  "01": "lobby-red-lounge",
  "02": "room-standard-twin",
  "03": "room-double-classic",
  "04": "room-deluxe-red-accent",
  "05": "spa-relax-lounge",
  "06": "room-comfort-double",
  "07": "room-superior-double",
  "08": "room-twin-bright",
  "09": "room-double-workdesk",
  "10": "hamam-indoor-pool",
  "11": "room-twin-city",
  "12": "room-family-terrace",
  "13": "room-double-garden",
  "14": "restaurant-dining",
  "15": "room-single-city",
  "16": "room-suite-red-panel",
  "17": "room-double-terrace",
  "18": "hamam-sauna",
  "19": "hamam-marble-pool",
  "20": "room-junior-suite",
  "21": "bathroom-shower",
  "22": "spa-towel-lounge",
  "23": "spa-massage-room",
  "24": "room-double-entry",
};

/** Widths kept for each image; gallery thumbs reuse the same file via next/image. */
const TARGET_WIDTH = 1920;
const QUALITY = 78;

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SRC_DIR)).filter((f) => /^img-\d{2}\.png$/.test(f));
  if (files.length === 0) {
    console.error(`No raw img-XX.png files found in ${SRC_DIR}`);
    process.exit(1);
  }

  let totalIn = 0;
  let totalOut = 0;

  for (const file of files) {
    const idx = file.match(/img-(\d{2})\.png/)?.[1];
    if (!idx || !NAMES[idx]) {
      console.warn(`Skipping ${file}: no descriptive name mapping`);
      continue;
    }
    const outName = `${NAMES[idx]}.webp`;
    const inPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, outName);

    const inSize = (await import("node:fs/promises")).stat(inPath).then((s) => s.size);
    const info = await sharp(inPath)
      .rotate() // respect EXIF orientation
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);

    const inBytes = await inSize;
    totalIn += inBytes;
    totalOut += info.size;
    console.log(`${file} -> ${outName}  ${(inBytes / 1024 / 1024).toFixed(1)}MB -> ${(info.size / 1024).toFixed(0)}KB  (${info.width}x${info.height})`);
  }

  console.log(`\nDone: ${files.length} images. Total ${(totalIn / 1024 / 1024).toFixed(1)}MB -> ${(totalOut / 1024 / 1024).toFixed(2)}MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
