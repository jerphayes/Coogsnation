import type { GamePhase, GameRef, ScoreObservation, TeamRef } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";

type JsonRecord = Record<string, unknown>;

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function htmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function phaseFromText(text: string): GamePhase {
  const upper = text.toUpperCase();
  if (/\bFINAL\b|\bF\/OT\b|\bFINAL\/OT\b|\bCOMPLETED\b/.test(upper)) return "final";
  if (/\bHALF(?:TIME)?\b/.test(upper)) return "halftime";
  if (/\bPOSTPONED\b|\bPPD\b/.test(upper)) return "postponed";
  if (/\bCANCEL(?:LED|ED)\b/.test(upper)) return "cancelled";
  if (/\b(?:IN[_ -]?PROGRESS|LIVE|1ST|2ND|3RD|4TH|1H|2H|OT|Q1|Q2|Q3|Q4)\b/.test(upper) || /\b\d{1,2}:\d{2}\b/.test(upper)) return "live";
  return "scheduled";
}

function periodFromText(text: string): number | null {
  const q = text.match(/\bQ([1-4])\b/i)
    || text.match(/\b([1-4])(?:ST|ND|RD|TH)\b/i)
    || text.match(/\b([12])H\b/i);
  return q ? Number(q[1]) : null;
}

function clockFromText(text: string): string | null {
  const match = text.match(/\b(\d{1,2}:\d{2})\b/);
  return match?.[1] ?? null;
}

function candidateScorePairs(text: string): Array<[number, number, number]> {
  const result: Array<[number, number, number]> = [];
  const regex = /\b(\d{1,3})\s*(?:[-–—]|to)\s*(\d{1,3})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) result.push([Number(match[1]), Number(match[2]), match.index]);
  return result;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function scoreNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d{1,3}$/.test(value.trim())) return Number(value);
  return null;
}

function scoreFromEntity(value: unknown): number | null {
  const direct = scoreNumber(value);
  if (direct != null) return direct;
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["score", "points", "total", "value"]) {
    const score = scoreNumber(record[key]);
    if (score != null) return score;
  }
  return null;
}

function teamMatches(value: unknown, team: TeamRef): boolean {
  if (value == null) return false;
  const blob = normalizeName(typeof value === "string" ? value : JSON.stringify(value));
  return [team.name, team.abbreviation].map(normalizeName).filter(Boolean).some((needle) => blob.includes(needle));
}

function structuredStatus(record: JsonRecord): string {
  return [record.status, record.state, record.phase, record.statusText, record.gameStatus]
    .filter((value) => value != null)
    .map((value) => typeof value === "string" ? value : JSON.stringify(value))
    .join(" ");
}

function structuredPeriod(record: JsonRecord): number | null {
  for (const key of ["period", "quarter", "currentPeriod"]) {
    const value = scoreNumber(record[key]);
    if (value != null) return value;
  }
  const status = asRecord(record.status);
  if (status) return structuredPeriod(status);
  return periodFromText(structuredStatus(record));
}

function structuredClock(record: JsonRecord): string | null {
  for (const key of ["clock", "displayClock", "timeRemaining"]) {
    if (typeof record[key] === "string") {
      const clock = clockFromText(record[key] as string);
      if (clock) return clock;
    }
  }
  const status = asRecord(record.status);
  if (status) return structuredClock(status);
  return clockFromText(structuredStatus(record));
}

function structuredPair(record: JsonRecord, game: GameRef): [number, number] | null {
  const directAway = scoreFromEntity(record.awayScore);
  const directHome = scoreFromEntity(record.homeScore);
  if (directAway != null && directHome != null) return [directAway, directHome];

  for (const [awayKey, homeKey] of [
    ["awayTeam", "homeTeam"],
    ["away", "home"],
    ["visitorTeam", "homeTeam"],
    ["visitor", "home"],
  ] as const) {
    const away = record[awayKey];
    const home = record[homeKey];
    if (!teamMatches(away, game.away) || !teamMatches(home, game.home)) continue;
    const awayScore = scoreFromEntity(away);
    const homeScore = scoreFromEntity(home);
    if (awayScore != null && homeScore != null) return [awayScore, homeScore];
  }

  const competitors = Array.isArray(record.competitors) ? record.competitors : null;
  if (competitors) {
    const away = competitors.find((item) => teamMatches(item, game.away));
    const home = competitors.find((item) => teamMatches(item, game.home));
    const awayScore = scoreFromEntity(away);
    const homeScore = scoreFromEntity(home);
    if (awayScore != null && homeScore != null) return [awayScore, homeScore];
  }
  return null;
}

