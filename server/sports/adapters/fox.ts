import { PublicScoreboardAdapter } from "./publicScoreboard";

class FoxScoreboardAdapter extends PublicScoreboardAdapter {
  readonly lineageId = "fox";

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

export function createFoxFootballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new FoxScoreboardAdapter(
    "fox-football-public",
    "FOX Sports college football scoreboard",
    "https://www.foxsports.com/college-football/scores",
    "football",
    fetchImpl,
  );
}

export function createFoxBasketballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new FoxScoreboardAdapter(
    "fox-basketball-public",
    "FOX Sports men's college basketball scoreboard",
    "https://www.foxsports.com/college-basketball/scores",
    "basketball",
    fetchImpl,
  );
}
