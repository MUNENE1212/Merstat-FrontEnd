/**
 * /api/presign — Issues a presigned PUT URL for Cloudflare R2 so the
 * careers form can upload CVs directly, bypassing the form handler entirely.
 *
 * Browser posts:
 *   { filename, contentType, size }
 *
 * Responds:
 *   { uploadUrl, publicUrl }
 *
 * This replaces netlify/functions/r2-presign.mjs. The signing logic is
 * carried over unchanged; the handler is rewritten to the Web-standard
 * Request/Response shape used by merstat-api.
 *
 * SECURITY — the origin check is the important change. The Netlify version
 * documented "Origin check (handled by Netlify)", which was true there and
 * is false here: off Netlify nothing validates the caller, and this endpoint
 * would hand out anonymous upload URLs for your CV bucket. `allowedOrigins`
 * below is now the only thing standing between a stranger and a write.
 *
 *   - Origin allow-list (see ALLOWED_ORIGINS below)
 *   - 5-minute TTL on the presigned URL
 *   - 10 MB cap on upload size
 *   - MIME + extension allow-lists
 *   - Random unguessable key (UUID + sanitised filename)
 */
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { parseJsonBody, header } from './request.mjs';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const TTL_SECONDS = 5 * 60;
// The request body here is just { filename, contentType, size } — a few
// hundred bytes. This cap exists to stop a huge body being buffered before
// the size checks below ever run.
const MAX_BODY_BYTES = 64 * 1024;

// Origins permitted to request an upload URL. Kept as an explicit list rather
// than reflecting the request's Host header, because Host is attacker-supplied
// — reflecting it would make the check a no-op.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://merstat.org')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function sanitizeFilename(name) {
  return name.replace(/[^\w.\-]/g, '_').slice(-80) || 'upload';
}

/**
 * Returns true when the request has an Origin we recognise. Requests with no
 * Origin header (curl, some crawlers) are rejected: a browser form POST or
 * fetch from our own page always sends one.
 */
export function originAllowed(request) {
  const origin = header(request, 'origin');
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export function readConfig() {
  return {
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    region: process.env.R2_REGION || 'auto',
    publicBase: process.env.R2_PUBLIC_BASE || '',
  };
}

// Only `host` is signed, so the content type is deliberately not part of the
// signature — that is what lets the browser PUT the file with its own
// Content-Type header without the signature becoming invalid.
async function signR2PutUrl({ key, expiresIn }) {
  const { endpoint, accessKeyId, secretAccessKey, bucket, region } = readConfig();

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 credentials missing');
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = new URL(endpoint).host;
  const objectKey = `${key}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const signedHeaders = 'host';
  const algorithm = 'AWS4-HMAC-SHA256';

  const canonicalUri = `/${bucket}/${objectKey}`.replace(/\/+/g, '/');
  const canonicalHeaders = `host:${host}\n`;
  const signedHeadersStr = signedHeaders;
  const algorithmQuery =
    `X-Amz-Algorithm=${algorithm}` +
    `&X-Amz-Credential=${encodeURIComponent(accessKeyId + '/' + credentialScope)}` +
    `&X-Amz-Date=${amzDate}` +
    `&X-Amz-Expires=${expiresIn}` +
    `&X-Amz-SignedHeaders=${signedHeadersStr}`;

  const params = new URLSearchParams();
  Object.entries({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': signedHeadersStr,
  }).forEach(([k, v]) => params.set(k, v));

  const canonicalRequest =
    `PUT\n` +
    `${canonicalUri}\n` +
    `${algorithmQuery}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeadersStr}\n` +
    `UNSIGNED-PAYLOAD`;

  const hashedCanonical = createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonical}`;
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  params.set('X-Amz-Signature', signature);
  return `${endpoint.replace(/\/$/, '')}${canonicalUri}?${params.toString()}`;
}

/**
 * Validates the request and returns either a Response or the presign payload.
 * Kept separate from the HTTP server so it can be tested directly.
 */
export async function handlePresign(request) {
  if (request.method !== 'POST') {
    return { error: 'Method not allowed', status: 405 };
  }

  if (!originAllowed(request)) {
    return { error: 'Origin not allowed', status: 403 };
  }

  let body;
  try {
    body = await parseJsonBody(request, MAX_BODY_BYTES);
  } catch (err) {
    // Only malformed JSON is the caller's fault. A ReferenceError or a bug
    // in here must surface as a 500, not masquerade as a bad request.
    if (err instanceof SyntaxError) return { error: 'Invalid JSON', status: 400 };
    console.error('[presign] body read failed:', err);
    return { error: 'Internal error', status: 500 };
  }

  const { filename, contentType, size } = body || {};

  if (!filename || !contentType) {
    return { error: 'filename and contentType are required', status: 400 };
  }
  if (size && size > MAX_BYTES) {
    return { error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB cap`, status: 413 };
  }
  if (!ALLOWED_MIME.has(contentType)) {
    return { error: 'Unsupported file type', status: 415 };
  }

  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { error: 'Unsupported file extension', status: 415 };
  }

  const safeName = sanitizeFilename(filename);
  const objectKey = `cvs/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await signR2PutUrl({ key: objectKey, expiresIn: TTL_SECONDS });
    const { publicBase } = readConfig();
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${objectKey}`;
    return {
      status: 200,
      payload: { uploadUrl, publicUrl, expiresIn: TTL_SECONDS },
    };
  } catch {
    return { error: 'Failed to sign upload URL', status: 500 };
  }
}
