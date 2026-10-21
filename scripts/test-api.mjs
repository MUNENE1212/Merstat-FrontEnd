/**
 * /scripts/test-api — Exercises merstat-api over real HTTP.
 *
 * Runs the server in-process and drives it through node:http, so this covers
 * the actual Node `IncomingMessage` path rather than the Web `Request` shape
 * the handlers are written against. Those two differ enough to hide real bugs
 * (it is how a missing constant came to look like "Invalid JSON").
 *
 *   node scripts/test-api.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3199;
const ORIGIN = 'https://merstat.org';

const submissionsDir = mkdtempSync(join(tmpdir(), 'merstat-api-test-'));

// Turnstile's always-pass test key, so verification passes without a network
// call. The "real" secret path is exercised by omitting it entirely.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n         expected ${expected}, got ${actual}`);
  }
}

/** POSTs and returns { status, location, body }. */
async function post(path, { body, headers = {} } = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method: 'POST',
    headers: { Origin: ORIGIN, ...headers },
    body,
    redirect: 'manual',
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, location: res.headers.get('location'), body: parsed };
}

async function waitForServer(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const server = spawn(process.execPath, [join(ROOT, 'api', 'server.mjs')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    ALLOWED_ORIGINS: ORIGIN,
    TURNSTILE_SECRET_KEY: TEST_SECRET,
    FORM_SUBMISSIONS_DIR: submissionsDir,
  },
  stdio: ['ignore', 'ignore', 'inherit'],
});

try {
  if (!(await waitForServer())) throw new Error('server did not start');

  console.log('\nhealth');
  const health = await fetch(`http://127.0.0.1:${PORT}/api/health`).then((r) => r.json());
  check('reports ok', health.ok, true);

  console.log('\n/api/presign — access control');
  const noOrigin = await post('/api/presign', {
    body: JSON.stringify({ filename: 'cv.pdf', contentType: 'application/pdf', size: 100 }),
    headers: { Origin: '', 'Content-Type': 'application/json' },
  });
  check('rejects missing Origin', noOrigin.status, 403);

  const evil = await post('/api/presign', {
    body: JSON.stringify({ filename: 'cv.pdf', contentType: 'application/pdf', size: 100 }),
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
  });
  check('rejects foreign Origin', evil.status, 403);

  console.log('\n/api/presign — validation');
  const badJson = await post('/api/presign', {
    body: 'not json',
    headers: { 'Content-Type': 'application/json' },
  });
  check('rejects malformed JSON', badJson.status, 400);

  const badExt = await post('/api/presign', {
    body: JSON.stringify({ filename: 'payload.exe', contentType: 'application/pdf', size: 100 }),
    headers: { 'Content-Type': 'application/json' },
  });
  check('rejects bad extension', badExt.status, 415);

  const badMime = await post('/api/presign', {
    body: JSON.stringify({
      filename: 'cv.pdf',
      contentType: 'application/x-msdownload',
      size: 100,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
  check('rejects bad MIME type', badMime.status, 415);

  const oversize = await post('/api/presign', {
    body: JSON.stringify({ filename: 'cv.pdf', contentType: 'application/pdf', size: 99_999_999 }),
    headers: { 'Content-Type': 'application/json' },
  });
  check('rejects oversize claim', oversize.status, 413);

  const wrongMethod = await fetch(`http://127.0.0.1:${PORT}/api/presign`);
  check('rejects GET', wrongMethod.status, 405);

  console.log('\n/api/forms — access control');
  const crossOrigin = await post('/api/forms/contact', {
    body: 'form-name=contact&cf-turnstile-response=x',
    headers: { Origin: 'https://evil.example' },
  });
  check('rejects cross-origin submit', crossOrigin.status, 403);

  const unknownForm = await post('/api/forms/nope', {
    body: 'form-name=nope&cf-turnstile-response=x',
  });
  check('rejects unknown form name', unknownForm.status, 404);

  console.log('\n/api/forms — spam handling');
  const honeypot = await post('/api/forms/contact?intent=careers', {
    body: 'form-name=contact&bot-field=gotcha&email=a@b.c',
  });
  check('honeypot returns a decoy 302', honeypot.status, 302);
  check('decoy preserves intent', honeypot.location, '/thanks/?intent=careers');

  const mismatch = await post('/api/forms/contact', {
    body: 'form-name=WRONG&cf-turnstile-response=x',
  });
  check('rejects form-name mismatch', mismatch.status, 400);

  console.log('\n/api/forms — happy path');
  const valid = await post('/api/forms/training?intent=training', {
    body: 'form-name=training&name=Jane+Doe&cf-turnstile-response=x',
  });
  check('accepts valid submission', valid.status, 302);
  check('preserves intent in redirect', valid.location, '/thanks/?intent=training');

  const noIntent = await post('/api/forms/contact', {
    body: 'form-name=contact&email=a@b.c&cf-turnstile-response=x',
  });
  check('defaults intent when absent', noIntent.location, '/thanks/?intent=general');

  console.log('\nstorage — honeypot must not persist');
  const files = readdirSync(submissionsDir);
  check('only the legitimate form wrote a file', files.join(','), 'contact.jsonl,training.jsonl');
  const training = readFileSync(join(submissionsDir, 'training.jsonl'), 'utf8').trim();
  check('stored the submitted fields', training.includes('Jane Doe'), true);
  const contact = readFileSync(join(submissionsDir, 'contact.jsonl'), 'utf8');
  check('honeypot entry never reached disk', contact.includes('gotcha'), false);

  console.log('\nTurnstile — fails closed without a secret');
  const noSecret = spawn(process.execPath, [join(ROOT, 'api', 'server.mjs')], {
    env: {
      ...process.env,
      PORT: '3198',
      HOST: '127.0.0.1',
      ALLOWED_ORIGINS: ORIGIN,
      TURNSTILE_SECRET_KEY: '',
      FORM_SUBMISSIONS_DIR: submissionsDir,
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      try {
        up = (await fetch('http://127.0.0.1:3198/api/health')).ok;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const res = await fetch('http://127.0.0.1:3198/api/forms/contact', {
      method: 'POST',
      headers: { Origin: ORIGIN },
      body: 'form-name=contact&email=a@b.c',
      redirect: 'manual',
    });
    check('rejects submission when no secret configured', res.status, 400);
  } finally {
    noSecret.kill();
  }
} finally {
  server.kill();
  rmSync(submissionsDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
