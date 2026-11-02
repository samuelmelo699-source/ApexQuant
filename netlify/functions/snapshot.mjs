// Runs every 30 minutes on Netlify, even when nobody has the site open.
//  1. Game lines (moneyline/spread/total, 10 books) for NFL/NBA/NHL/CFB: every LINES_EVERY_HOURS hours (default 3)
//     plus once in the hour before each sport's next game → line movement all day.        ≈3 credits per sport per snapshot
//  2. Closing prices ~30 min before start for every game with a tracked prop bet → CLV.     ≈1 credit per market per game
//  3. Optional alerts at ALERT_HOURS (Eastern, e.g. "12,17"): scans today's NBA/NFL props for
//     prices ≥ ALERT_MIN_EV (default 8%) better than the other books, and pushes them to your
//     phone with the free ntfy app if NTFY_TOPIC is set.                                     ≈5 credits per game per scan
import { SPORTS, BOOKS, PROP_MARKETS, store, getJSON, odds, propOutliers } from './_shared.mjs';
export default async () => {
  const st = await store(), now = Date.now(), log = [];
  const state = await getJSON(st, 'state', {}); state.linesAt ||= {}; state.alertsDone ||= {};
  const everyH = +(process.env.LINES_EVERY_HOURS || 3);
  const etHour = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now) % 24;
  const etDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
  let remaining = null;
  const call = async (path, params) => { const r = await odds(path, params); if (r.remaining !== null) remaining = r.remaining; return r.data; };
  try {
    // 1. game lines
    for (const [sp, key] of Object.entries(SPORTS)) {
      try {
        const events = await call(`${key}/events`, {});                       // free
        const soon = events.filter(e => { const t = Date.parse(e.commence_time); return t > now && t - now < 36 * 3600e3; });
        if (!soon.length) continue;
        const lastAt = state.linesAt[sp] || 0, gameWithinHour = soon.some(e => Date.parse(e.commence_time) - now < 75 * 60e3);
        if (now - lastAt < everyH * 3600e3 && !(gameWithinHour && now - lastAt > 50 * 60e3)) continue;
        const list = await call(`${key}/odds`, { bookmakers: BOOKS, markets: 'h2h,spreads,totals', oddsFormat: 'american' });
        const k = `lines/${sp}/${etDay}`, cur = await getJSON(st, k, []);
        cur.push({ t: now, list: list.filter(e => Date.parse(e.commence_time) > now) });
        await st.setJSON(k, cur.slice(-16));
        state.linesAt[sp] = now; log.push(`${sp} lines: ${list.length} games`);
      } catch (e) { log.push(`${sp} lines failed: ${e.message}`); }
    }
    // 2. closing prices for tracked bets
    const tracked = await getJSON(st, 'tracked', []);
    for (const t of tracked) {
      const start = Date.parse(t.start);
      if (t.closed || start - now > 40 * 60e3 || now > start + 5 * 60e3) continue;
      try {
        const data = await call(`${t.sportKey}/events/${t.eventId}/odds`, { bookmakers: BOOKS, markets: t.markets.join(','), oddsFormat: 'american' });
        await st.setJSON(`close/${t.eventId}`, { t: now, data }); t.closed = true; log.push(`close captured ${t.eventId}`);
      } catch (e) { log.push(`close failed ${t.eventId}: ${e.message}`); }
    }
    await st.setJSON('tracked', tracked.filter(t => now - Date.parse(t.start) < 2 * 864e5));
    // 3. alerts
    const hours = String(process.env.ALERT_HOURS || '').split(',').map(x => parseInt(x, 10)).filter(x => x >= 0 && x < 24);
    const slot = `${etDay}:${etHour}`;
    if (hours.includes(etHour) && !state.alertsDone[slot]) {
      const minEV = +(process.env.ALERT_MIN_EV || 8) / 100, found = [];
      for (const sp of ['NBA', 'NFL']) {
        try {
          const events = (await call(`${SPORTS[sp]}/events`, {})).filter(e => { const t = Date.parse(e.commence_time); return t > now && t - now < 14 * 3600e3; });
          for (const e of events.slice(0, 16)) {
            const ev = await call(`${SPORTS[sp]}/events/${e.id}/odds`, { bookmakers: BOOKS, markets: PROP_MARKETS[sp], oddsFormat: 'american' });
            found.push(...propOutliers({ ...ev, home_team: e.home_team, away_team: e.away_team, commence_time: e.commence_time }, sp, minEV));
          }
        } catch (e) { log.push(`${sp} alert scan failed: ${e.message}`); }
      }
      found.sort((a, b) => b.ev - a.ev);
      await st.setJSON('alerts', { t: now, list: found.slice(0, 60) });
      state.alertsDone = { [slot]: true };
      if (process.env.NTFY_TOPIC && found.length) {
        const lines = found.slice(0, 8).map(o => `${o.player} ${o.side === 'over' ? 'O' : 'U'} ${o.line} ${o.market.replace('player_', '').replace(/_/g, ' ')} ${o.price > 0 ? '+' : ''}${o.price} ${o.book} · EV +${(o.ev * 100).toFixed(1)}%`);
        try { await fetch(`https://ntfy.sh/${encodeURIComponent(process.env.NTFY_TOPIC)}`, { method: 'POST', headers: { Title: `APEXQUANT: ${found.length} prop edges`, Tags: 'moneybag' }, body: lines.join('\n') }); } catch {}
      }
      log.push(`alerts: ${found.length}`);
    }
  } finally {
    state.lastRun = now; state.lastLog = log.slice(-20); if (remaining !== null) state.creditsLeft = +remaining;
    await st.setJSON('state', state);
  }
  return new Response('ok');
};
export const config = { schedule: '*/30 * * * *' };
