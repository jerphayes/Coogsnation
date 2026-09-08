# Sports Ticker — 0-0 Investigation and Fix

**Date:** 2026-09-08
**Commit:** `bb932be` on `Chat-sandbox`
**Files changed:** `server/sports/ticker.ts`, `server/sports/store.ts`, `migrations/0022_widen_status_text.sql`
**Status:** deployed to production, verified

---

## 1. Symptom

The CFB LIVE ticker on coogsnation.com rendered `0` for both teams across
most visible rows, including games with kickoff timestamps days in the past
and one row reading `LIVE 0:00`.

A separate row read `HOU 1 • TXTECH 0 FINAL` for a game scheduled
2026-09-18. A football score of 1 is not possible in normal play.

---

## 2. What was NOT the problem

Four hypotheses were pursued and eliminated. Recording them because each
looked plausible from the screenshot and each cost time.

| Hypothesis | Why it was wrong |
|---|---|
| Adapters coerce missing scores to `0` via `\|\| 0` | `grep` across `server/sports/**` found no `\|\| 0` or `?? 0` on any score field. Every `\|\| 0` hit was on reliability/confidence/error counters. `espn.ts:157-163` guards with `Number.isFinite()`; `cbs.ts:103` and `publicScoreboard.ts:74` return `null` explicitly. Null-sentinel discipline was already correct. |
| Consensus engine votes on whole objects instead of per-field | `reconcile.ts` already votes per field with lineage grouping and a `>= 3` quorum. |
| Client filters or slices games off the ticker | `LiveScoreTicker.tsx` renders every game returned. No slice, no filter, no re-sort. `score()` already maps `null` → `–`. |
| Feed outage / stale cache | `generatedAt` was sub-second fresh. `curl` against every source URL returned HTTP 200. |

**Lesson:** the screenshot supported a coercion story, but the API response
did not. `curl localhost:5000/api/sports/ticker` showed real scores
(`LA MONROE 34 / #9 MISS 41`, `WASHST 10 / #17 WASH 24`) alongside the
zeros. That single command should have come first.

---

## 3. Defect A — pregame zeros rendered as scores

### Root cause

Providers report `score: "0"` for competitors **before kickoff**. That is a
real, finite zero meaning "not started", not a score.

Chain:

1. ESPN returns `score: "0"` for a scheduled game.
2. `espn.ts:157` — `Number.isFinite(Number("0"))` → `true` → `awayScore = 0`.
3. `reconcile.ts` — `hasCompleteScore()` passes because `0 != null`.
   All lineages independently agree on key `"0|0"`. Quorum met.
4. `ticker.ts` `toTickerItem()` passed the value straight through:

   ```ts
   awayScore: game.awayScore,
   homeScore: game.homeScore,
   ```

5. Client renders `0`.

Every layer behaved correctly. No rule existed saying pregame scores should
not be displayed as numbers.

### Fix

`server/sports/ticker.ts` — added a phase guard above `toTickerItem`:

```ts
const PREGAME_PHASES = new Set(["scheduled", "pregame"]);

function displayScore(game: ReconciledGame, value: number | null): number | null {
  return PREGAME_PHASES.has(game.phase) ? null : value;
}
```

and changed the two assignments to `displayScore(game, game.awayScore)` /
`displayScore(game, game.homeScore)`.

### Why it is safe

- `TickerItem` already types both fields `number | null` — no type change.
- Client `score()` already handles `null` → `–`.
- `isPersistentUpset()` early-returns unless `status === "FINAL"`, so nulls
  on scheduled games never reach its comparison logic.
- Display-only. `reconcile.ts`, `collector.ts`, and all scoring paths
  untouched.

### Verification

```
FURMAN  awayScore:null  #20 TENN  homeScore:null  SAT, SEP 5, 2:30 PM CDT
KENSAW  awayScore:null  #20 TENN  homeScore:null  SAT, SEP 19, 6:45 PM CDT
WASHST  awayScore:10    WASH      homeScore:24    FINAL      <- unchanged
```

---

## 4. Defect B — `varchar(100)` on `status_text` killed entire polls

