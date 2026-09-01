import { createNcaaBasketballScoreboardAdapter, createNcaaFootballScoreboardAdapter } from "./adapters/ncaa";
import { ConferenceScoreboardAdapter } from "./adapters/conference";

export function createDefaultSportsSources(fetchImpl: typeof fetch = fetch) {
  return [
    createNcaaFootballScoreboardAdapter(fetchImpl),
    createNcaaBasketballScoreboardAdapter(fetchImpl),
    new ConferenceScoreboardAdapter("football", undefined, fetchImpl),
    new ConferenceScoreboardAdapter("basketball", undefined, fetchImpl),
  ];
}
