import { strict as assert } from "node:assert";
import {
  discoverNcaaDaySlate,
  ncaaScoreboardUrl,
  ncaaWeekCode,
} from "../../server/sports/discovery";

assert.equal(ncaaWeekCode(new Date("2026-08-12T12:00:00Z")), "P");
assert.equal(ncaaWeekCode(new Date("2026-08-27T12:00:00Z")), "P");
assert.equal(ncaaWeekCode(new Date("2026-09-03T12:00:00Z")), "01");
assert.equal(ncaaWeekCode(new Date("2026-09-10T12:00:00Z")), "02");

assert.equal(
  ncaaScoreboardUrl(new Date("2026-09-03T12:00:00Z"), "fbs"),
  "https://www.ncaa.com/scoreboard/football/fbs/2026/01/all-conf",
);

const fake404 = async () => new Response("", { status: 404 });

const emptySlate = await discoverNcaaDaySlate(
  new Date("2026-08-12T12:00:00Z"),
  "fbs",
  fake404 as typeof fetch,
);

assert.deepEqual(emptySlate, []);
console.log("NGF NCAA week/404 tests: PASS");
