/**
 * Shared request helpers for merstat-api.
 *
 * The handlers are written against the Web `Request` shape (headers.get,
 * .json(), .formData()) because that is what makes them trivially testable.
 * In production they are called with a Node `IncomingMessage`, which shares
 * none of those conveniences. These helpers accept either and normalise the
 * differences, so neither the handlers nor their tests have to care.
 */
/**
 * Reads a header from either a Web `Request` (`.headers.get`) or a Node
 * `IncomingMessage` (`.headers` is a plain lowercase-keyed object).
 */
export function header(request, name) {
  const h = request?.headers;
  if (h && typeof h.get === 'function') return h.get(name);
  if (h) return h[name.toLowerCase()] ?? undefined;
  return undefined;
}

/** True when this looks like a Web Request rather than a Node IncomingMessage. */
function isWebRequest(req) {
  return typeof req?.json === 'function' || typeof req?.formData === 'function';
}

/** Reads the raw request body as a Buffer. Returns empty for a web Request. */
async function readRawBody(req, limit) {
  if (isWebRequest(req)) {
    // A web Request has already buffered the body; the handlers call its own
    // .json()/.formData() instead, so there is nothing to read here.
    return Buffer.alloc(0);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Parses an `application/x-www-form-urlencoded` body into a plain object.
 * Repeating keys (checkbox groups, multi-select) collapse into an array,
 * matching how a browser would submit them.
 */
export function parseUrlEncoded(text) {
  const params = new URLSearchParams(text);
  const out = {};
  for (const [key, value] of params.entries()) {
    if (key in out) {
      out[key] = Array.isArray(out[key]) ? [...out[key], value] : [out[key], value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Minimal multipart/form-data parser.
 *
 * Node 20+ ships `Request.formData()` via undici, so the simplest correct
 * implementation is to hand the raw bytes to the platform parser rather than
 * hand-roll boundary splitting. That avoids a whole class of bugs around
 * boundary quoting, CRLF handling and binary content in the CV field.
 */
async function parseMultipart(raw, contentType) {
  // Validate the boundary is present before handing off — undici's parser
  // throws an opaque error otherwise.
  if (!/boundary=(?:"[^"]+"|[^;]+)/i.test(contentType)) {
    throw new Error('Missing multipart boundary');
  }

  const webRequest = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: raw,
  });
  const formData = await webRequest.formData();

  const out = {};
  for (const [key, value] of formData.entries()) {
    const v = typeof value === 'string' ? value : value.name;
    if (key in out) {
      out[key] = Array.isArray(out[key]) ? [...out[key], v] : [out[key], v];
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Parses a request body into `{ name, value }` fields. */
export async function parseFormFields(req, limit) {
  if (isWebRequest(req)) {
    const formData = await req.formData();
    const out = {};
    for (const [key, value] of formData.entries()) {
      out[key] = typeof value === 'string' ? value : value.name;
    }
    return out;
  }

  const contentType = header(req, 'content-type') || '';
  const raw = await readRawBody(req, limit);

  if (contentType.includes('multipart/form-data')) {
    return parseMultipart(raw, contentType);
  }
  return parseUrlEncoded(raw.toString('utf8'));
}

/** Parses a JSON request body. */
export async function parseJsonBody(req, limit) {
  if (isWebRequest(req)) return await req.json();
  const raw = await readRawBody(req, limit);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}
