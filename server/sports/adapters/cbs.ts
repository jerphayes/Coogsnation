import { PublicScoreboardAdapter } from "./publicScoreboard";

class CbsScoreboardAdapter extends PublicScoreboardAdapter {
  readonly lineageId = "cbs";

  constructor(
    sourceId: string,
    label: string,
    url: string,
    sport: "football" | "basketball",
    fetchImpl: typeof fetch,
  ) {
    super(sourceId, label, () => url, fetchImpl, (game) => game.sport === sport);
  }
}

export function createCbsFootballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new CbsScoreboardAdapter(
    "cbs-football-public",
    "CBS Sports college football scoreboard",
    "https://www.cbssports.com/college-football/scoreboard/ALL/",
    "football",
    fetchImpl,
  );
}

export function createCbsBasketballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new CbsScoreboardAdapter(
    "cbs-basketball-public",
    "CBS Sports men's college basketball scoreboard",
    "https://www.cbssports.com/college-basketball/scoreboard/all/",
    "basketball",
    fetchImpl,
  );
}
