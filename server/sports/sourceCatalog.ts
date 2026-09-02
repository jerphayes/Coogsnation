import type {
  SportsSourceAdapter,
} from "./collector";

import {
  createNcaaBasketballScoreboardAdapter,
  createNcaaFootballScoreboardAdapter,
} from "./adapters/ncaa";

import {
  createEspnBasketballScoreboardAdapter,
  createEspnFootballScoreboardAdapter,
} from "./adapters/espn";

import {
  createYahooBasketballScoreboardAdapter,
  createYahooFootballScoreboardAdapter,
} from "./adapters/yahoo";

import {
  createCbsBasketballScoreboardAdapter,
  createCbsFootballScoreboardAdapter,
} from "./adapters/cbs";

import {
  createFoxBasketballScoreboardAdapter,
  createFoxFootballScoreboardAdapter,
} from "./adapters/fox";

import {
  ConferenceScoreboardAdapter,
} from "./adapters/conference";

import {
  createMasseyBasketballScoreboardAdapter,
  createMasseyFootballScoreboardAdapter,
  createNbcBasketballScoreboardAdapter,
  createNbcFootballScoreboardAdapter,
  createUsaTodayBasketballScoreboardAdapter,
  createUsaTodayFootballScoreboardAdapter,
} from "./adapters/nationalScoreboards";

/**
 * IMPORTANT:
 *
 * The collector executes all eligible adapters concurrently.
 *
 * Three matching independent lineages are enough to publish.
 * The other observations are still stored and analyzed.
 */
export function createDefaultSportsSources(
  fetchImpl: typeof fetch = fetch,
): SportsSourceAdapter[] {

  return [
    // FOOTBALL
    createNcaaFootballScoreboardAdapter(fetchImpl),

    new ConferenceScoreboardAdapter(
      "football",
      undefined,
      fetchImpl,
    ),

    createEspnFootballScoreboardAdapter(fetchImpl),
    createCbsFootballScoreboardAdapter(fetchImpl),
    createFoxFootballScoreboardAdapter(fetchImpl),
    createNbcFootballScoreboardAdapter(fetchImpl),
    createUsaTodayFootballScoreboardAdapter(fetchImpl),
    createYahooFootballScoreboardAdapter(fetchImpl),
    createMasseyFootballScoreboardAdapter(fetchImpl),

    // MEN'S BASKETBALL
    createNcaaBasketballScoreboardAdapter(fetchImpl),

    new ConferenceScoreboardAdapter(
      "basketball",
      undefined,
      fetchImpl,
    ),

    createEspnBasketballScoreboardAdapter(fetchImpl),
    createCbsBasketballScoreboardAdapter(fetchImpl),
    createFoxBasketballScoreboardAdapter(fetchImpl),
    createNbcBasketballScoreboardAdapter(fetchImpl),
    createUsaTodayBasketballScoreboardAdapter(fetchImpl),
    createYahooBasketballScoreboardAdapter(fetchImpl),
    createMasseyBasketballScoreboardAdapter(fetchImpl),
  ];
}
