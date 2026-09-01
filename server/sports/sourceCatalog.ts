import type { SportsSourceAdapter } from "./collector";
import {
  createNcaaBasketballScoreboardAdapter,
  createNcaaFootballScoreboardAdapter,
} from "./adapters/ncaa";
import { ConferenceScoreboardAdapter } from "./adapters/conference";
import {
  createCbsBasketballScoreboardAdapter,
  createCbsFootballScoreboardAdapter,
} from "./adapters/cbs";
import {
  createEspnBasketballScoreboardAdapter,
  createEspnFootballScoreboardAdapter,
} from "./adapters/espn";
import {
  createFoxBasketballScoreboardAdapter,
  createFoxFootballScoreboardAdapter,
} from "./adapters/fox";
import { OfficialSchoolScoreboardAdapter } from "./adapters/school";

export function createDefaultSportsSources(
  fetchImpl: typeof fetch = fetch,
): SportsSourceAdapter[] {
  return [
    // Source class 1 — governing body
    createNcaaFootballScoreboardAdapter(fetchImpl),
    createNcaaBasketballScoreboardAdapter(fetchImpl),

    // Source class 2 — official conference
    new ConferenceScoreboardAdapter("football", undefined, fetchImpl),
    new ConferenceScoreboardAdapter("basketball", undefined, fetchImpl),

    // Source class 3+ — high-confidence independent media
    createCbsFootballScoreboardAdapter(fetchImpl),
    createCbsBasketballScoreboardAdapter(fetchImpl),
    createEspnFootballScoreboardAdapter(fetchImpl),
    createEspnBasketballScoreboardAdapter(fetchImpl),
    createFoxFootballScoreboardAdapter(fetchImpl),
    createFoxBasketballScoreboardAdapter(fetchImpl),

    // Additional independent official verification
    new OfficialSchoolScoreboardAdapter("away", undefined, fetchImpl),
    new OfficialSchoolScoreboardAdapter("home", undefined, fetchImpl),
  ];
}
