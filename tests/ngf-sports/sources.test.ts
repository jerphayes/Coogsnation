import { strict as assert } from "node:assert";
import { createDefaultSportsSources } from "../../server/sports/sourceCatalog";
import {
  defaultOfficialSchoolResolver,
  OfficialSchoolScoreboardAdapter,
} from "../../server/sports/adapters/school";
import type { GameRef } from "../../shared/ngfSportsTypes";

const football: GameRef = {
  ngfGameId: "orst-hou-2026",
  sport: "football",
  season: 2026,
  scheduledStart: "2026-09-05T16:00:00Z",
  away: {
    ngfTeamId: "orst",
    name: "Oregon State",
    abbreviation: "ORST",
    conference: "Pac-12",
    division: "fbs",
  },
  home: {
    ngfTeamId: "hou",
    name: "Houston",
    abbreviation: "HOU",
    conference: "Big 12",
    division: "fbs",
  },
};

assert.equal(
  defaultOfficialSchoolResolver(football.home, "football", football),
  "https://uhcougars.com/sports/football/schedule",
);
assert.equal(
  defaultOfficialSchoolResolver(football.away, "football", football),
  "https://osubeavers.com/sports/football/schedule/",
);

const fakeFetch: typeof fetch = async () => new Response(
  `<section>Oregon State <span>17 - 24</span> Houston <strong>FINAL</strong></section>`,
  { status: 200, headers: { "content-type": "text/html" } },
);

const catalog = createDefaultSportsSources(fakeFetch);
const eligibleIds = catalog
  .filter((adapter) => adapter.canHandle?.(football) !== false)
  .map((adapter) => adapter.sourceId);

assert.equal(eligibleIds.length, 9);

assert(eligibleIds.includes("ncaa-football-public"));
assert(eligibleIds.includes("conference-football-public"));
assert(eligibleIds.includes("espn-football-public"));
assert(eligibleIds.includes("cbs-football-public"));
assert(eligibleIds.includes("fox-football-public"));
assert(eligibleIds.includes("nbc-football-public"));
assert(eligibleIds.includes("usatoday-football-public"));
assert(eligibleIds.includes("yahoo-football-public"));
assert(eligibleIds.includes("massey-football-public"));

assert(!eligibleIds.includes("official-away-school"));
assert(!eligibleIds.includes("official-home-school"));

assert(!eligibleIds.includes("ncaa-basketball-public"));
assert(!eligibleIds.includes("espn-basketball-public"));
assert(!eligibleIds.includes("yahoo-basketball-public"));
assert(!eligibleIds.includes("cbs-basketball-public"));
assert(!eligibleIds.includes("fox-basketball-public"));

const awaySchool = new OfficialSchoolScoreboardAdapter("away", undefined, fakeFetch);
const schoolObservation = await awaySchool.fetchGame(football);
if (!schoolObservation) throw new Error("official school adapter returned null");
assert.equal(schoolObservation.awayScore, 17);
assert.equal(schoolObservation.homeScore, 24);
assert.equal(schoolObservation.phase, "final");
assert.equal(schoolObservation.sourceLineage, "school:orst");

console.log("NGF sports source catalog tests: PASS");
