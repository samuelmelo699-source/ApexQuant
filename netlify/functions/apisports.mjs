// /api/apisports/{leagues|games|odds}?... → API-Sports basketball (key APISPORTS_KEY stays on the server).
// Answers are cached in Netlify Blobs so the free plan's ~100 requests/day go a long way.
import { store, getJSON, sameSite, json } from './_shared.mjs';
const BASE = 'https://v1.basketball.api-sports.io/';
const TTL = { leagues: 7 * 864e5, games: 6 * 3600e3, odds: 30 * 60e3 };
const ALLOWED = ['league', 'season', 'date', 'search', 'country', 'game', 'page', 'timezone', 'bet', 'bookmaker'];
export default async (req) => {
  const url = new URL(req.url), key = process.env.APISPORTS_KEY;
  const path = url.pathname.replace(/^.*\/api\/apisports\//, '');
  if (path === 'ping') return json({ ok: true, key: Boolean(key) });
  if (!key) return json({ error: 'APISPORTS_KEY is not set' }, 500);
  if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
  if (!/^(leagues|games|odds)$/.test(path)) return json({ error: 'bad path' }, 400);
  const qs = new URLSearchParams(url.search);
  for (const k of [...qs.keys()]) if (!ALLOWED.includes(k)) qs.delete(k);
  qs.sort();
  const st = await store(), ck = `aps/${path}/${String(qs).replace(/[^a-z0-9_.-]/gi, '_')}`;
  const hit = await getJSON(st, ck);
  if (hit && Date.now() - hit.t < TTL[path] && !url.searchParams.has('fresh')) return json({ ...hit.body, cached: true });
  const r = await fetch(`${BASE}${path}?${qs}`, { headers: { 'x-apisports-key': key } });
  const body = await r.json().catch(() => ({ errors: [`HTTP ${r.status}`] }));
  const errs = body.errors && (Array.isArray(body.errors) ? body.errors.length : Object.keys(body.errors).length);
  if (r.ok && !errs) await st.setJSON(ck, { t: Date.now(), body });
  return json(body, r.ok ? 200 : r.status, { 'x-requests-remaining': r.headers.get('x-ratelimit-requests-remaining') || '' });
};
export const config = { path: '/api/apisports/*' };
