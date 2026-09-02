import type { GameRef, Sport } from "../../../shared/ngfSportsTypes";
import { PublicScoreboardAdapter } from "./publicScoreboard";

export type ConferenceSport = Extract<Sport, "football" | "basketball">;
export type ConferencePageResolver =
  (conference: string, game: GameRef) => string | null;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const ALIASES: Record<string, string> = {
  "atlantic coast": "acc",
  "atlantic coast conference": "acc",
  "aac": "american",
  "american athletic conference": "american",
  "big 12 conference": "big 12",
  "big xii": "big 12",
  "big ten conference": "big ten",
  "cusa": "conference usa",
  "c usa": "conference usa",
  "mid american": "mac",
  "mid american conference": "mac",
  "mountain west conference": "mountain west",
  "pacific 12": "pac 12",
  "southeastern": "sec",
  "southeastern conference": "sec",
  "sun belt conference": "sun belt",
  "big sky conference": "big sky",
  "coastal athletic association": "caa",
  "ivy league": "ivy",
  "mid eastern athletic conference": "meac",
  "missouri valley football conference": "mvfc",
  "northeast conference": "nec",
  "patriot league": "patriot",
  "pioneer football league": "pioneer",
  "southern conference": "socon",
  "southland conference": "southland",
  "southwestern athletic conference": "swac",
  "united athletic conference": "uac",
};

function canonical(value: string): string {
  const normalized = normalize(value);
  return ALIASES[normalized] ?? normalized;
}

const FOOTBALL_CONFERENCE_PAGES: Record<string, string> = {
  // FBS
  "acc": "https://theacc.com/calendar.aspx?path=football",
  "american": "https://theamerican.org/calendar.aspx?path=football",
  "big 12": "https://big12sports.com/calendar.aspx?path=football",
  "big ten": "https://bigten.org/calendar.aspx?path=football",
  "conference usa": "https://conferenceusa.com/calendar.aspx?path=football",
  "mac": "https://getsomemaction.com/calendar.aspx?path=football",
  "mountain west": "https://themw.com/sports/football/schedule/",
  "pac 12": "https://pac-12.com/football/schedule",
  "sec": "https://www.secsports.com/schedule/football",
  "sun belt": "https://sunbeltsports.org/calendar.aspx?path=football",

  // FCS
  "big sky": "https://bigskyconf.com/calendar.aspx?path=football",
  "caa": "https://caasports.com/calendar.aspx?path=football",
  "ivy": "https://ivyleague.com/calendar.aspx?path=football",
  "meac": "https://meacsports.com/calendar.aspx?path=football",
  "mvfc": "https://valley-football.org/calendar.aspx?path=football",
  "nec": "https://necsports.com/calendar.aspx?path=football",
  "ovc": "https://ovcbigsouthfootball.com/calendar.aspx?path=football",
  "ovc big south": "https://ovcbigsouthfootball.com/calendar.aspx?path=football",
  "patriot": "https://patriotleague.org/calendar.aspx?path=football",
  "pioneer": "https://pioneer-football.org/sports/football",
  "socon": "https://soconsports.com/fb/schedule/2026/",
  "southland": "https://www.southland.org/calendar.aspx?path=football",
  "swac": "https://swac.org/calendar.aspx?path=football",
  "uac": "https://uacsports.com/calendar.aspx",
};

const BASKETBALL_CONFERENCE_PAGES: Record<string, string> = {
  "acc": "https://theacc.com/calendar.aspx?path=mbball",
  "american": "https://theamerican.org/calendar.aspx?path=mbball",
  "big 12": "https://big12sports.com/calendar.aspx?path=mbball",
  "big ten": "https://bigten.org/calendar.aspx?path=mbball",
  "conference usa": "https://conferenceusa.com/calendar.aspx?path=mbball",
  "mac": "https://getsomemaction.com/calendar.aspx?path=mbball",
  "mountain west": "https://themw.com/sports/mens-basketball/schedule/",
  "pac 12": "https://pac-12.com/mens-basketball/schedule",
  "sec": "https://www.secsports.com/schedule/mens-basketball",
  "sun belt": "https://sunbeltsports.org/calendar.aspx?path=mbball",
};

export function defaultConferenceResolverForSport(
  sport: ConferenceSport,
): ConferencePageResolver {
  const pages =
    sport === "basketball"
      ? BASKETBALL_CONFERENCE_PAGES
      : FOOTBALL_CONFERENCE_PAGES;

  return (conference) => pages[canonical(conference)] ?? null;
}

export const defaultConferenceResolver =
  defaultConferenceResolverForSport("football");

function conferencePage(
  game: GameRef,
  resolver: ConferencePageResolver,
): string | null {
  // Try away conference first, then home. This handles nonconference games
  // and independents without creating duplicate conference votes.
  for (const conference of [
    game.away.conference,
    game.home.conference,
  ]) {
    if (!conference) continue;
    const url = resolver(conference, game);
    if (url) return url;
  }

  return null;
}

export class ConferenceScoreboardAdapter extends PublicScoreboardAdapter {
  readonly lineageId = "conference";
  constructor(
    sport: ConferenceSport = "football",
    resolver: ConferencePageResolver =
      defaultConferenceResolverForSport(sport),
    fetchImpl: typeof fetch = fetch,
  ) {
    super(
      `conference-${sport}-public`,
      `Division I ${sport} conference scoreboard`,
      (game) =>
        conferencePage(game, resolver) ||
        "data:text/plain,unconfigured",
      async (input, init) => {
        const url = String(input);

        if (url.startsWith("data:text/plain,unconfigured")) {
          return new Response("", { status: 404 });
        }

        return fetchImpl(input, init);
      },
      (game) =>
        game.sport === sport &&
        conferencePage(game, resolver) !== null,
    );
  }
}
