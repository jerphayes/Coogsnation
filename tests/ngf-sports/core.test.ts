import { strict as assert } from "node:assert";
import { reconcileGame } from "../../server/sports/reconcile";
import { detectUpset } from "../../server/sports/upset";
import { nextPollDecision } from "../../server/sports/scheduler";
import { discoverGamesFromPublicPage } from "../../server/sports/discovery";
import type { GameRef, ScoreObservation } from "../../shared/ngfSportsTypes";

const game: GameRef = {
  ngfGameId: "hou-tex", sport: "football", season: 2026, scheduledStart: "2026-09-05T17:00:00Z",
  away: { ngfTeamId: "hou", name: "Houston", abbreviation: "HOU", division: "fbs" },
  home: { ngfTeamId: "tex", name: "Texas", abbreviation: "TEX", division: "fbs", rank: 4 },
};
function obs(sourceId: string, awayScore: number, homeScore: number): ScoreObservation {
  return { sourceId, observedAt: "2026-09-05T20:30:00Z", game, awayScore, homeScore, phase: "final" };
}

const reconciled = reconcileGame([obs("ncaa", 38, 35), obs("big12", 38, 35), obs("stale", 31, 35)], [
  { sourceId:"ncaa", reliability:.95 }, { sourceId:"big12", reliability:.9 }, { sourceId:"stale", reliability:.5 },
], new Date("2026-09-05T20:30:01Z"));
if (!reconciled) throw new Error("reconciliation failed");
assert.equal(reconciled.awayScore, 38);
assert.deepEqual(new Set(reconciled.agreeingSources), new Set(["ncaa","big12"]));
const upset = detectUpset(reconciled);
if (!upset) throw new Error("upset not detected");
assert.equal(upset.severity, "top5");
assert.equal(upset.flashCount, 3);

const active = nextPollDecision({ scheduledStart:"2026-09-05T17:00:00Z", phase:"live", now:new Date("2026-09-05T18:00:00Z") });
assert.equal(active.intervalMs, 20_000);
const done = nextPollDecision({ scheduledStart:"2026-09-05T17:00:00Z", phase:"final", finalVerified:true, now:new Date("2026-09-05T21:00:00Z") });
assert.equal(done.poll, false);

const fixture = `<!doctype html><html><body><script type="application/json">{
 "events":[{"id":"401","startDate":"2026-09-05T17:00:00Z","awayTeam":{"name":"Houston","abbreviation":"HOU"},"homeTeam":{"name":"Texas","abbreviation":"TEX","rank":4}}]
}</script></body></html>`;
const discovered = discoverGamesFromPublicPage(fixture, "fbs", "2026-09-05T17:00:00Z");
assert.equal(discovered.length, 1);
assert.equal(discovered[0].away.name, "Houston");
assert.equal(discovered[0].home.rank, 4);
console.log("NGF sports core tests: PASS");
