import type { GameRef } from "../../../shared/ngfSportsTypes";
import { PublicScoreboardAdapter } from "./publicScoreboard";

export type ConferencePageResolver = (conference: string, game: GameRef) => string | null;

const DEFAULT_CONFERENCE_PAGES: Record<string, string> = {
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

function normalizedConference(game: GameRef): string {
  return (game.away.conference || game.home.conference || "").trim().toLowerCase();
}

export const defaultConferenceResolver: ConferencePageResolver = (conference) => DEFAULT_CONFERENCE_PAGES[conference.trim().toLowerCase()] ?? null;

/** One adapter can serve all conferences; it returns null when no conference page is configured. */
export class ConferenceScoreboardAdapter extends PublicScoreboardAdapter {
  constructor(resolver: ConferencePageResolver = defaultConferenceResolver, fetchImpl: typeof fetch = fetch) {
    super(
      "conference-public",
      "Division I conference scoreboard",
      (game) => resolver(normalizedConference(game), game) || "data:text/plain,unconfigured",
      async (input, init) => {
        const url = String(input);
        if (url.startsWith("data:text/plain,unconfigured")) {
          return new Response("", { status: 404 });
        }
        return fetchImpl(input, init);
      },
    );
  }
}
