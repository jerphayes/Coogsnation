import { strict as assert } from "node:assert";
import { buildNcaabScoreboardUrl, parsePublicScoreboardBody } from "../../server/sports/adapters/publicScoreboard";
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

const basketball: GameRef = {
  ngfGameId:"hou-ku-basketball", sport:"basketball", season:2026, scheduledStart:"2026-12-05T20:00:00Z",
  away:{ngfTeamId:"hou",name:"Houston",abbreviation:"HOU",division:"d1"},
  home:{ngfTeamId:"ku",name:"Kansas",abbreviation:"KU",division:"d1"},
};
const embeddedJson = `<html><body><script type="application/json">${JSON.stringify({
  events:[{
    awayTeam:{name:"Houston",abbreviation:"HOU",score:71},
    homeTeam:{name:"Kansas",abbreviation:"KU",score:68},
    status:"2H 1:14",
    period:2,
    clock:"1:14",
  }],
})}</script></body></html>`;
const basketballObs = parsePublicScoreboardBody("fixture-json", embeddedJson, basketball, new Date("2026-12-05T22:00:00Z"));
if (!basketballObs) throw new Error("structured basketball parser returned null");
assert.equal(basketballObs.awayScore,71);
assert.equal(basketballObs.homeScore,68);
assert.equal(basketballObs.phase,"live");
assert.equal(basketballObs.period,2);
assert.equal(basketballObs.clock,"1:14");
assert.equal(buildNcaabScoreboardUrl(basketball), "https://www.ncaa.com/scoreboard/basketball-men/d1/2026/12/05/all-conf");

console.log("NGF public parser tests: PASS");
