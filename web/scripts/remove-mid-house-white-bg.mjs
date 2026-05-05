/**
 * Removes an outer white (or near-white) background from Mid_House PNGs by
 * flood-filling from the image edges, so interior white details can stay.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOUSES = path.join(__dirname, "../public/houses");

/** Pixels with R,G,B all >= this value are treated as "background" if reached from an edge. */
const BG_MIN = 250;

function isBackground(r, g, b) {
  return r >= BG_MIN && g >= BG_MIN && b >= BG_MIN;
}

/**
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 */
function removeEdgeConnectedNearWhite(data, width, height) {
  const px = new Uint8Array(data); // copy into typed array for indexes
  const n = width * height;
  const seen = new Uint8Array(n);
  /** @type {number[]} */
  const q = [];

  function idx(x, y) {
    return (y * width + x) * 4;
  }

  function pushEdge(x, y) {
    const i = idx(x, y);
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (!isBackground(r, g, b)) return;
    const p = y * width + x;
    if (seen[p]) return;
    seen[p] = 1;
    q.push(p);
  }

  for (let x = 0; x < width; x++) {
    pushEdge(x, 0);
    pushEdge(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushEdge(0, y);
    pushEdge(width - 1, y);
  }

  let head = 0;
  while (head < q.length) {
    const p = q[head++];
    const x = p % width;
    const y = (p / width) | 0;
    const i = idx(x, y);
    px[i + 3] = 0;

    const tryN = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const np = ny * width + nx;
      if (seen[np]) return;
      const j = idx(nx, ny);
      if (!isBackground(px[j], px[j + 1], px[j + 2])) return;
      seen[np] = 1;
      q.push(np);
    };
    tryN(x + 1, y);
    tryN(x - 1, y);
    tryN(x, y + 1);
    tryN(x, y - 1);
  }

  return Buffer.from(px);
}

async function processFile(file) {
  const inPath = path.join(HOUSES, file);
  const { data, info } = await sharp(inPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) {
    throw new Error(`Expected RGBA, got ${info.channels} channels: ${file}`);
  }

  const out = removeEdgeConnectedNearWhite(data, info.width, info.height);
  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(inPath);

  console.log(`OK ${file} (${info.width}x${info.height})`);
}

const files = fs
  .readdirSync(HOUSES)
  .filter((f) => /^Mid_House_.*\.png$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error("No Mid_House_*.png files found in", HOUSES);
  process.exit(1);
}

for (const f of files) {
  await processFile(f);
}

console.log(`Done: ${files.length} file(s).`);
