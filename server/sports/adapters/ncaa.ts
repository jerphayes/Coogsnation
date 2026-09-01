import type { GameRef, ScoreObservation } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";
import {
  PublicScoreboardAdapter,
  buildNcaabScoreboardUrl,
  parsePublicScoreboardBody,
} from "./publicScoreboard";

function normalizeConference(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const NCAA_CONFERENCE_SLUGS: Record<string, string> = {
  // FBS
  "acc": "acc",
  "atlantic coast": "acc",
  "atlantic coast conference": "acc",

  "american": "american",
  "aac": "american",
  "american athletic": "american",
  "american athletic conference": "american",

  "big 12": "big-12",
  "big 12 conference": "big-12",
  "big xii": "big-12",

  "big ten": "big-ten",
  "big ten conference": "big-ten",

  "cusa": "cusa",
  "c usa": "cusa",
  "conference usa": "cusa",

  "fbs independent": "fbs-independent",
  "independent": "fbs-independent",
  "independents": "fbs-independent",

  "mac": "mac",
  "mid american": "mac",
  "mid american conference": "mac",

  "mountain west": "mountain-west",
  "mountain west conference": "mountain-west",

  "pac 12": "pac-12",
  "pacific 12": "pac-12",

  "sec": "sec",
  "southeastern": "sec",
  "southeastern conference": "sec",

  "sun belt": "sun-belt",
  "sun belt conference": "sun-belt",

  // FCS
  "big sky": "big-sky",
  "big sky conference": "big-sky",

  "caa": "caa",
  "coastal athletic association": "caa",

  "ivy": "ivy-league",
  "ivy league": "ivy-league",

  "meac": "meac",
  "mid eastern athletic conference": "meac",

  "mvfc": "mvfc",
  "missouri valley football conference": "mvfc",

  "nec": "nec",
  "northeast conference": "nec",

  "ovc": "ovc",
  "ohio valley": "ovc",
  "ohio valley conference": "ovc",
  "ovc big south": "ovc-big-south",

  "patriot": "patriot-league",
  "patriot league": "patriot-league",

  "pioneer": "pioneer",
  "pioneer football league": "pioneer",

  "socon": "southern",
  "southern": "southern",
  "southern conference": "southern",

  "southland": "southland",
  "southland conference": "southland",

  "swac": "swac",
  "southwestern athletic conference": "swac",

  "uac": "uac",
  "united athletic conference": "uac",
};

function conferenceSlug(value?: string): string | null {
  if (!value) return null;
  const normalized = normalizeConference(value);
  return NCAA_CONFERENCE_SLUGS[normalized] ?? null;
}

function ncaaBaseUrl(game: GameRef): string {
  const date = new Date(game.scheduledStart);

  const season =
    date.getUTCMonth() <= 1
      ? date.getUTCFullYear() - 1
      : date.getUTCFullYear();

  const DAY_MS = 86_400_000;
  const septemberFirst = new Date(Date.UTC(season, 8, 1));
  const daysToMonday = (8 - septemberFirst.getUTCDay()) % 7;
  const laborDayMs = Date.UTC(season, 8, 1 + daysToMonday);
  const week1ThursdayMs = laborDayMs - 4 * DAY_MS;

  const targetMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  const week =
    targetMs < week1ThursdayMs
      ? "01"
      : String(
          Math.max(
            1,
            Math.floor(
              (targetMs - week1ThursdayMs) / (7 * DAY_MS),
            ) + 1,
          ),
        ).padStart(2, "0");

  const divisions = [game.away.division, game.home.division];

  const division =
    divisions.includes("fbs") ? "fbs" :
    divisions.includes("fcs") ? "fcs" :
    divisions.includes("d2") ? "d2" :
    divisions.includes("d3") ? "d3" :
    "fbs";

  return `https://www.ncaa.com/scoreboard/football/${division}/${season}/${week}`;
}

export function buildNcaafScoreboardUrls(game: GameRef): string[] {
  const base = ncaaBaseUrl(game);
  const urls: string[] = [];

  for (const team of [game.away, game.home]) {
    const slug = conferenceSlug(team.conference);
    if (slug) urls.push(`${base}/${slug}`);
  }

  // Proven NCAA catch-all scoreboard.
  urls.push(`${base}/all-conf`);

  return [...new Set(urls)];
}

class NcaaFootballScoreboardAdapter implements SportsSourceAdapter {
  readonly sourceId = "ncaa-football-public";
  readonly label = "NCAA football public scoreboard";
  readonly lineageId = "ncaa";

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  canHandle(game: GameRef): boolean {
    return game.sport === "football";
  }

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;

    const urls = buildNcaafScoreboardUrls(game);

    for (const url of urls) {
      try {
        const response = await this.fetchImpl(url, {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "user-agent":
              "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(12_000),
        });

        if (!response.ok) continue;

        const observation = parsePublicScoreboardBody(
          this.sourceId,
          await response.text(),
          game,
        );

        if (!observation) continue;

        return {
          ...observation,
          sourceLineage: "ncaa",
        };
      } catch {
        // Try next targeted NCAA URL, then all-conf fallback.
      }
    }

    return null;
  }
}

export function createNcaaFootballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new NcaaFootballScoreboardAdapter(fetchImpl);
}

export function createNcaaBasketballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new PublicScoreboardAdapter(
    "ncaa-basketball-public",
    "NCAA men's basketball public scoreboard",
    buildNcaabScoreboardUrl,
    fetchImpl,
    (game) => game.sport === "basketball",
  );
}

export const createNcaaScoreboardAdapter =
  createNcaaFootballScoreboardAdapter;
