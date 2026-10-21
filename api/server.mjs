/**
 * merstat-api — the only server-side process this site needs.
 *
 * Replaces the two Netlify services the site depended on:
 *   - Netlify Forms        -> POST /api/forms/:name   (see forms.mjs)
 *   - Netlify Function     -> POST /api/presign       (see presign.mjs)
 *
 * No framework: this is two routes and some JSON. Runs under PM2 on
 * 127.0.0.1:3011; nginx proxies /api/ to it. It never listens on a public
 * interface, so it needs no UFW rule and has no TLS of its own — the
 * security headers, CSP and rate limiting all live in the nginx vhost.
 *
 * Health: GET /api/health -> { ok: true }
 */
import { createServer } from 'node:http';
import { handleForm } from './forms.mjs';
import { handlePresign } from './presign.mjs';

const PORT = Number(process.env.PORT || 3011);
const HOST = process.env.HOST || '127.0.0.1';

// Refuse oversized bodies before parsing them. Turnstile tokens are small and
// CVs go straight to R2, so nothing legitimate is anywhere near this.
const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = createServer(async (req, res) => {
  // Reject oversized bodies before parsing them. Turnstile tokens are small and
  // CVs go straight to R2, so nothing legitimate is anywhere near this.
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    req.destroy();
    return sendJson(res, 413, { error: 'Payload too large' });
  }

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return sendJson(res, 400, { error: 'Bad request' });
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'merstat-api' });
  }

  let result;
  try {
    if (path === '/api/presign') {
      result = await handlePresign(req);
    } else if (path.startsWith('/api/forms/')) {
      const name = path.slice('/api/forms/'.length);
      result = await handleForm(req, name, url);
    } else {
      return sendJson(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    // Never leak stack traces to the client.
    console.error('[merstat-api] unhandled:', err);
    return sendJson(res, 500, { error: 'Internal error' });
  }

  if (result.redirect) {
    res.writeHead(result.status, { Location: result.redirect });
    return res.end();
  }
  return sendJson(res, result.status, result.payload ?? { error: result.error });
});

server.listen(PORT, HOST, () => {
  console.log(`merstat-api listening on ${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
