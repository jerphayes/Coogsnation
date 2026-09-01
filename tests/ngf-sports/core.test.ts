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

// Score consensus must ignore harmless clock skew between independent sources.
const liveObservations: ScoreObservation[] = [
  { sourceId:"ncaa", observedAt:"2026-09-05T18:30:03Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"4:31" },
  { sourceId:"big12", observedAt:"2026-09-05T18:30:04Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"4:29" },
  { sourceId:"cbs", observedAt:"2026-09-05T18:30:05Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"4:25" },
  { sourceId:"outlier", observedAt:"2026-09-05T18:30:05Z", game, awayScore:21, homeScore:17, phase:"live", period:3, clock:"4:26" },
];
const live = reconcileGame(liveObservations, [
  { sourceId:"ncaa", reliability:.95 }, { sourceId:"big12", reliability:.9 },
  { sourceId:"cbs", reliability:.9 }, { sourceId:"outlier", reliability:.6 },
], new Date("2026-09-05T18:30:06Z"));
if (!live) throw new Error("live reconciliation failed");
assert.equal(live.awayScore, 24);
assert.equal(live.homeScore, 17);
assert.equal(live.period, 3);
assert.equal(live.clock, "4:25");
assert.deepEqual(new Set(live.agreeingSources), new Set(["ncaa","big12","cbs"]));
assert.deepEqual(new Set(live.conflictingSources), new Set(["outlier"]));

// Mirrors from one upstream lineage must not overwhelm genuinely independent agreement.
const lineageConsensus = reconcileGame([
  { sourceId:"cbs-web", sourceLineage:"cbs", observedAt:"2026-09-05T18:35:01Z", game, awayScore:31, homeScore:17, phase:"live", period:3, clock:"2:10" },
  { sourceId:"cbs-hub", sourceLineage:"cbs", observedAt:"2026-09-05T18:35:02Z", game, awayScore:31, homeScore:17, phase:"live", period:3, clock:"2:09" },
  { sourceId:"cbs-mirror", sourceLineage:"cbs", observedAt:"2026-09-05T18:35:03Z", game, awayScore:31, homeScore:17, phase:"live", period:3, clock:"2:08" },
  { sourceId:"ncaa", sourceLineage:"ncaa", observedAt:"2026-09-05T18:35:03Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"2:08" },
  { sourceId:"big12", sourceLineage:"big12", observedAt:"2026-09-05T18:35:03Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"2:08" },
], [
  { sourceId:"cbs-web", reliability:.8 }, { sourceId:"cbs-hub", reliability:.8 }, { sourceId:"cbs-mirror", reliability:.8 },
  { sourceId:"ncaa", reliability:.9 }, { sourceId:"big12", reliability:.85 },
], new Date("2026-09-05T18:35:04Z"));
if (!lineageConsensus) throw new Error("lineage reconciliation failed");
assert.equal(lineageConsensus.awayScore, 24);
assert.equal(lineageConsensus.homeScore, 17);
assert.deepEqual(new Set(lineageConsensus.agreeingLineages), new Set(["ncaa","big12"]));
assert.deepEqual(new Set(lineageConsensus.conflictingLineages), new Set(["cbs"]));

// A later poll from a slower source must not move a game backward from Q3 to halftime/Q2.
const noRegression = reconcileGame([
  { sourceId:"fast", observedAt:"2026-09-05T18:31:00Z", game, awayScore:24, homeScore:17, phase:"live", period:3, clock:"3:58" },
  { sourceId:"slow", observedAt:"2026-09-05T18:31:02Z", game, awayScore:24, homeScore:17, phase:"halftime", period:2, clock:null },
], [
  { sourceId:"fast", reliability:.9 }, { sourceId:"slow", reliability:.9 },
], new Date("2026-09-05T18:31:03Z"));
if (!noRegression) throw new Error("phase reconciliation failed");
assert.equal(noRegression.phase, "live");
assert.equal(noRegression.period, 3);
assert.equal(noRegression.clock, "3:58");

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
