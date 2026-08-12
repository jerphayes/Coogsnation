import { createNcaaScoreboardAdapter } from "./adapters/ncaa";
import { ConferenceScoreboardAdapter } from "./adapters/conference";

export function createDefaultSportsSources(fetchImpl: typeof fetch = fetch) {
  return [
    createNcaaScoreboardAdapter(fetchImpl),
    new ConferenceScoreboardAdapter(undefined, fetchImpl),
  ];
}