### Discovery path

`ngf_sports_sources` showed six sources with `last_success_at = NULL` and
40–57 consecutive errors:

```
conference-football-public   47   (null)
conference-public            57   (null)
massey-football-public       47   (null)
nbc-football-public          47   (null)
ncaa-public                  57   (null)
ncaa-football-public          0   2026-09-01 10:47:57   <- one success, then nothing
```

All at reliability `0.4500` — the floor `collector.ts:90` clamps to.

Their endpoints were **not** the problem. Direct `curl` with `-L`:

```
200  https://www.ncaa.com/scoreboard/football/fbs/2026/03
200  https://big12sports.com/calendar.aspx?path=football
200  https://theacc.com/calendar.aspx?path=football
200  https://bigten.org/calendar.aspx?path=football  (302 -> /fb/schedule/)
200  https://www.secsports.com/schedule/football
```

Page content was parseable — `big12sports.com` returned 419,645 bytes with
`houston` ×5 and `texas tech` ×5 in the raw HTML, `__NEXT_DATA__` absent.
Not client-side rendered, not blocked.

The app log gave it away:

```
[SPORTS] Poll failed for ncaa-6640534 error: value too long for type character varying(100)
    at async SportsStore.recordObservation (file:///app/dist/index.js:13602:5)
```

### Root cause

`status_text` was `varchar(100)` in **both** `ngf_sports_observations` and
`ngf_sports_current`. Some sources emit status strings longer than 100
characters. The INSERT threw, and because the poll is one unit of work,
**every source's observation for that game was discarded** — including the
good ones from working sources.

Ten distinct games were affected in a 6-hour window.

### Fix — two parts

**`migrations/0022_widen_status_text.sql`:**

```sql
ALTER TABLE ngf_sports_observations ALTER COLUMN status_text TYPE varchar(300);
ALTER TABLE ngf_sports_current      ALTER COLUMN status_text TYPE varchar(300);
```

**`server/sports/store.ts`** — private method on `SportsStore`, applied at
both write sites (`recordObservation` line ~51, `saveCurrent` line ~63):

```ts
private clampStatusText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > 300 ? value.slice(0, 300) : value;
}
```

Widening alone would leave the next oversized string free to fail again;
clamping alone would leave existing rows failing. Both are needed.

### Note on a failed first attempt

The initial patch declared the clamp as a bare `const` + `function` inserted
inside the class body. TypeScript rejects a free `function` declaration
there — 34 cascading parse errors from the insertion point. `npx tsc
--noEmit -p tsconfig.server.json` caught it before any build. Rewritten as a
private class method.

**Always run the typecheck in the same command as the patch.**

### Verification

```
value-too-long errors in last 5m: 0
information_schema.columns: status_text -> 300
```

---

## 5. The HOU/TXTECH fake final — diagnosed, NOT fixed

`ngf_sports_current` for `ncaa-6604067`:

```
away_score 1 | home_score 0 | phase final | confidence 0.58211
agreeing:    {fox-football-public, usatoday-football-public, yahoo-football-public}
conflicting: {espn-football-public, cbs-football-public}
accepted_at: 2026-09-07 07:35:44
```

Raw observations for the same game:

```
espn         scheduled  0-0      "9/18 - 8:00 PM EDT"   <- CORRECT
usatoday     final      1-0
fox          final      1-0
yahoo        final      1-0
cbs          final      9-12
conference   final      null-null
```

Three lineages agreed on `1|0`, cleared quorum, published. ESPN — the only
source that was right — was outvoted 3-2.

Three independent scrapers producing identical `1-0` is not coincidence.
They are reading the same wrong element (likely a record or seed) across
differently-structured pages.

Compounding: `collector.ts:164` calls `stop()` once `phase === "final" &&
finalVerified`. The collector locked in the fake final and quit polling that
game entirely. It will not self-correct even after the sources are fixed —
the row likely needs clearing from `ngf_sports_current`.

