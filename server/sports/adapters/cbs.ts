import type { GamePhase, GameRef, ScoreObservation, TeamRef } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";
import { htmlToText } from "./publicScoreboard";

const CBS_TEAM_CODE_ALIASES: Record<string, string> = {
  HAW: "HAWAII",
  STAN: "STNFRD",
  NDSU: "NDST",
  MEM: "MEMP",
  NMSU: "NMEXST",
  EMU: "EMICH",
  SJSU: "SJST",
};

function cbsTeamCode(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CBS_TEAM_CODE_ALIASES[normalized] ?? normalized;
}

export function buildCbsGameId(game: GameRef): string {
  const date = new Date(game.scheduledStart);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const prefix = game.sport === "basketball" ? "NCAAB" : "NCAAF";
  return `${prefix}_${y}${m}${d}_${cbsTeamCode(game.away.abbreviation)}@${cbsTeamCode(game.home.abbreviation)}`;
}

function buildCbsGameUrl(game: GameRef): string {
  const sportPath = game.sport === "basketball" ? "college-basketball" : "college-football";
  return `https://hubapi.cbssports.com/${sportPath}/gametracker/recap/${encodeURIComponent(buildCbsGameId(game))}/`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreboardTeamIndex(text: string, team: TeamRef): number {
  const needles = [team.name, team.abbreviation]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const needle of needles) {
    const regex = new RegExp(escapeRegex(needle), "ig");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      const after = text.slice(match.index, match.index + 180);
      if (/\b\d{1,2}-\d{1,2}\b/.test(after)) return match.index;
    }
  }
  return -1;
}

function standaloneNumbers(value: string): number[] {
  const result: number[] = [];
  const regex = /\b\d{1,3}\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value))) {
    const before = value[match.index - 1] ?? "";
    const after = value[match.index + match[0].length] ?? "";
    if (before === "-" || after === "-" || before === ":" || after === ":") continue;
    result.push(Number(match[0]));
  }
  return result;
}

function phaseFromCbs(text: string): GamePhase {
  const upper = text.toUpperCase();
  if (/\bFINAL\b/.test(upper)) return "final";
  if (/\bHALF(?:TIME)?\b/.test(upper)) return "halftime";
  if (/\bPOSTPONED\b|\bPPD\b/.test(upper)) return "postponed";
  if (/\bCANCEL(?:LED|ED)\b/.test(upper)) return "cancelled";
  if (/\b(?:1ST|2ND|3RD|4TH|OT|1H|2H)\b/.test(upper) || /\b\d{1,2}:\d{2}\b/.test(upper)) return "live";
  return "scheduled";
}

function periodFromCbs(text: string): number | null {
  const match = text.match(/\b([1-4])(?:ST|ND|RD|TH)\b/i) || text.match(/\b([12])H\b/i);
  return match ? Number(match[1]) : null;
}

function clockFromCbs(text: string): string | null {
  return text.match(/\b(\d{1,2}:\d{2})\b/)?.[1] ?? null;
}

export function parseCbsGametrackerBody(
  sourceId: string,
  body: string,
  game: GameRef,
  observedAt = new Date(),
): ScoreObservation | null {
  const text = htmlToText(body);
  const awayIndex = scoreboardTeamIndex(text, game.away);
  const homeIndex = scoreboardTeamIndex(text, game.home);
  if (awayIndex < 0 || homeIndex < 0 || awayIndex >= homeIndex) return null;

  const awayBlock = text.slice(awayIndex, Math.min(homeIndex, awayIndex + 420));
  const record = awayBlock.match(/\b\d{1,2}-\d{1,2}\b/);
  if (!record || record.index == null) return null;

  const afterAwayRecord = awayBlock.slice(record.index + record[0].length);
  const awayNumbers = standaloneNumbers(afterAwayRecord);
  const beforeHome = text.slice(Math.max(awayIndex, homeIndex - 160), homeIndex);
  const homeNumbers = standaloneNumbers(beforeHome);

  const awayScore = awayNumbers[0] ?? null;
  const homeScore = homeNumbers.at(-1) ?? null;
  const statusWindow = text.slice(awayIndex, Math.min(text.length, homeIndex + 100));
  const phase = phaseFromCbs(statusWindow);

  return {
    sourceId,
    sourceLineage: "cbs",
    observedAt: observedAt.toISOString(),
    game,
    awayScore,
    homeScore,
    phase,
    period: periodFromCbs(statusWindow),
    clock: phase === "final" ? null : clockFromCbs(statusWindow),
    statusText: phase === "final" ? "Final" : statusWindow.slice(0, 120),
  };
}

class CbsScoreboardAdapter implements SportsSourceAdapter {
  readonly lineageId = "cbs";

  constructor(
    public readonly sourceId: string,
    public readonly label: string,
    private readonly sport: "football" | "basketball",
    private readonly fetchImpl: typeof fetch,
  ) {}

  canHandle(game: GameRef): boolean {
    return game.sport === this.sport;
  }

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;
    const response = await this.fetchImpl(buildCbsGameUrl(game), {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`${this.label} HTTP ${response.status}`);
    return parseCbsGametrackerBody(this.sourceId, await response.text(), game);
  }
}

export function createCbsFootballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new CbsScoreboardAdapter(
    "cbs-football-public",
    "CBS Sports college football game tracker",
    "football",
    fetchImpl,
  );
}

export function createCbsBasketballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new CbsScoreboardAdapter(
    "cbs-basketball-public",
    "CBS Sports men's college basketball game tracker",
    "basketball",
    fetchImpl,
  );
}
