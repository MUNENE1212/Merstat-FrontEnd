/**
 * /scripts/generate-icons — Rasterises public/favicon.svg into the raster
 * icons that <SEO /> and the web manifest reference.
 *
 * public/ ships favicon.svg only, but SEO.astro links /favicon.ico and
 * /apple-touch-icon.png and manifest.webmanifest lists /favicon-192.png
 * and /favicon-512.png. All four 404'd in production, which Lighthouse
 * reports as an errors-in-console failure on every page.
 *
 * Run after editing public/favicon.svg:
 *   node scripts/generate-icons.mjs
 *
 * Uses sharp, which is already a dependency (Astro's image pipeline).
 * The generated files are committed so a plain `astro build` needs no
 * image tooling.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SOURCE = join(PUBLIC_DIR, 'favicon.svg');

/**
 * Wraps PNG buffers in an ICO container. ICO allows PNG-encoded entries
 * for sizes >= 256 and every modern browser accepts PNG-in-ICO at any
 * size, so this avoids pulling in a second image dependency.
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((e) => e.data)]);
}

async function renderPng(size, { flatten } = {}) {
  let pipeline = sharp(readFileSync(SOURCE), { density: 384 }).resize(size, size);
  // iOS renders a transparent icon over black; composite onto brand blue.
  if (flatten) pipeline = pipeline.flatten({ background: '#003366' });
  return pipeline.png().toBuffer();
}

async function main() {
  const written = [];

  for (const size of [192, 512]) {
    const file = `favicon-${size}.png`;
    writeFileSync(join(PUBLIC_DIR, file), await renderPng(size));
    written.push(file);
  }

  const appleFile = 'apple-touch-icon.png';
  writeFileSync(join(PUBLIC_DIR, appleFile), await renderPng(180, { flatten: true }));
  written.push(appleFile);

  const icoSizes = [16, 32, 48];
  const icoEntries = [];
  for (const size of icoSizes) {
    icoEntries.push({ size, data: await renderPng(size) });
  }
  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), buildIco(icoEntries));
  written.push('favicon.ico');

  console.log(`Generated from ${SOURCE}:\n  ${written.join('\n  ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
