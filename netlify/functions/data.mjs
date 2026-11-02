// Read what the background job collected, and tell it which bets to watch.
//   GET  /api/data/lines?sport=NBA&day=2026-11-02   game-line snapshots of that day
//   GET  /api/data/close?event=<odds event id>        closing prices captured ~30 min before start
//   GET  /api/data/alerts                             latest outlier alerts
//   GET  /api/data/status                             last run, credits left, settings
//   POST /api/data/bets   { bets: [{ eventId, sportKey, market, alt, start }] }
import { store, getJSON, sameSite, json } from './_shared.mjs';
export default async (req) => {
  const url = new URL(req.url), st = await store(), what = url.pathname.split('/').pop();
  if (req.method === 'POST' && what === 'bets') {
    if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
    const body = await req.json().catch(() => ({}));
    const now = Date.now(), cur = await getJSON(st, 'tracked', []);
    const byEv = new Map(cur.map(t => [t.eventId, t]));
    for (const b of (body.bets || []).slice(0, 200)) {
      if (!b.eventId || !b.sportKey || !b.market || !b.start) continue;
      const t = byEv.get(b.eventId) || { eventId: b.eventId, sportKey: b.sportKey, start: b.start, markets: [], closed: false };
      for (const m of [b.market, ...(b.alt ? [b.market + '_alternate'] : [])]) if (!t.markets.includes(m)) { t.markets.push(m); t.closed = false; }
      byEv.set(b.eventId, t);
    }
    const list = [...byEv.values()].filter(t => now - Date.parse(t.start) < 2 * 864e5);
    await st.setJSON('tracked', list);
    return json({ ok: true, watching: list.length });
  }
  if (what === 'lines') return json(await getJSON(st, `lines/${url.searchParams.get('sport')}/${url.searchParams.get('day')}`, []));
  if (what === 'close') return json(await getJSON(st, `close/${url.searchParams.get('event')}`, null));
  if (what === 'alerts') return json(await getJSON(st, 'alerts', { t: null, list: [] }));
  if (what === 'status') return json({ ...(await getJSON(st, 'state', {})), key: Boolean(process.env.ODDS_API_KEY), alertHours: process.env.ALERT_HOURS || '', ntfy: Boolean(process.env.NTFY_TOPIC) });
  return json({ error: 'unknown' }, 404);
};
export const config = { path: '/api/data/*' };
