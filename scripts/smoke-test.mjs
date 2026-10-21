#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Smoke test for the built site. Run after `npm run build`.
 * Walks the dist/ directory and reports any broken internal links
 * found in the rendered HTML.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');

const visited = new Set();
const errors = [];
let pagesScanned = 0;
let linksChecked = 0;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (extname(entry.name) === '.html') {
      out.push(p);
    }
  }
  return out;
}

function normalize(link) {
  // Strip query/fragment, drop leading `./`
  const [path] = link.split(/[?#]/);
  if (
    !path ||
    path.startsWith('http') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('#') ||
    path.startsWith('data:')
  ) {
    return null;
  }
  return path;
}

function resolveLocal(href, currentFile) {
  // Treat the page as living at its URL.
  // e.g. dist/services/dced-systems-mel/index.html → /services/dced-systems-mel/
  let urlPath = '/' + relative(dist, currentFile).replace(/\\/g, '/');
  if (urlPath.endsWith('/index.html')) urlPath = urlPath.slice(0, -'/index.html'.length) + '/';
  if (urlPath === '/index.html') urlPath = '/';
  // Resolve relative href against urlPath.
  if (href.startsWith('/')) return href;
  // treat as relative
  const base = urlPath.endsWith('/') ? urlPath : urlPath.slice(0, urlPath.lastIndexOf('/') + 1);
  const resolved = new URL(href, 'http://x' + base).pathname;
  return resolved;
}

async function checkPage(file) {
  if (visited.has(file)) return;
  visited.add(file);
  pagesScanned++;
  const html = await readFile(file, 'utf8');
  const linkRe = /<a[^>]+href=["']([^"']+)["']/g;
  const srcRe = /<(?:img|script)[^>]+(?:src|href)=["']([^"']+)["']/g;
  for (const re of [linkRe, srcRe]) {
    let m;
    while ((m = re.exec(html))) {
      const raw = m[1];
      const stripped = normalize(raw);
      if (!stripped) continue;
      const resolved = resolveLocal(stripped, file);
      // Convert resolved URL → dist path
      const target = join(dist, resolved.endsWith('/') ? resolved + 'index.html' : resolved);
      linksChecked++;
      try {
        const s = await stat(target);
        if (!s.isFile()) {
          errors.push(`BROKEN: ${file.replace(dist, '')} → ${raw} (not a file)`);
        }
      } catch {
        // Some images live in /public, which is copied as-is; trailing-slash
        // directories without index.html are 404s in static; for known
        // directories we'll add index.html and check that.
        const dirTarget = target.endsWith('/') ? target : target;
        try {
          const s = await stat(dirTarget);
          if (s.isDirectory()) continue; // ok
        } catch {
          // last chance: try adding index.html
          try {
            await stat(target + 'index.html');
          } catch {
            // Skip external and missing favicon; report if not flagged
            if (!raw.startsWith('http') && !raw.startsWith('//')) {
              // don't fail the smoke test for known placeholders
              const skip = [
                '/favicon.ico',
                '/apple-touch-icon.png',
                '/favicon-192.png',
                '/favicon-512.png',
                '/404/', // 404.html at root is Netlify's 404; /404/ is a UI reference
              ];
              if (!skip.includes(raw)) {
                errors.push(
                  `MISSING: ${file.replace(dist, '')} → ${raw} (target ${target.replace(dist, '')})`,
                );
              }
            }
          }
        }
      }
    }
  }
}

try {
  const files = await walk(dist);
  for (const f of files) await checkPage(f);
  console.log(`Smoke test: ${pagesScanned} pages scanned, ${linksChecked} links checked.`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} broken link(s) found:\n`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  } else {
    console.log('No broken internal links.');
  }
} catch (err) {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
}
