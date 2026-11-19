// Blackfin's live percent figure, the one result the site may show (CLAUDE.md, the disclosure table).
//
// GET  /api/blackfin-live -> {"pct": -1.04, "at": "2026-11-16T19:41:00Z"}, or 204 when there is none.
// POST /api/blackfin-live with "Authorization: Bearer <BLACKFIN_FEED_TOKEN>" and the same two fields.
//
// The store keeps exactly those two fields. Anything else in a POST is refused, so a dollar
// value, a ticker or an account detail can never be stored or served by mistake.
// Bindings, set on the Cloudflare Pages project: KV namespace LIVE, secret BLACKFIN_FEED_TOKEN.

const KEY = 'blackfin';
const FRESH_SECONDS = 30;
const MAX_SKEW_MS = 10 * 60 * 1000;
const MAX_BYTES = 200;
const UTC_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

const json = (body, status = 200, extra = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-robots-tag': 'noindex', ...extra },
  });
const readAnswer = (body, status) => json(body, status, { 'cache-control': `public, max-age=${FRESH_SECONDS}` });
const writeAnswer = (body, status) => json(body, status, { 'cache-control': 'no-store' });

// Both sides are hashed first, so the comparison always runs over 32 bytes and timing
// reveals neither the token nor its length.
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x);
  const v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i += 1) diff |= u[i] ^ v[i];
  return diff === 0;
}

// Two places, halves away from zero. The tiny nudge undoes binary float error, so 1.005 gives 1.01.
const twoPlaces = (pct) => (Math.sign(pct) * Math.round(Math.abs(pct) * 100 + 1e-9)) / 100;

const inRange = (pct) => typeof pct === 'number' && Number.isFinite(pct) && pct >= -100 && pct <= 1000;

export function parseReading(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body).sort();
  if (keys.length !== 2 || keys[0] !== 'at' || keys[1] !== 'pct') return null;
  const { pct, at } = body;
  if (!inRange(pct)) return null;
  if (typeof at !== 'string' || !UTC_TIME.test(at)) return null;
  const when = Date.parse(at);
  if (!Number.isFinite(when) || Math.abs(when - now) > MAX_SKEW_MS) return null;
  return { pct: twoPlaces(pct), at: new Date(when).toISOString() };
}

// What is in the store passes the same shape rules on the way out, without the clock check:
// an old reading still serves, and the page says when it was read.
function parseStored(raw) {
  try {
    const { pct, at } = JSON.parse(raw);
    if (!inRange(pct) || typeof at !== 'string' || !UTC_TIME.test(at)) return null;
    const when = Date.parse(at);
    return Number.isFinite(when) ? { pct: twoPlaces(pct), at: new Date(when).toISOString() } : null;
  } catch {
    return null;
  }
}

// Reads at most MAX_BYTES bytes of the body, whatever length it declares. Null means too long.
async function readCapped(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function onRequestGet({ env }) {
  if (!env.LIVE) return readAnswer(null, 204);
  let raw = null;
  try {
    raw = await env.LIVE.get(KEY);
  } catch {
    return readAnswer(null, 204);
  }
  const reading = raw ? parseStored(raw) : null;
  return reading ? readAnswer(reading, 200) : readAnswer(null, 204);
}

export async function onRequestPost({ request, env }) {
  if (!env.LIVE || !env.BLACKFIN_FEED_TOKEN || env.BLACKFIN_FEED_TOKEN.length < 32) return writeAnswer({ error: 'not set up' }, 503);
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!(await sameSecret(token, env.BLACKFIN_FEED_TOKEN))) return writeAnswer({ error: 'no' }, 401);
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return writeAnswer({ error: 'too long' }, 413);
  let text;
  try {
    text = await readCapped(request);
  } catch {
    return writeAnswer({ error: 'not read' }, 400);
  }
  if (text === null) return writeAnswer({ error: 'too long' }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return writeAnswer({ error: 'not json' }, 400);
  }
  const reading = parseReading(body);
  if (!reading) return writeAnswer({ error: 'refused' }, 422);
  try {
    await env.LIVE.put(KEY, JSON.stringify(reading));
  } catch {
    return writeAnswer({ error: 'not stored' }, 503);
  }
  return writeAnswer(null, 204);
}