**The missing invariant:** nothing in the codebase prevents `phase = final`
before `scheduledStart`. `scheduledStart` exists at
`shared/ngfSportsTypes.ts:54`. A guard in `reconcile.ts` rejecting any
`final` earlier than the scheduled kickoff would have blocked this row
regardless of how many sources agreed, and regardless of which scrapers are
broken next time.

`reconcile.ts` already has a narrower version of this idea — it returns
`null` on a `0-0` football/basketball final — but it only fires on
`phase === "final"` with exactly `0-0`, so `1-0` slipped through.

---

## 6. Open items

1. **Phase invariant** (highest value, one edit). Reject `final` before
   `scheduledStart` in `reconcile.ts`. Protects against any future scraper
   breakage.
2. **Six dead sources.** The `varchar` fix removed one failure mode but
   `conference-*`, `massey-*`, `nbc-*`, `ncaa-public` still show zero
   successes. Different cause, not yet diagnosed. These are the
   authoritative schedule sources — with them voting, the HOU/TXTECH row
   could not have happened.
3. **Live games stuck 0-0.** `ncaa-6603950` NIU/IOWA at `Q2 01:47`,
   MICHST/WISC at `LIVE 0:00`. Real data problem, untouched.
4. **`ncaa-6604067` stale row.** Fake final locked in, collector stopped.
   Needs manual clearing.

---

## 7. Operational notes

- **Backup scheduler was fixed in the same session.** `ops/backup/*.sh`
  had no execute bit. `backup-loop.sh:11` calls `backup-postgres.sh`
  directly, and the volume mounts `:ro`, so the container could not fix it
  itself. `chmod +x ops/backup/*.sh` + `--force-recreate` resolved it.
  `docker restart` alone was not sufficient — the container did not re-stat
  the bind mount.
  `restore-postgres.sh` had the same missing bit; it would have failed
  during an actual restore.
  The one-shot `backup` service was unaffected because its entrypoint is
  `["bash", "...backup-postgres.sh"]` — bash reads the file, no exec bit
  needed. Only the loop path called it directly.

- **The `backup-scheduler` service sits behind a compose profile.** Use
  `--profile scheduled-backups` or compose commands will silently skip it.

- **Two orphan containers** (`app-selenium-1`, `app-appium-1`) remain from a
  removed service definition. Disk was at 80.8% of 118GB.

- **Do not paste JavaScript into a bash prompt.** Every `=>` becomes a `>`
  redirect and bash creates a zero-byte file named after whatever follows
  it. This happened twice, creating files named `g?.away_points,`,
  `g?.clock,`, etc. Use `scp`, `nano`, or a quoted heredoc
  (`<<'EOF'` — the quotes prevent `${...}` expansion).

- **Another session was deploying from `/home/coogsnation/worktrees/
  identity-profile-fix`**, which overwrote the container built from
  `/home/coogsnation/app` and briefly reverted the ticker fix. Coordinate
  which worktree deploys.

---

## 8. Useful commands

```bash
# what the API is actually serving
curl -s localhost:5000/api/sports/ticker | grep -o '{[^}]*TEAMNAME[^}]*}'

# source health
set -a && . ./.env && set +a && docker exec app-database-1 \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT source_id, consecutive_errors, last_success_at
      FROM ngf_sports_sources ORDER BY source_id;"

# every source's claim for one game
set -a && . ./.env && set +a && docker exec app-database-1 \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT source_id, phase, away_score, home_score, status_text, observed_at
      FROM ngf_sports_observations WHERE ngf_game_id LIKE '%GAMEID%'
      ORDER BY observed_at DESC LIMIT 30;"

# what won the vote and who dissented
set -a && . ./.env && set +a && docker exec app-database-1 \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT * FROM ngf_sports_current WHERE ngf_game_id LIKE '%GAMEID%';"

# poll failures
docker logs --since 1h app-app-1 2>&1 | grep -i "poll failed" | tail -20

# deploy
cd /home/coogsnation/app \
  && npx tsc --noEmit -p tsconfig.server.json \
  && docker compose -f docker-compose.prod.yml up -d --build app
```

Note: the column is `ngf_game_id`, not `game_id`. DB user comes from
`.env`; there is no `postgres` role.
