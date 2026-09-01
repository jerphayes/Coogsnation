import type {
  GameRef,
  ScoreObservation,
  TeamRef,
} from "../../../shared/ngfSportsTypes";

import type { SportsSourceAdapter } from "../collector";
import { parsePublicScoreboardBody } from "./publicScoreboard";

type YahooSport = "football" | "basketball";

const YAHOO_TEAM_SLUG_ALIASES: Record<string, string[]> = {
  HAW: ["hawaii"],
  STAN: ["stanford"],
  JAXST: ["jacksonville-state"],
  NDSU: ["north-dakota-state"],
  MEM: ["memphis"],
  UNLV: ["unlv"],
  NMSU: ["new-mexico-state"],
  FSU: ["florida-state"],
  SACST: ["sacramento-state"],
  EMU: ["eastern-michigan"],
  SJSU: ["san-jose-state"],
  USC: ["usc"],
  UNC: ["north-carolina"],
  TCU: ["tcu"],
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamSlugs(team: TeamRef): string[] {
  const abbreviation = team.abbreviation.toUpperCase();

  return [...new Set([
    ...(YAHOO_TEAM_SLUG_ALIASES[abbreviation] ?? []),
    slug(team.name),
    slug(team.abbreviation),
  ].filter(Boolean))];
}

function dateKeys(game: GameRef): string[] {
  const scheduled = new Date(game.scheduledStart);
  const previous = new Date(scheduled.getTime() - 86_400_000);

  return [...new Set([scheduled, previous].map((date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`
  ))];
}

function absoluteYahooUrl(value: string): string {
  const decoded = value.replace(/&amp;/g, "&");

  if (decoded.startsWith("https://")) return decoded;
  if (decoded.startsWith("//")) return `https:${decoded}`;
  if (decoded.startsWith("/")) return `https://sports.yahoo.com${decoded}`;

  return `https://sports.yahoo.com/${decoded}`;
}

function findYahooGameUrl(
  body: string,
  game: GameRef,
  path: "ncaaf" | "ncaab",
): string | null {
  const away = teamSlugs(game.away);
  const home = teamSlugs(game.home);
  const dates = dateKeys(game);

  const links = new Set<string>();

  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(body))) {
    links.add(match[1]);
  }

  for (const raw of links) {
    const url = absoluteYahooUrl(raw);
    const lower = url.toLowerCase();

    if (!lower.includes(`/${path}/`)) continue;
    if (lower.includes(`/${path}/teams/`)) continue;

    const awayMatch = away.some((value) =>
      lower.includes(value)
    );

    const homeMatch = home.some((value) =>
      lower.includes(value)
    );

    const dateMatch = dates.some((value) =>
      lower.includes(value)
    );

    if (awayMatch && homeMatch && dateMatch) {
      return url;
    }
  }

  return null;
}

/**
 * Yahoo final game pages put the verified final directly in the title:
 *
 * San Jose State Spartans 26 - USC Trojans 42:
 * Final score, results, recap...
 *
 * This is much safer than guessing numbers from the rendered page.
 */
function parseYahooFinalTitle(
  sourceId: string,
  body: string,
  game: GameRef,
): ScoreObservation | null {
  const title =
    body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

  if (!title) return null;

  const normalized = normalize(title);

  const awayMatches = [
    game.away.name,
    game.away.abbreviation,
  ]
    .map(normalize)
    .filter(Boolean)
    .some((value) => normalized.includes(value));

  const homeMatches = [
    game.home.name,
    game.home.abbreviation,
  ]
    .map(normalize)
    .filter(Boolean)
    .some((value) => normalized.includes(value));

  if (!awayMatches || !homeMatches) return null;

  const score = title.match(
    /\b(\d{1,3})\s*-\s*[^:]*?\b(\d{1,3})\s*:\s*Final score\b/i,
  );

  if (!score) return null;

  return {
    sourceId,
    sourceLineage: "yahoo",
    observedAt: new Date().toISOString(),
    game,
    awayScore: Number(score[1]),
    homeScore: Number(score[2]),
    phase: "final",
    period: null,
    clock: null,
    statusText: "Final",
  };
}

class YahooScoreboardAdapter implements SportsSourceAdapter {
  readonly lineageId = "yahoo";

  private readonly gameUrls = new Map<string, string>();

  constructor(
    public readonly sourceId: string,
    public readonly label: string,
    private readonly sport: YahooSport,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  canHandle(game: GameRef): boolean {
    return game.sport === this.sport;
  }

  private async discoverGameUrl(
    game: GameRef,
  ): Promise<string | null> {
    const path =
      this.sport === "football"
        ? "ncaaf"
        : "ncaab";

    // Try both schools. Once found, cache the actual game page.
    for (const team of [game.home, game.away]) {
      for (const teamSlug of teamSlugs(team)) {
        const scheduleUrl =
          `https://sports.yahoo.com/${path}/teams/${teamSlug}/schedule/`;

        try {
          const response = await this.fetchImpl(scheduleUrl, {
            headers: {
              accept: "text/html,application/xhtml+xml",
              "user-agent":
                "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(12_000),
          });

          if (!response.ok) continue;

          const body = await response.text();

          const gameUrl =
            findYahooGameUrl(body, game, path);

          if (gameUrl) return gameUrl;
        } catch {
          // Try next team/slug.
        }
      }
    }

    return null;
  }

  async fetchGame(
    game: GameRef,
  ): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;

    let gameUrl =
      this.gameUrls.get(game.ngfGameId) ?? null;

    if (!gameUrl) {
      gameUrl = await this.discoverGameUrl(game);

      if (!gameUrl) return null;

      this.gameUrls.set(game.ngfGameId, gameUrl);
    }

    const response = await this.fetchImpl(gameUrl, {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "user-agent":
          "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      this.gameUrls.delete(game.ngfGameId);
      throw new Error(
        `${this.label} HTTP ${response.status}`,
      );
    }

    const body = await response.text();

    // Strongest Yahoo final parser first.
    const finalFromTitle =
      parseYahooFinalTitle(
        this.sourceId,
        body,
        game,
      );

    if (finalFromTitle) return finalFromTitle;

    // Structured/live-data parser remains available
    // during games.
    const observation =
      parsePublicScoreboardBody(
        this.sourceId,
        body,
        game,
      );

    if (!observation) return null;

    return {
      ...observation,
      sourceLineage: this.lineageId,
    };
  }
}

export function createYahooFootballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new YahooScoreboardAdapter(
    "yahoo-football-public",
    "Yahoo Sports college football game page",
    "football",
    fetchImpl,
  );
}

export function createYahooBasketballScoreboardAdapter(
  fetchImpl: typeof fetch = fetch,
) {
  return new YahooScoreboardAdapter(
    "yahoo-basketball-public",
    "Yahoo Sports men's college basketball game page",
    "basketball",
    fetchImpl,
  );
}
