import { PublicScoreboardAdapter, buildNcaafScoreboardUrl } from "./publicScoreboard";

export function createNcaaScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new PublicScoreboardAdapter(
    "ncaa-public",
    "NCAA public scoreboard",
    buildNcaafScoreboardUrl,
    fetchImpl,
  );
}
