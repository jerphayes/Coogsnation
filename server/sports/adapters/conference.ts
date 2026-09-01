import type { GameRef, Sport } from "../../../shared/ngfSportsTypes";
import { PublicScoreboardAdapter } from "./publicScoreboard";

export type ConferenceSport = Extract<Sport, "football" | "basketball">;
export type ConferencePageResolver = (conference: string, game: GameRef) => string | null;

const FOOTBALL_CONFERENCE_PAGES: Record<string, string> = {
  "big 12": "https://big12sports.com/calendar.aspx?path=football",
  "big ten": "https://bigten.org/calendar.aspx?path=football",
  "sec": "https://www.secsports.com/schedule/football",
  "acc": "https://theacc.com/calendar.aspx?path=football",
  "american": "https://theamerican.org/calendar.aspx?path=football",
  "conference usa": "https://conferenceusa.com/calendar.aspx?path=football",
  "mac": "https://getsomemaction.com/calendar.aspx?path=football",
  "mountain west": "https://themw.com/sports/football/schedule/",
  "sun belt": "https://sunbeltsports.org/calendar.aspx?path=football",
  "pac-12": "https://pac-12.com/football/schedule",
};

const BASKETBALL_CONFERENCE_PAGES: Record<string, string> = {
  "big 12": "https://big12sports.com/calendar.aspx?path=mbball",
  "big ten": "https://bigten.org/calendar.aspx?path=mbball",
  "sec": "https://www.secsports.com/schedule/mens-basketball",
  "acc": "https://theacc.com/calendar.aspx?path=mbball",
  "american": "https://theamerican.org/calendar.aspx?path=mbball",
  "conference usa": "https://conferenceusa.com/calendar.aspx?path=mbball",
  "mac": "https://getsomemaction.com/calendar.aspx?path=mbball",
  "mountain west": "https://themw.com/sports/mens-basketball/schedule/",
  "sun belt": "https://sunbeltsports.org/calendar.aspx?path=mbball",
  "pac-12": "https://pac-12.com/mens-basketball/schedule",
};

function normalizedConference(game: GameRef): string {
  return (game.away.conference || game.home.conference || "").trim().toLowerCase();
}

export function defaultConferenceResolverForSport(sport: ConferenceSport): ConferencePageResolver {
  const pages = sport === "basketball" ? BASKETBALL_CONFERENCE_PAGES : FOOTBALL_CONFERENCE_PAGES;
  return (conference) => pages[conference.trim().toLowerCase()] ?? null;
}

export const defaultConferenceResolver = defaultConferenceResolverForSport("football");

/** Sport-scoped conference adapter; unsupported games return null without making a request. */
export class ConferenceScoreboardAdapter extends PublicScoreboardAdapter {
  constructor(
    sport: ConferenceSport = "football",
    resolver: ConferencePageResolver = defaultConferenceResolverForSport(sport),
    fetchImpl: typeof fetch = fetch,
  ) {
    super(
      `conference-${sport}-public`,
      `Division I ${sport} conference scoreboard`,
      (game) => resolver(normalizedConference(game), game) || "data:text/plain,unconfigured",
      async (input, init) => {
        const url = String(input);
        if (url.startsWith("data:text/plain,unconfigured")) return new Response("", { status: 404 });
        return fetchImpl(input, init);
      },
      (game) => game.sport === sport,
    );
  }
}
