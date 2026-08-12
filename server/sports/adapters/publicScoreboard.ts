import type { GamePhase, GameRef, ScoreObservation, TeamRef } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";

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
  if (/\bFINAL\b|\bF\/OT\b|\bFINAL\/OT\b/.test(upper)) return "final";
  if (/\bHALF(?:TIME)?\b/.test(upper)) return "halftime";
  if (/\bPOSTPONED\b|\bPPD\b/.test(upper)) return "postponed";
  if (/\bCANCEL(?:LED|ED)\b/.test(upper)) return "cancelled";
  if (/\b(?:1ST|2ND|3RD|4TH|OT|Q1|Q2|Q3|Q4)\b/.test(upper) || /\b\d{1,2}:\d{2}\b/.test(upper)) return "live";
  return "scheduled";
}

function periodFromText(text: string): number | null {
  const q = text.match(/\bQ([1-4])\b/i) || text.match(/\b([1-4])(?:ST|ND|RD|TH)\b/i);
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

function teamRefFromGame(game: GameRef, home: boolean): TeamRef {
  return home ? game.home : game.away;
}

/**
 * Generic public-page adapter. It intentionally parses factual text only and
 * does not copy article prose or visual presentation. The parser is tolerant
 * enough for NCAA/conference scoreboard pages and is isolated so a source
 * redesign affects one adapter, not the NGF core.
 */
export class PublicScoreboardAdapter implements SportsSourceAdapter {
  constructor(
    public readonly sourceId: string,
    public readonly label: string,
    private readonly urlForGame: (game: GameRef) => string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
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

  // Never invent a live/final score. If no numeric pair is present, return a
  // schedule/status observation only.
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

export function buildNcaafScoreboardUrl(game: GameRef): string {
  const date = new Date(game.scheduledStart);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const division = game.away.division === "fcs" && game.home.division === "fcs" ? "fcs" : "fbs";
  return `https://www.ncaa.com/scoreboard/football/${division}/${yyyy}/${mm}/${dd}/all-conf`;
}
