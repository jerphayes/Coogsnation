import { createNcaaBasketballScoreboardAdapter, createNcaaFootballScoreboardAdapter } from "./adapters/ncaa";
import { ConferenceScoreboardAdapter } from "./adapters/conference";
import { createCbsBasketballScoreboardAdapter, createCbsFootballScoreboardAdapter } from "./adapters/cbs";

export function createDefaultSportsSources(fetchImpl: typeof fetch = fetch) {
  return [
    createNcaaFootballScoreboardAdapter(fetchImpl),
    createNcaaBasketballScoreboardAdapter(fetchImpl),
    new ConferenceScoreboardAdapter("football", undefined, fetchImpl),
    new ConferenceScoreboardAdapter("basketball", undefined, fetchImpl),
    createCbsFootballScoreboardAdapter(fetchImpl),
    createCbsBasketballScoreboardAdapter(fetchImpl),
  ];
}
