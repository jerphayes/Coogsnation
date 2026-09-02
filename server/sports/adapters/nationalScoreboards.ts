import type {
  GameRef,
  Sport,
} from "../../../shared/ngfSportsTypes";

import {
  PublicScoreboardAdapter,
} from "./publicScoreboard";

type ActiveSport =
  Extract<Sport, "football" | "basketball">;

function dateParts(game: GameRef) {
  const date = new Date(game.scheduledStart);

  const year = date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate(),
    ).padStart(2, "0");

  return {
    year,
    iso: `${year}-${month}-${day}`,
    compact: `${year}${month}${day}`,
  };
}

class NationalScoreboardAdapter
  extends PublicScoreboardAdapter {

  readonly lineageId: string;

  constructor(
    sourceId: string,
    label: string,
    lineageId: string,
    sport: ActiveSport,
    urlForGame: (game: GameRef) => string,
    fetchImpl: typeof fetch,
  ) {
    super(
      sourceId,
      label,
      urlForGame,
      fetchImpl,
      (game) =>
        game.sport === sport &&
        (game.competitionScope ?? "varsity") === "varsity",
    );

    this.lineageId = lineageId;
  }
}

export function createNbcFootballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "nbc-football-public",
    "NBC Sports college football scores",
    "nbc",
    "football",
    () =>
      "https://www.nbcsports.com/college-football/scores",
    fetchImpl,
  );
}

export function createNbcBasketballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "nbc-basketball-public",
    "NBC Sports men's college basketball scores",
    "nbc",
    "basketball",
    () =>
      "https://www.nbcsports.com/mens-college-basketball/scores",
    fetchImpl,
  );
}

export function createUsaTodayFootballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "usatoday-football-public",
    "USA Today college football scores",
    "usatoday",
    "football",
    (game) => {
      const date = dateParts(game);

      return (
        "https://sportsdata.usatoday.com/" +
        `football/ncaaf/scores?date=${date.iso}` +
        `&season=${date.year}`
      );
    },
    fetchImpl,
  );
}

export function createUsaTodayBasketballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "usatoday-basketball-public",
    "USA Today men's college basketball scores",
    "usatoday",
    "basketball",
    (game) => {
      const date = dateParts(game);

      return (
        "https://sportsdata.usatoday.com/" +
        `basketball/ncaab/scores?date=${date.iso}` +
        `&season=${date.year}`
      );
    },
    fetchImpl,
  );
}

export function createMasseyFootballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "massey-football-public",
    "Massey Ratings college football games",
    "massey",
    "football",
    (game) => {
      const date = dateParts(game);

      const division =
        game.away.division === "fcs" &&
        game.home.division === "fcs"
          ? "fcs"
          : "fbs";

      return (
        `https://masseyratings.com/cf/${division}/games` +
        `?dt=${date.compact}`
      );
    },
    fetchImpl,
  );
}

export function createMasseyBasketballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NationalScoreboardAdapter(
    "massey-basketball-public",
    "Massey Ratings NCAA D1 basketball games",
    "massey",
    "basketball",
    (game) => {
      const date = dateParts(game);

      return (
        "https://masseyratings.com/cb/ncaa-d1/games" +
        `?dt=${date.compact}`
      );
    },
    fetchImpl,
  );
}
