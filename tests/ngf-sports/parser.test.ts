import { strict as assert } from "node:assert";
import { parsePublicScoreboardBody } from "../../server/sports/adapters/publicScoreboard";
import type { GameRef } from "../../shared/ngfSportsTypes";
const game: GameRef = {
  ngfGameId:"hou-tex", sport:"football", season:2026, scheduledStart:"2026-09-05T17:00:00Z",
  away:{ngfTeamId:"hou",name:"Houston",abbreviation:"HOU",division:"fbs"},
  home:{ngfTeamId:"tex",name:"Texas",abbreviation:"TEX",division:"fbs",rank:4},
};
const html = `<section><b>Houston</b> <span>38 - 35</span> <b>Texas</b> <strong>FINAL</strong></section>`;
const obs = parsePublicScoreboardBody("fixture", html, game, new Date("2026-09-05T20:00:00Z"));
if (!obs) throw new Error("parser returned null");
assert.equal(obs.awayScore,38); assert.equal(obs.homeScore,35); assert.equal(obs.phase,"final");
console.log("NGF public parser tests: PASS");
