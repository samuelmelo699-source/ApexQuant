// /api/odds/* → The Odds API with the key kept on the server (set ODDS_API_KEY in Netlify).
import { sameSite, json } from './_shared.mjs';
export default async (req) => {
  const url = new URL(req.url);
  const key = process.env.ODDS_API_KEY;
  if (url.pathname.endsWith('/ping')) return json({ ok: true, key: Boolean(key) });
  if (!key) return json({ error: 'ODDS_API_KEY is not set' }, 500);
  if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
  const path = url.pathname.replace(/^.*\/api\/odds\//, '');
  if (path === 'sportslist') {                       // list of leagues the feed carries (free: costs no credits)
    const r = await fetch(`https://api.the-odds-api.com/v4/sports/?all=true&apiKey=${key}`);
    return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (!/^[a-z0-9_]+(\/events(\/[a-z0-9]+\/odds)?|\/odds)?$/i.test(path)) return json({ error: 'bad path' }, 400);
  const qs = new URLSearchParams(url.search); qs.delete('apiKey'); qs.set('apiKey', key);
  const r = await fetch(`https://api.the-odds-api.com/v4/sports/${path}?${qs}`);
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-requests-remaining': r.headers.get('x-requests-remaining') || '' } });
};
export const config = { path: '/api/odds/*' };
