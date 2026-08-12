import type { Division, GamePhase, GameRef, TeamRef } from "../../shared/ngfSportsTypes";
import { htmlToText } from "./adapters/publicScoreboard";

export interface DiscoveredGame extends GameRef {
  venue?: string;
  sourceGameId?: string;
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function abbreviation(name: string): string {
  const words = name.replace(/\([^)]*\)/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 5).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 5).toUpperCase();
}

function team(name: string, division: Division, rank?: number | null): TeamRef {
  return { ngfTeamId: slug(name), name: name.trim(), abbreviation: abbreviation(name), division, rank: rank ?? null };
}

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

function textValue(obj: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function numberValue(obj: Record<string, any>, keys: string[]): number | null {
  const text = textValue(obj, keys);
  if (text == null) return null;
  const number = Number(text.replace(/^#/, ""));
  return Number.isFinite(number) ? number : null;
}

function parseTeamish(value: unknown, division: Division): TeamRef | null {
  if (typeof value === "string" && value.trim()) return team(value, division);
  const obj = asObject(value);
  if (!obj) return null;
  const name = textValue(obj, ["name", "shortName", "school", "displayName", "teamName", "team"]);
  if (!name) return null;
  const result = team(name, division, numberValue(obj, ["rank", "ranking", "currentRank"]));
  result.abbreviation = textValue(obj, ["abbreviation", "abbr", "shortName"]) || result.abbreviation;
  result.conference = textValue(obj, ["conference", "conferenceName"]) || undefined;
  return result;
}

function dateValue(obj: Record<string, any>, fallback: string): string {
  const raw = textValue(obj, ["startDate", "startTime", "date", "gameDate", "scheduledStart", "start_date"]);
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function gameFromObject(obj: Record<string, any>, division: Division, fallbackDate: string): DiscoveredGame | null {
  const home = parseTeamish(obj.home ?? obj.homeTeam ?? obj.home_team ?? obj.team2, division);
  const away = parseTeamish(obj.away ?? obj.awayTeam ?? obj.away_team ?? obj.team1, division);
  if (!home || !away || home.ngfTeamId === away.ngfTeamId) return null;
  const sourceGameId = textValue(obj, ["gameId", "id", "eventId", "contestId"]);
  const scheduledStart = dateValue(obj, fallbackDate);
  return {
    ngfGameId: sourceGameId ? `ncaa-${slug(sourceGameId)}` : `${new Date(scheduledStart).toISOString().slice(0, 10)}-${away.ngfTeamId}-${home.ngfTeamId}`,
    sourceGameId: sourceGameId || undefined,
    sport: "football",
    season: new Date(scheduledStart).getUTCFullYear(),
    scheduledStart,
    away,
    home,
    venue: textValue(obj, ["venue", "location", "site"]) || undefined,
  };
}

function walk(value: unknown, visit: (obj: Record<string, any>) => void) {
  if (Array.isArray(value)) {
    for (const child of value) walk(child, visit);
    return;
  }
  const obj = asObject(value);
  if (!obj) return;
  visit(obj);
  for (const child of Object.values(obj)) walk(child, visit);
}

function embeddedJson(html: string): unknown[] {
  const values: unknown[] = [];
  const regex = /<script[^>]*(?:type=["']application\/(?:ld\+)?json["']|id=["'][^"']*(?:data|state|json)[^"']*["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try { values.push(JSON.parse(match[1].trim())); } catch { /* ignore malformed script payloads */ }
  }
  return values;
}

function fallbackTextGames(html: string, division: Division, fallbackDate: string): DiscoveredGame[] {
  // Conservative fallback: only parse explicit "A vs B" / "A at B" strings.
  // This intentionally avoids guessing when a page's text structure is ambiguous.
  const text = htmlToText(html);
  const games: DiscoveredGame[] = [];
  const regex = /([A-Z][A-Za-z0-9 .&'()\-]{2,45})\s+(?:vs\.?|at)\s+([A-Z][A-Za-z0-9 .&'()\-]{2,45})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const away = team(match[1], division);
    const home = team(match[2], division);
    if (away.ngfTeamId === home.ngfTeamId) continue;
    games.push({
      ngfGameId: `${fallbackDate.slice(0, 10)}-${away.ngfTeamId}-${home.ngfTeamId}`,
      sport: "football",
      season: new Date(fallbackDate).getUTCFullYear(),
      scheduledStart: fallbackDate,
      away,
      home,
    });
  }
  return games;
}

export function discoverGamesFromPublicPage(html: string, division: Division, fallbackDate: string): DiscoveredGame[] {
  const found = new Map<string, DiscoveredGame>();
  for (const payload of embeddedJson(html)) {
    walk(payload, (obj) => {
      const game = gameFromObject(obj, division, fallbackDate);
      if (game) found.set(game.ngfGameId, game);
    });
  }
  if (!found.size) {
    for (const game of fallbackTextGames(html, division, fallbackDate)) found.set(game.ngfGameId, game);
  }
  return [...found.values()];
}


const DAY_MS = 86_400_000;
const NCAA_SLATE_CACHE_MS = 2 * 60_000;

const ncaaSlateCache = new Map<
  string,
  { expiresAt: number; games: DiscoveredGame[] }
>();

function ncaaSeasonYear(date: Date): number {
  return date.getUTCMonth() <= 1
    ? date.getUTCFullYear() - 1
    : date.getUTCFullYear();
}

export function ncaaWeekCode(date: Date): string {
  const season = ncaaSeasonYear(date);

  const septemberFirst = new Date(Date.UTC(season, 8, 1));
  const daysToMonday = (8 - septemberFirst.getUTCDay()) % 7;
  const laborDayMs = Date.UTC(season, 8, 1 + daysToMonday);
  const week1ThursdayMs = laborDayMs - 4 * DAY_MS;

  const targetMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  if (targetMs < week1ThursdayMs) return "P";

  const week =
    Math.floor((targetMs - week1ThursdayMs) / (7 * DAY_MS)) + 1;

  return String(Math.max(1, week)).padStart(2, "0");
}

export function ncaaScoreboardUrl(
  date: Date,
  division: Division,
): string {
  const season = ncaaSeasonYear(date);
  const week = ncaaWeekCode(date);
  const level = division === "fcs" ? "fcs" : "fbs";

  return `https://www.ncaa.com/scoreboard/football/${level}/${season}/${week}/all-conf`;
}

export async function discoverNcaaDaySlate(
  date: Date,
  division: Division,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveredGame[]> {
  const url = ncaaScoreboardUrl(date, division);

  const cached = ncaaSlateCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.games;
  }

  const response = await fetchImpl(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (compatible; NGF-SportsFacts/1.0; +https://coogsnation.com)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    const games: DiscoveredGame[] = [];
    ncaaSlateCache.set(url, {
      expiresAt: Date.now() + NCAA_SLATE_CACHE_MS,
      games,
    });
    return games;
  }

  if (!response.ok) {
    throw new Error(
      `NCAA ${division} scoreboard HTTP ${response.status} (${url})`,
    );
  }

  const games = discoverGamesFromPublicPage(
    await response.text(),
    division,
    date.toISOString(),
  );

  ncaaSlateCache.set(url, {
    expiresAt: Date.now() + NCAA_SLATE_CACHE_MS,
    games,
  });

  return games;
}

export function phaseForDiscovery(_game: DiscoveredGame): GamePhase { return "scheduled"; }
