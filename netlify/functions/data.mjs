// Read what the background job collected, and tell it which bets to watch.
//   GET  /api/data/lines?sport=NBA&day=2026-11-02   game-line snapshots of that day
//   GET  /api/data/close?event=<odds event id>        closing prices captured ~30 min before start
//   GET  /api/data/alerts                             latest outlier alerts
//   GET  /api/data/status                             last run, credits left, settings
//   POST /api/data/bets   { bets: [{ eventId, sportKey, market, alt, start }] }
import { store, getJSON, sameSite, json } from './_shared.mjs';
const etDay = t => Number.isFinite(t) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(t) : null;
// a graded record wins; otherwise the one logged closest to the start (latest t); grades are never lost
const graded = r => r && (r.y === 0 || r.y === 1 || r.y === null);
function mergePred(old, r) {
  if (!old) return r;
  if (graded(old) && !graded(r)) return old;
  if (graded(r) && !graded(old)) return { ...old, ...r };
  return (r.t || 0) > (old.t || 0) ? { ...old, ...r } : old;
}
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
  // shared prediction log (daily recap + report card on every device)
  //   POST /api/data/preds { preds: [...] }      merge records (by key) into one blob per Eastern day
  //   GET  /api/data/preds?days=2026-11-02,...   records of those days
  //   GET  /api/data/predsindex                  { day: count } for the recap's day list
  if (req.method === 'POST' && what === 'preds') {
    if (!sameSite(req)) return json({ error: 'forbidden' }, 403);
    const body = await req.json().catch(() => ({}));
    const byDay = new Map();
    for (const r of (body.preds || []).slice(0, 5000)) {
      if (!r || typeof r.k !== 'string' || !r.start || r.k.length > 200) continue;
      const day = etDay(Date.parse(r.start)); if (!day) continue;
      if (!byDay.has(day)) byDay.set(day, []); byDay.get(day).push(r);
    }
    const index = await getJSON(st, 'preds/index', {});
    let n = 0;
    for (const [day, recs] of byDay) {
      const cur = await getJSON(st, `preds/${day}`, {});
      for (const r of recs) { const old = cur[r.k]; const m = mergePred(old, r); if (m !== old) { cur[r.k] = m; n++; } }
      await st.setJSON(`preds/${day}`, cur);
      index[day] = Object.keys(cur).length;
    }
    const keep = Object.keys(index).sort().slice(-400); const idx = Object.fromEntries(keep.map(d => [d, index[d]]));
    await st.setJSON('preds/index', idx);
    return json({ ok: true, merged: n });
  }
  if (what === 'predsindex') return json(await getJSON(st, 'preds/index', {}));
  if (what === 'preds') {
    const days = String(url.searchParams.get('days') || '').split(',').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 10);
    const out = [];
    for (const d of days) out.push(...Object.values(await getJSON(st, `preds/${d}`, {})));
    return json(out);
  }
  if (what === 'lines') return json(await getJSON(st, `lines/${url.searchParams.get('sport')}/${url.searchParams.get('day')}`, []));
  if (what === 'close') return json(await getJSON(st, `close/${url.searchParams.get('event')}`, null));
  if (what === 'alerts') return json(await getJSON(st, 'alerts', { t: null, list: [] }));
  if (what === 'status') return json({ ...(await getJSON(st, 'state', {})), key: Boolean(process.env.ODDS_API_KEY), alertHours: process.env.ALERT_HOURS || '', ntfy: Boolean(process.env.NTFY_TOPIC) });
  return json({ error: 'unknown' }, 404);
};
export const config = { path: '/api/data/*' };
