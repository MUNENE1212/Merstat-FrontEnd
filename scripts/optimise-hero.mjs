/**
 * /scripts/optimise-hero — Recompress the decorative page-background image.
 *
 * Lighthouse's image-delivery audit flagged public/images/hero.webp at
 * 57 KB with 18.8 KB of avoidable bytes. The image renders behind an
 * 88%-opaque overlay (.page-overlay--base in BaseLayout.astro), so it
 * functions as a faint texture: compression artefacts and banding are
 * not visible to a viewer.
 *
 * Re-encodes the hero variants in place at a quality that clears the
 * audit. Run after replacing the source artwork:
 *   npm run images:optimise
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const IMAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');

// Quality 48 lands hero.webp at ~37 KB, under the ~38 KB ceiling the
// image-delivery audit enforces. Lower settings were not used: the audit
// measures bytes, and pushing past 48 buys a handful of KB at a visible
// cost for no user benefit behind an 88% overlay.
const QUALITY = 48;
const EFFORT = 6;

const VARIANTS = ['hero.webp', 'hero-800.webp', 'hero-1200.webp'];

async function main() {
  for (const name of VARIANTS) {
    const path = join(IMAGES_DIR, name);
    const before = statSync(path).size;
    const out = await sharp(readFileSync(path), { effort: EFFORT })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toBuffer();
    writeFileSync(path, out);
    const saved = Math.round((1 - out.length / before) * 100);
    console.log(`${name}: ${before} -> ${out.length} bytes (-${saved}%)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
