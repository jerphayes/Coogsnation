import {
  strict as assert,
} from "node:assert";

import {
  SportsFactsEngine,
} from "../../server/sports/engine";

import {
  toTickerItem,
} from "../../server/sports/ticker";

import type {
  ReconciledGame,
} from "../../shared/ngfSportsTypes";

const varsity:ReconciledGame = {
  game:{
    ngfGameId:"varsity-hou-ttu",
    sport:"football",
    season:2026,
    scheduledStart:
      "2026-09-05T17:00:00Z",
    competitionScope:"varsity",

    away:{
      ngfTeamId:"hou",
      name:"Houston",
      abbreviation:"HOU",
      division:"fbs",
    },

    home:{
      ngfTeamId:"ttu",
      name:"Texas Tech",
      abbreviation:"TTU",
      division:"fbs",
    },
  },

  awayScore:28,
  homeScore:21,
  phase:"final",
  acceptedAt:
    "2026-09-05T21:00:00Z",
  confidence:1,
  agreeingSources:[
    "ncaa",
    "espn",
    "cbs",
  ],
  conflictingSources:[],
  agreeingLineages:[
    "ncaa",
    "espn",
    "cbs",
  ],
};

const intramural:ReconciledGame = {
  game:{
    ngfGameId:"intramural-a-b",
    sport:"football",
    season:2026,
    scheduledStart:
      "2026-09-05T18:00:00Z",
    competitionScope:"intramural",

    away:{
      ngfTeamId:"cougar-kings",
      name:"Cougar Kings",
      abbreviation:"CK",
      division:"d1",
    },

    home:{
      ngfTeamId:"law-dogs",
      name:"Law Dogs",
      abbreviation:"LD",
      division:"d1",
    },
  },

  awayScore:28,
  homeScore:21,
  phase:"final",
  acceptedAt:
    "2026-09-05T20:00:00Z",
  confidence:1,
  agreeingSources:["intramural"],
  conflictingSources:[],
};

const engine =
  new SportsFactsEngine();

engine.restoreCurrent([
  varsity,
  intramural,
]);

const snapshot =
  engine.snapshot(
    new Date(
      "2026-09-06T12:00:00Z",
    ),
  );

assert(
  snapshot.games.some(
    (game) =>
      game.gameId ===
      "varsity-hou-ttu",
  ),
);

assert(
  !snapshot.games.some(
    (game) =>
      game.gameId ===
      "intramural-a-b",
  ),
);

const mensBasketball =
  toTickerItem({
    ...varsity,

    game:{
      ...varsity.game,
      ngfGameId:"mbb",
      sport:"basketball",
      competitionGender:"men",
    },

    phase:"live",
    period:2,
    clock:"4:12",
  });

assert.equal(
  mensBasketball.status,
  "2H 4:12",
);

const womensBasketball =
  toTickerItem({
    ...varsity,

    game:{
      ...varsity.game,
      ngfGameId:"wbb",
      sport:"basketball",
      competitionGender:"women",
    },

    phase:"live",
    period:3,
    clock:"4:12",
  });

assert.equal(
  womensBasketball.status,
  "Q3 4:12",
);

const baseball =
  toTickerItem({
    ...varsity,

    game:{
      ...varsity.game,
      ngfGameId:"baseball",
      sport:"baseball",
    },

    phase:"live",
    period:7,
    stateDetail:"BOT 7",
    clock:null,
  });

assert.equal(
  baseball.status,
  "BOT 7",
);

console.log(
  "NGF intramural/sport separation tests: PASS",
);
