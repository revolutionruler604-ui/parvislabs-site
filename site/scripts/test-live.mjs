// Tests for the Blackfin live figure endpoint: what it stores, what it refuses, and who may write.
import assert from 'node:assert/strict';
import { parseReading, onRequestGet, onRequestPost } from '../functions/api/blackfin-live.js';
import { isLive } from '../src/scripts/live.js';

const now = Date.parse('2026-11-16T19:41:00Z');
let n = 0;
const ok = (cond, name) => { assert.ok(cond, name); n += 1; };

// What a reading may hold.
ok(parseReading({ pct: -1.04, at: '2026-11-16T19:41:00Z' }, now)?.pct === -1.04, 'a plain reading passes');
ok(parseReading({ pct: 0.123456, at: '2026-11-16T19:41:00Z' }, now)?.pct === 0.12, 'rounded to two places');
ok(parseReading({ at: '2026-11-16T19:41:00Z', pct: 2 }, now) !== null, 'field order does not matter');
ok(parseReading({ pct: -1, at: '2026-11-16T19:41:00Z', value: 512.4 }, now) === null, 'a third field, such as a dollar value, is refused');
ok(parseReading({ pct: -1, at: '2026-11-16T19:41:00Z', ticker: 'ABC' }, now) === null, 'a ticker is refused');
ok(parseReading({ pct: '-1', at: '2026-11-16T19:41:00Z' }, now) === null, 'a percent sent as text is refused');
ok(parseReading({ pct: NaN, at: '2026-11-16T19:41:00Z' }, now) === null, 'NaN is refused');
ok(parseReading({ pct: -100.01, at: '2026-11-16T19:41:00Z' }, now) === null, 'below minus 100 is refused');
ok(parseReading({ pct: 1000.01, at: '2026-11-16T19:41:00Z' }, now) === null, 'above 1000 is refused');
ok(parseReading({ pct: -1, at: '2026-11-16T19:20:00Z' }, now) === null, 'a reading 21 minutes old is refused');
ok(parseReading({ pct: -1, at: '2026-11-16T14:41:00-05:00' }, now) === null, 'a time not in UTC is refused');
ok(parseReading([1, 2], now) === null, 'an array is refused');
ok(parseReading(null, now) === null, 'null is refused');

// A tiny stand-in for the KV store.
const store = () => {
  const m = new Map();
  return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m };
};
const token = 'x'.repeat(40);
const post = (body, auth = `Bearer ${token}`) =>
  new Request('https://example.test/api/blackfin-live', {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const fresh = () => ({ pct: -0.5, at: new Date().toISOString() });

{
  const LIVE = store();
  const env = { LIVE, BLACKFIN_FEED_TOKEN: token };
  ok((await onRequestGet({ env })).status === 204, 'nothing stored yet: 204');
  ok((await onRequestPost({ request: post(fresh(), 'Bearer wrong'), env })).status === 401, 'a wrong token is refused');
  ok((await onRequestPost({ request: post(fresh(), ''), env })).status === 401, 'no token is refused');
  ok((await onRequestPost({ request: post(fresh(), `Bearer ${token}x`), env })).status === 401, 'a longer token is refused');
  ok(LIVE.m.size === 0, 'refused writes store nothing');
  ok((await onRequestPost({ request: post({ ...fresh(), dollars: 9 }), env })).status === 422, 'an extra field is refused');
  ok((await onRequestPost({ request: post('x'.repeat(300)), env })).status === 413, 'a long body is refused');
  ok((await onRequestPost({ request: post('{nope'), env })).status === 400, 'bad JSON is refused');
  ok((await onRequestPost({ request: post(fresh()), env })).status === 204, 'a good write is stored');
  const got = await (await onRequestGet({ env })).json();
  ok(Object.keys(got).sort().join() === 'at,pct' && got.pct === -0.5, 'the read gives back only pct and at');
}
{
  const env = { LIVE: store(), BLACKFIN_FEED_TOKEN: 'short' };
  ok((await onRequestPost({ request: post(fresh(), 'Bearer short'), env })).status === 503, 'a short token means not set up');
  ok((await onRequestGet({ env: {} })).status === 204, 'no store bound: 204, the page keeps its printed figure');
}

// Found by the cross-family review (DeepSeek, Nov 14 2026).
ok(parseReading({ pct: 1.005, at: '2026-11-16T19:41:00Z' }, now)?.pct === 1.01, 'a half rounds away from zero');
ok(parseReading({ pct: -1.005, at: '2026-11-16T19:41:00Z' }, now)?.pct === -1.01, 'a negative half rounds away from zero');
{
  const env = { LIVE: store(), BLACKFIN_FEED_TOKEN: token };
  // A body with no declared length, 251 bytes but 151 characters.
  const body = JSON.stringify({ pct: 1, at: new Date().toISOString(), x: 'é'.repeat(100) });
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(body)); c.close(); } });
  const req = new Request('https://example.test/api/blackfin-live', {
    method: 'POST', headers: { authorization: `Bearer ${token}` }, body: stream, duplex: 'half',
  });
  ok((await onRequestPost({ request: req, env })).status === 413, 'over 200 bytes is refused before parsing, counted in bytes');
  const good = await onRequestPost({ request: post(fresh()), env });
  ok(good.headers.get('cache-control') === 'no-store', 'a write answer is never cached');
}
{
  const served = async (value) => {
    const LIVE = store();
    LIVE.m.set('blackfin', JSON.stringify(value));
    const res = await onRequestGet({ env: { LIVE } });
    return res.status === 200 ? res.json() : res.status;
  };
  ok((await served({ pct: 9999, at: '2026-11-16T19:41:00Z' })) === 204, 'a stored percent out of range is not served');
  ok((await served({ pct: 1, at: '<img src=x>' })) === 204, 'a stored time that is not a time is not served');
  ok((await served({ pct: 1.23456, at: '2026-11-16T19:41:00Z' })).pct === 1.23, 'a stored percent is served rounded');
  const old = await served({ pct: -0.4, at: '2026-11-02T15:00:00Z' });
  ok(old.pct === -0.4, 'an old reading still serves, the page says when it was read');
  const broken = { get: async () => { throw new Error('kv down'); }, put: async () => { throw new Error('kv down'); } };
  ok((await onRequestGet({ env: { LIVE: broken } })).status === 204, 'a store that fails on read gives 204');
  ok((await onRequestPost({ request: post(fresh()), env: { LIVE: broken, BLACKFIN_FEED_TOKEN: token } })).status === 503, 'a store that fails on write gives 503');
}

// Found by the cross-family rereview (DeepSeek, Nov 14 2026).
{
  const env = { LIVE: store(), BLACKFIN_FEED_TOKEN: token };
  const stream = new ReadableStream({ pull(c) { c.error(new Error('client went away')); } });
  const req = new Request('https://example.test/api/blackfin-live', {
    method: 'POST', headers: { authorization: `Bearer ${token}` }, body: stream, duplex: 'half',
  });
  ok((await onRequestPost({ request: req, env })).status === 400, 'a body that breaks mid-read gives 400, not a crash');
}
ok(isLive(now, now), 'the page calls a reading from this minute live');
ok(isLive(now, now - 179000), 'and one just under three minutes old');
ok(!isLive(now, now - 180000), 'but not one three minutes old');
ok(isLive(now, now + 59000), 'a stamp a few seconds ahead of the clock is still live');
ok(!isLive(now, now + 60000), 'a stamp a minute ahead is not');
ok(!isLive(now, now + 9 * 60000), 'nor one nine minutes ahead');

console.log(`live endpoint ok: ${n} cases`);
