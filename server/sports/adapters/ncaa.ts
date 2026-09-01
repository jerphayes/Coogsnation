import { PublicScoreboardAdapter, buildNcaabScoreboardUrl, buildNcaafScoreboardUrl } from "./publicScoreboard";

export function createNcaaFootballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new PublicScoreboardAdapter(
    "ncaa-football-public",
    "NCAA football public scoreboard",
    buildNcaafScoreboardUrl,
    fetchImpl,
    (game) => game.sport === "football",
  );
}

export function createNcaaBasketballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new PublicScoreboardAdapter(
    "ncaa-basketball-public",
    "NCAA men's basketball public scoreboard",
    buildNcaabScoreboardUrl,
    fetchImpl,
    (game) => game.sport === "basketball",
  );
}

// Backward-compatible name while callers move to the sport-specific catalog.
export const createNcaaScoreboardAdapter = createNcaaFootballScoreboardAdapter;
