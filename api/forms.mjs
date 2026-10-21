/**
 * /api/forms/:name — Replaces Netlify Forms.
 *
 * Netlify detected the forms at build time from `data-netlify="true"`,
 * stored submissions itself, and redirected to the form's `action` URL.
 * That service does not exist off Netlify, so this handler does the same job:
 *
 *   1. Rejects anything that filled the `bot-field` honeypot.
 *   2. Verifies the Cloudflare Turnstile token. This is new — Netlify
 *      validated the token for us and no code in this repo ever called
 *      `siteverify`, so moving off Netlify is what forces it to be written.
 *   3. Records the submission (JSONL under shared/form-submissions) and
 *      emails it to the notification address.
 *   4. 302s to /thanks?intent=X, preserving the query.
 *
 * Step 4 matters more than it looks: thanks.astro picks its headline from
 * `?intent=`. A bare redirect to /thanks/ makes every visitor see the
 * generic message regardless of which form they filled in.
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { header, parseFormFields } from './request.mjs';

const MAX_BODY_BYTES = 1024 * 1024;

const KNOWN_FORMS = new Set(['contact', 'careers', 'training']);

// Turnstile's test key: always passes verification. Using it in production
// means the site appears protected while accepting every bot.
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const NOTIFY_EMAIL = process.env.FORM_NOTIFY_EMAIL || 'info@merstat.org';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://merstat.org')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function submissionsDir() {
  return (
    process.env.FORM_SUBMISSIONS_DIR ||
    join(dirname(new URL(import.meta.url).pathname), '..', 'shared', 'form-submissions')
  );
}

export function originAllowed(request) {
  const origin = header(request, 'origin');
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Verifies the Turnstile token with Cloudflare.
 *
 * Returns true when the secret is the always-pass test key, which is how a
 * developer runs this locally. In production a real secret is configured and
 * the token is genuinely checked.
 */
export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (secret === TEST_SECRET) return true;

  const params = new URLSearchParams({ secret });
  if (token) params.set('response', token);
  if (ip) params.set('remoteip', ip);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    // Fail closed. A submission that cannot be verified is not a submission
    // we should accept — silently passing it would reintroduce the open-door
    // problem this endpoint exists to close.
    return false;
  }
}

function clientIp(request) {
  const forwarded = header(request, 'x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return header(request, 'x-real-ip') || '';
}

/** Turns a submission into a plain-text email body. */
function renderEmail(formName, fields, meta) {
  const lines = [`New ${formName} submission via merstat.org`, `Received: ${meta.receivedAt}`];
  if (meta.ip) lines.push(`IP: ${meta.ip}`);
  lines.push('', '---', '');
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'bot-field' || key === 'form-name' || key.startsWith('cf-')) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach((v) => lines.push(`  - ${v}`));
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * Best-effort notification. A mail failure must not lose the submission, so
 * the JSONL write happens first and this runs second.
 */
async function notify(formName, fields, meta) {
  const host = process.env.SMTP_HOST;
  if (!host) return;
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.FORM_FROM || 'website@merstat.org',
      to: NOTIFY_EMAIL,
      replyTo: process.env.FORM_REPLY_TO || undefined,
      subject: `[merstat.org] ${formName} submission`,
      text: renderEmail(formName, fields, meta),
    });
  } catch (err) {
    console.error('[forms] notification failed:', err?.message || err);
  }
}

export async function handleForm(request, formName, url) {
  if (request.method !== 'POST') {
    return { error: 'Method not allowed', status: 405 };
  }

  if (!KNOWN_FORMS.has(formName)) {
    return { error: 'Unknown form', status: 404 };
  }

  // Same-origin check. A cross-site POST would let a third-party page
  // submit forms using our visitor's session and IP reputation.
  if (!originAllowed(request)) {
    return { error: 'Origin not allowed', status: 403 };
  }

  let fields;
  try {
    fields = await parseFormFields(request, MAX_BODY_BYTES);
  } catch {
    return { error: 'Invalid form body', status: 400 };
  }

  if ('bot-field' in fields && String(fields['bot-field']).trim() !== '') {
    // Honeypot tripped — respond as if it worked so bots get no signal that
    // they were detected. Nothing is stored and nothing is emailed.
    const honeypotIntent = url.searchParams.get('intent') || 'general';
    return { redirect: `/thanks/?intent=${encodeURIComponent(honeypotIntent)}`, status: 302 };
  }

  if (fields['form-name'] !== formName) {
    return { error: 'form-name mismatch', status: 400 };
  }

  const ip = clientIp(request);
  const token = fields['cf-turnstile-response'];
  const verified = await verifyTurnstile(token, ip);

  if (!verified) {
    console.warn(`[forms] ${formName} submission rejected: turnstile failed (ip ${ip})`);
    return { error: 'Spam check failed', status: 400 };
  }

  const meta = { receivedAt: new Date().toISOString(), ip };
  const dir = submissionsDir();
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify({ form: formName, fields, meta }) + '\n';
  await appendFile(join(dir, `${formName}.jsonl`), line, { mode: 0o640 });

  await notify(formName, fields, meta);

  const intent = url.searchParams.get('intent') || 'general';
  return { redirect: `/thanks/?intent=${encodeURIComponent(intent)}`, status: 302 };
}
