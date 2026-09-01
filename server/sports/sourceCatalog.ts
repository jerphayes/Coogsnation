import type { SportsSourceAdapter } from "./collector";

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

/**
 * NGF primary score quorum.
 *
 * Exactly five independent publishing lineages are active per sport:
 *
 *   NCAA
 *   ESPN
 *   Yahoo
 *   CBS
 *   FOX
 *
 * The SportsFactsEngine requires any THREE matching independent
 * lineages before publishing live, halftime or final scores.
 *
 * Conference and official-school adapters remain available in the
 * codebase but are intentionally outside the primary five-source
 * quorum for now.
 */
export function createDefaultSportsSources(
  fetchImpl: typeof fetch = fetch,
): SportsSourceAdapter[] {
  return [
    // FOOTBALL -- five primary votes
    createNcaaFootballScoreboardAdapter(fetchImpl),
    createEspnFootballScoreboardAdapter(fetchImpl),
    createYahooFootballScoreboardAdapter(fetchImpl),
    createCbsFootballScoreboardAdapter(fetchImpl),
    createFoxFootballScoreboardAdapter(fetchImpl),

    // MEN'S BASKETBALL -- same five-source architecture
    createNcaaBasketballScoreboardAdapter(fetchImpl),
    createEspnBasketballScoreboardAdapter(fetchImpl),
    createYahooBasketballScoreboardAdapter(fetchImpl),
    createCbsBasketballScoreboardAdapter(fetchImpl),
    createFoxBasketballScoreboardAdapter(fetchImpl),
  ];
}