function findStructuredObservation(value: unknown, game: GameRef, depth = 0): { pair: [number, number]; record: JsonRecord } | null {
  if (depth > 10 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStructuredObservation(item, game, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  const pair = structuredPair(record, game);
  if (pair) return { pair, record };
  for (const child of Object.values(record)) {
    const found = findStructuredObservation(child, game, depth + 1);
    if (found) return found;
  }
  return null;
}

function jsonPayloads(body: string): unknown[] {
  const payloads: unknown[] = [];
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { payloads.push(JSON.parse(trimmed)); } catch { /* HTML or non-JSON response */ }
  }
  const scripts = /<script[^>]*(?:type=["']application\/(?:ld\+)?json["']|id=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scripts.exec(body))) {
    try { payloads.push(JSON.parse(decodeHtml(match[1].trim()))); } catch { /* ignore malformed embedded state */ }
  }
  return payloads;
}

function parseStructuredBody(sourceId: string, body: string, game: GameRef, observedAt: Date): ScoreObservation | null {
  for (const payload of jsonPayloads(body)) {
    const found = findStructuredObservation(payload, game);
    if (!found) continue;
    const status = structuredStatus(found.record);
    let phase = phaseFromText(status);
    if (found.record.completed === true) phase = "final";
    if (found.record.inProgress === true) phase = "live";
    return {
      sourceId,
      observedAt: observedAt.toISOString(),
      game,
      awayScore: found.pair[0],
      homeScore: found.pair[1],
      phase,
      period: structuredPeriod(found.record),
      clock: structuredClock(found.record),
      statusText: status || null,
    };
  }
  return null;
}

/**
 * Generic public-page adapter. Structured JSON/app state is inspected first;
 * factual HTML text is the fallback. A source redesign stays isolated here.
 */
export class PublicScoreboardAdapter implements SportsSourceAdapter {
  constructor(
    public readonly sourceId: string,
    public readonly label: string,
    private readonly urlForGame: (game: GameRef) => string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly supportsGame: (game: GameRef) => boolean = () => true,
  ) {}

  canHandle(game: GameRef): boolean {
    return this.supportsGame(game);
  }

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;
    const response = await this.fetchImpl(this.urlForGame(game), {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "user-agent": "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`${this.label} HTTP ${response.status}`);
    const body = await response.text();
    return parsePublicScoreboardBody(this.sourceId, body, game);
  }
}

export function parsePublicScoreboardBody(sourceId: string, body: string, game: GameRef, observedAt = new Date()): ScoreObservation | null {
  const structured = parseStructuredBody(sourceId, body, game, observedAt);
  if (structured) return structured;

  const text = htmlToText(body);
  const awayNeedles = [game.away.name, game.away.abbreviation].map(normalizeName).filter(Boolean);
  const homeNeedles = [game.home.name, game.home.abbreviation].map(normalizeName).filter(Boolean);
  const normalized = normalizeName(text);
  if (!awayNeedles.some((name) => normalized.includes(name)) || !homeNeedles.some((name) => normalized.includes(name))) return null;

  const awayIdx = Math.max(...awayNeedles.map((needle) => normalized.indexOf(needle)));
  const homeIdx = Math.max(...homeNeedles.map((needle) => normalized.indexOf(needle)));
  const roughCenter = Math.max(0, Math.min(awayIdx, homeIdx));
  const textCenter = Math.floor((roughCenter / Math.max(1, normalized.length)) * text.length);
  const windowText = text.slice(Math.max(0, textCenter - 500), Math.min(text.length, textCenter + 1200));
  const phase = phaseFromText(windowText);

  let awayScore: number | null = null;
  let homeScore: number | null = null;
  const pairs = candidateScorePairs(windowText);
  if (pairs.length) {
    const pair = pairs.sort((a, b) => Math.abs(a[2] - 500) - Math.abs(b[2] - 500))[0];
    awayScore = pair[0];
    homeScore = pair[1];
  } else {
    const compact = windowText.match(/(?:^|\s)(\d{1,3})\s+(\d{1,3})(?:\s|$)/);
    if (compact && phase !== "scheduled") {
      awayScore = Number(compact[1]);
      homeScore = Number(compact[2]);
    }
  }

  return {
    sourceId,
    observedAt: observedAt.toISOString(),
    game,
    awayScore,
    homeScore,
    phase,
    period: periodFromText(windowText),
    clock: clockFromText(windowText),
    statusText: phase === "scheduled" ? windowText.slice(0, 100) : null,
  };
}

function ncaaDateParts(game: GameRef) {
  const date = new Date(game.scheduledStart);
  return {
    yyyy: date.getUTCFullYear(),
    mm: String(date.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(date.getUTCDate()).padStart(2, "0"),
  };
}

export function buildNcaafScoreboardUrl(game: GameRef): string {
  const { yyyy, mm, dd } = ncaaDateParts(game);
  const division = game.away.division === "fcs" && game.home.division === "fcs" ? "fcs" : "fbs";
  return `https://www.ncaa.com/scoreboard/football/${division}/${yyyy}/${mm}/${dd}/all-conf`;
}

export function buildNcaabScoreboardUrl(game: GameRef): string {
  const { yyyy, mm, dd } = ncaaDateParts(game);
  return `https://www.ncaa.com/scoreboard/basketball-men/d1/${yyyy}/${mm}/${dd}/all-conf`;
}
