import { strict as assert } from "node:assert";
import { SportsFactsEngine } from "../../server/sports/engine";
import { createDefaultSportsSources } from "../../server/sports/sourceCatalog";
import type { GameRef } from "../../shared/ngfSportsTypes";

const game: GameRef = {
  ngfGameId: "unc-tcu-2026-08-29",
  sport: "football",
  season: 2026,
  scheduledStart: "2026-08-29T16:00:00Z",
  away: {
    ngfTeamId: "unc",
    name: "North Carolina",
    abbreviation: "UNC",
    conference: "ACC",
    division: "fbs",
  },
  home: {
    ngfTeamId: "tcu",
    name: "TCU",
    abbreviation: "TCU",
    conference: "Big 12",
    division: "fbs",
  },
};

const expectedAway = 15;
const expectedHome = 10;

type ProbeRow = {
  source: string;
  lineage: string;
  result: string;
  phase: string;
  elapsedMs: number;
  detail?: string;
};

const adapters = createDefaultSportsSources(fetch)
  .filter((adapter) => adapter.canHandle?.(game) !== false);

const rows: ProbeRow[] = [];
const matchingLineages = new Set<string>();
const engine = new SportsFactsEngine();
engine.setScheduledSlate([game]);

for (const adapter of adapters) {
  const started = Date.now();
  try {
    const observation = await adapter.fetchGame(game);
    const elapsedMs = Date.now() - started;
    const lineage = observation?.sourceLineage ?? adapter.lineageId ?? adapter.sourceId;

    if (!observation) {
      rows.push({
        source: adapter.sourceId,
        lineage,
        result: "NO MATCH",
        phase: "-",
        elapsedMs,
      });
      continue;
    }

    const score = `${observation.awayScore ?? "-"}-${observation.homeScore ?? "-"}`;
    const matches = observation.awayScore === expectedAway && observation.homeScore === expectedHome;
    if (matches) matchingLineages.add(lineage);

    // Mirror collector behavior: status-only live/final observations are useful
    // diagnostics but must not replace canonical scores with nulls.
    const requiresScore = ["live", "halftime", "final"].includes(observation.phase);
    const completeScore = observation.awayScore != null && observation.homeScore != null;
    if (!requiresScore || completeScore) {
      engine.setSourceHealth({ sourceId: observation.sourceId, reliability: 0.9 });
      engine.ingest({ ...observation, sourceLineage: lineage });
    }

    rows.push({
      source: adapter.sourceId,
      lineage,
      result: matches ? `MATCH ${score}` : `OBS ${score}`,
      phase: observation.phase,
      elapsedMs,
      detail: observation.statusText ?? undefined,
    });
  } catch (error) {
    rows.push({
      source: adapter.sourceId,
      lineage: adapter.lineageId ?? adapter.sourceId,
      result: "ERROR",
      phase: "-",
      elapsedMs: Date.now() - started,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(rows.map(({ detail, ...row }) => row));
for (const row of rows.filter((item) => item.detail)) {
  console.log(`[${row.source}] ${row.detail}`);
}

const canonical = engine.getGame(game.ngfGameId);
const tickerItem = engine.snapshot().games.find((item) => item.gameId === game.ngfGameId);

console.log(`Independent matching lineages: ${[...matchingLineages].join(", ") || "none"}`);
console.log("Canonical game:", canonical ? {
  awayScore: canonical.awayScore,
  homeScore: canonical.homeScore,
  phase: canonical.phase,
  agreeingLineages: canonical.agreeingLineages,
} : null);
console.log("Ticker item:", tickerItem ?? null);

assert(matchingLineages.size >= 2, "fewer than two independent sources matched the verified final");
assert(canonical, "Sports Facts Engine did not produce a canonical game");
assert.equal(canonical.awayScore, expectedAway);
assert.equal(canonical.homeScore, expectedHome);
assert.equal(canonical.phase, "final");
assert((canonical.agreeingLineages?.length ?? 0) >= 2, "canonical score lacks two independent lineages");
assert(tickerItem, "ticker snapshot did not contain the canonical game");
assert.equal(tickerItem.awayScore, expectedAway);
assert.equal(tickerItem.homeScore, expectedHome);
assert.equal(tickerItem.status, "FINAL");

console.log("[NGF SPORTS E2E] PASS: real web sources -> canonical engine -> ticker snapshot");
