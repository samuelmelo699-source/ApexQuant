# APEXQUANT

Single-page NFL / CFB / NBA / NHL simulator, prop outlier finder and bet tracker, using ESPN's public API and The Odds API.

Deploy: drag this folder (or the zip) into https://app.netlify.com/drop.

- Team ratings page: every NBA, NFL, NHL and CFB team's sliders, refreshed daily; today's games laid out slider-by-slider. All four are rated from this season's final scores, adjusted for every opponent's strength, starting from last season's ESPN standings at half weight (CFB: FCS opponents pooled). If a league's standings come back missing or impossible, the app rates from game results instead.
- Injuries: ESPN injury report applied automatically in stats mode (NBA by player scoring, NFL by position/depth, NHL by line/goalie); manual dropdowns add on top.
- Simulator: market-anchored by default (sliders = disagreement with the line); untick to use season-stat ratings from ESPN standings.
- Lineups: NBA/NHL from the last 3 ESPN box scores (starts + minutes / ice time); NFL from the ESPN depth chart (matched by id or name, rejected if it does not match the roster), then last-3-game volume (attempts, carries, targets); then season stat leaders; then experience (flagged). Player props blend each player's last 10 games with his role and tonight's team projection.
- NBA 20+ and 30+ points tabs: priced from the books' Over 19.5 / Over 29.5 alternate lines (best price across books).
- "Why ▾" under every player (now with a Matchup breakdown: opponent defense and its league rank (raw and schedule-adjusted), the opponent's last-5 defensive trend, opponent pace, your team's expected points from the betting lines, rest/back-to-backs, his season / last 5 / last 10, home-away split, games vs this opponent, minutes trend, injuries and the book price, each tile green or red for which way it pushes, plus a bottom line). Previously: every player in Player props, Prop finder, Anytime TD/goal and 20+/30+: the case for the over and for the under, each reason with its number (recent hit rate vs the line, trend, minutes, projected team points, game total, opponent defense rank, spread/blowout or game-script effects, injuries on both teams, what the book's price implies).
- Prop finder / Player props (NBA + NFL): book line + best over/under prices auto-filled from the sportsbooks (manual entries win).
- NHL player props (points, shots on goal, saves, anytime goal) now auto-fill from the books too.
- Game matching between ESPN and the books uses full team names; when two games could match (same mascots, same day) it refuses to guess.
- Prop outliers (NBA + NFL + NHL): one tab per sport — Scan only spends credits on the tab you're on; other tabs keep their last results. needs a key from the-odds-api.com. Fair prices from the other books' no-vig lines; Pinnacle weighted 3x; stale prices flagged/hidden; quarter-Kelly stakes.
- First scorer (NFL first TD, NBA first basket): every book's board via The Odds API (1 credit per game). Each book de-vigged across the whole field (power method; NFL leaves room for defense/special-teams TDs and no-TD), best price vs. the other books' consensus, ranked by EV, with a model estimate and tracking.
- Game lines (all four sports): with an Odds API key, moneyline/spread/total come from 10 books (about 3 credits per sport, refreshed at most every 30 min). Consensus main line, best price with the book named, and no-vig fair prices that the model anchors to. Without a key, ESPN's line is used; if ESPN posted no spread/total prices, the app says that -110 is assumed.
- ESPN data note: ESPN stopped accepting date-range scoreboard requests for NFL/NBA/NHL/CFB (HTTP 400). The app now asks one day at a time (NBA/NHL) or one week at a time (NFL/CFB). Finished days/weeks are cached in the browser. This fixed the CFB sliders and the multi-day NBA/NHL slate.
- NBA projections: per-minute rates (season, recent weighted) × projected minutes (recent minutes + minutes freed by injured teammates, back-to-back and blowout adjustments, official starting lineups when posted, capped at 240 team minutes) × scoring environment × opponent defense vs his position (guards / forwards / centers per minute, from the opponent's recent box scores).
- NFL/NHL: opponent defense vs pass and run (yards, attempts, catches, TDs) / shots and goals from recent box scores; NFL outdoor weather (wind, rain/snow, cold) lowers passing props.
- Auto-tuning: per market, the report card's graded results decide how much to trust the model vs the books' no-vig price (after 30 results; shown on the Bet tracker page; can be switched off).
- Line movement: every price is snapshotted; props show ▲/▼ moves under the book line and in the Why panel; game line moves show on the Simulator.
- Game conditions on the Simulator: weather, referees (with crew tendency from cached games), official NBA lineups.
- 📰 Daily recap: every game's result next to the model's pre-game numbers. Green = winning team, covering team, OVER, players over their line (or YES); red = losing team, non-covering team, UNDER, players under their line (or NO). Shows the model's % for each side and whether it leaned the right way, plus a daily tally. A background logger records all four sports (about every 30 min while the app is open), not just the one on screen.
- Auto-grading: tracked bets settle themselves from ESPN final box scores (game lines, every player prop, first TD / first basket from play-by-play; did-not-play = void). Anything that can't be confirmed is flagged for a manual check.
- Model report card (Bet tracker page): the app logs what the model predicted for every market with a real book price before each game, grades it after, and shows model vs market accuracy (Brier score), a calibration chart, and the ROI of betting every edge — overall and per market.
- Backup / Restore (Bet tracker page): one file with your API key, bets, prediction log and settings.
- UPDATING THE SITE: don't drop new zips on the Netlify Drop page (that creates a new site address, and the browser keeps saved data per address, so key + bets vanish). Open your existing site in Netlify > Deploys and drag the zip onto that page instead — same address, everything stays.
- Bet tracker: log bets, auto-capture closing prices ~15 min before start (app open) or by button, closing-line value, ROI, CSV export.
- Everything you enter (ratings, picks, prices, bets, API key) stays in your browser's local storage.

## College basketball (NCAAB)

Every Division I game is included (ESPN `groups=50`). Team ratings start from last season's standings and update from this season's final scores. Opponents outside Division I are pooled into one team. The sim covers moneyline, spread and total. NCAAB player props show up on the Prop outliers tab, priced against the other books only, since there's no college player model. To save credits, the props scan covers the next 24 hours, and games without props cost nothing.

## Prop analyzer (NBA)

The 📈 Prop analyzer page has tabs for Points, Rebounds, Assists, 3-pointers and PRA. For each player it shows the books' consensus line, the model's projection, the gap between them, the model's cover % (over or under), this season's over-under record at that line, the hit % over the last 10 games (or the season so far until a player has 10), and the books' no-vig over %. Tap a player for a chart of every game this season with a line slider for alt lines; hit % for the last 10, last 5 and season, and the model's over/under %, update as you slide. **Load lines** fetches the sportsbook lines (about 1 credit per market per game, cached).

## Soccer

The ⚽ Soccer button has a league dropdown covering the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, Champions League, Europa League, Conference League, Championship, Eredivisie, Primeira Liga, Liga MX, Scottish Premiership and Brasileirão.
- Ratings: domestic leagues use this season's league table (goals for/against) blended with last season. European cups use the cup table blended with each club's domestic rating, shifted by a fixed league-strength table.
- The sim draws goals from a bivariate Poisson with a small shared component, so draws come out at realistic rates. Markets: 3-way moneyline (home/draw/away) and total goals. No spreads.
- Game-line outliers price the 3-way moneyline and totals. Quarter-goal totals are skipped.
- Player props (anytime goal, shots, shots on target, assists, to be carded) are priced against the other books only, with no player model. They're graded automatically from ESPN box scores.
- The background job doesn't save soccer lines, to save credits.

## Moneyline, spread & total outliers

A separate section under Prop outliers, with tabs for NFL, CFB, NBA and NHL. It checks each book's moneyline, spread (puck line for NHL) and game total (over/under) against the no-vig consensus of the other books. Spreads and totals only compare books at the same number. It costs about 3 credits per sport, or nothing when the lines were downloaded in the last 30 minutes or come from the background job. Tracked bets are graded automatically.

## Background job (optional, needs a GitHub deploy)

Drag-and-drop uploads only publish the page. To turn on the background job, deploy the site from GitHub.
Once that's done, every update you push goes live by itself, and the key lives on the server.

What it does every 30 minutes, even when nobody has the site open:
- Saves game lines (moneyline/spread/total, 10 books) for NFL, NBA, NHL and CFB every 3 hours, plus once in the hour before games. The app shows the movement and uses the newest snapshot instead of spending credits.
- Captures closing prices for your tracked prop bets about 30 minutes before start, so CLV is filled in even if you were not on the site.
- Optional prop alert scans (NBA and NFL) at hours you choose, with a push to your phone through the free ntfy app.
- Serves odds through `/api/odds/*` with the key stored on the server. No device needs the key pasted.

Netlify → Site configuration → Environment variables:
| Variable | Needed | Example | What it does |
|---|---|---|---|
| `ODDS_API_KEY` | yes | your key | The Odds API key (kept on the server) |
| `LINES_EVERY_HOURS` | no | `3` | hours between game-line snapshots |
| `ALERT_HOURS` | no | `12,17` | Eastern hours to scan props for outliers (blank = off) |
| `ALERT_MIN_EV` | no | `8` | minimum EV % for an alert |
| `NTFY_TOPIC` | no | a long random word | install the ntfy app and subscribe to the same word to get pushes |

Credits (approximate): game lines ≈ 3 per sport per snapshot (about 100–250 a day in season). Closing prices ≈ 1 per market per tracked game. Each alert scan ≈ 5 per game (about 60–80 for a full NBA night). The job only runs the parts you turn on.
The model's own predictions (recap, report card) are still logged when the app is opened before games.
