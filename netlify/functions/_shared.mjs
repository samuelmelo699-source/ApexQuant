// Shared helpers for the APEXQUANT background functions.
export const SPORTS = { NFL: 'americanfootball_nfl', NBA: 'basketball_nba', NHL: 'icehockey_nhl', CFB: 'americanfootball_ncaaf', CBB: 'basketball_ncaab' };
export const BOOKS = 'draftkings,fanduel,betmgm,williamhill_us,espnbet,fanatics,betrivers,bovada,betonlineag,pinnacle';
export const PROP_MARKETS = {
  NBA: 'player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists',
  NFL: 'player_pass_yds,player_rush_yds,player_reception_yds,player_receptions,player_anytime_td'
};
// Storage: Netlify Blobs in production; tests inject globalThis.__AQ_STORE__.
export async function store() {
  if (globalThis.__AQ_STORE__) return globalThis.__AQ_STORE__;
  const { getStore } = await import('@netlify/blobs');
  return getStore('apexquant');
}
export async function getJSON(st, key, fallback = null) { try { const v = await st.get(key, { type: 'json' }); return v ?? fallback; } catch { return fallback; } }
export async function odds(path, params = {}) {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error('ODDS_API_KEY is not set in Netlify environment variables');
  const qs = new URLSearchParams({ ...params, apiKey: key });
  const r = await fetch(`https://api.the-odds-api.com/v4/sports/${path}?${qs}`);
  if (!r.ok) throw new Error(`Odds API ${r.status} for ${path}`);
  return { data: await r.json(), remaining: r.headers.get('x-requests-remaining') };
}
// only the site itself may use the proxy / write endpoints (blocks other sites from spending your credits)
export function sameSite(req) {
  const ref = req.headers.get('referer') || req.headers.get('origin') || '';
  if (!ref) return true;
  const ok = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].filter(Boolean);
  if (!ok.length) return true;
  return ok.some(u => ref.startsWith(u));
}
export const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const devig = (o, u) => { const imp = x => x > 0 ? 100 / (x + 100) : -x / (-x + 100); const a = imp(o), b = imp(u); return a / (a + b); };
const payout = x => x > 0 ? x / 100 : 100 / -x;
const W = { pinnacle: 3, circasports: 3, betonlineag: 1.5, lowvig: 1.5 };
function wMedian(vals, ws) { const v = vals.map((x, i) => [x, ws[i]]).sort((a, b) => a[0] - b[0]); const half = v.reduce((a, x) => a + x[1], 0) / 2; let acc = 0; for (let i = 0; i < v.length; i++) { acc += v[i][1]; if (Math.abs(acc - half) < 1e-9 && i + 1 < v.length) return (v[i][0] + v[i + 1][0]) / 2; if (acc > half) return v[i][0]; } return v[v.length - 1][0]; }
// Market outliers: a book's price vs the no-vig consensus of the OTHER books at the same line.
export function propOutliers(ev, sport, minEV = 0.08, minBooks = 4) {
  const by = new Map();
  for (const bm of ev.bookmakers || []) for (const m of bm.markets || []) for (const o of m.outcomes || []) {
    if (!o.description || o.point === undefined || !/^(over|under)$/i.test(o.name)) continue;
    const k = `${o.description}|${m.key}|${o.point}`;
    if (!by.has(k)) by.set(k, new Map());
    const b = by.get(k); if (!b.has(bm.key)) b.set(bm.key, { title: bm.title });
    b.get(bm.key)[o.name.toLowerCase()] = +o.price;
  }
  const out = [];
  for (const [k, books] of by) {
    const both = [...books.entries()].filter(([, x]) => x.over && x.under);
    if (both.length < minBooks) continue;
    for (const [bk, x] of both) for (const side of ['over', 'under']) {
      const others = both.filter(([b]) => b !== bk);
      const pOver = wMedian(others.map(([, y]) => devig(y.over, y.under)), others.map(([b]) => W[b] || 1));
      const p = side === 'over' ? pOver : 1 - pOver, ev$ = p * payout(x[side]) - (1 - p);
      if (ev$ >= minEV) { const [player, market, line] = k.split('|'); out.push({ sport, game: `${ev.away_team} @ ${ev.home_team}`, start: ev.commence_time, player, market, line: +line, side, price: x[side], book: x.title, ev: +ev$.toFixed(4), fair: +p.toFixed(4), books: both.length }); }
    }
  }
  return out;
}
