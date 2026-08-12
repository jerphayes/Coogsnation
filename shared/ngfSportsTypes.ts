export type Sport = "football" | "basketball" | "baseball";
export type Division = "fbs" | "fcs" | "d1";
export type GamePhase = "scheduled" | "pregame" | "live" | "halftime" | "final" | "postponed" | "cancelled";

export interface TeamRef {
  ngfTeamId: string;
  name: string;
  abbreviation: string;
  conference?: string;
  division: Division;
  rank?: number | null;
}

export interface GameRef {
  ngfGameId: string;
  sport: Sport;
  season: number;
  scheduledStart: string;
  away: TeamRef;
  home: TeamRef;
}

export interface ScoreObservation {
  sourceId: string;
  observedAt: string;
  game: GameRef;
  awayScore: number | null;
  homeScore: number | null;
  phase: GamePhase;
  period?: number | null;
  clock?: string | null;
  statusText?: string | null;
}

export interface SourceHealth {
  sourceId: string;
  reliability: number;
  lastSuccessAt?: string;
  consecutiveErrors?: number;
}

export interface ReconciledGame {
  game: GameRef;
  awayScore: number | null;
  homeScore: number | null;
  phase: GamePhase;
  period?: number | null;
  clock?: string | null;
  statusText?: string | null;
  acceptedAt: string;
  confidence: number;
  agreeingSources: string[];
  conflictingSources: string[];
}

export type UpsetSeverity = "top25" | "top10" | "top5" | "number1";

export interface UpsetAlert {
  gameId: string;
  winner: TeamRef;
  loser: TeamRef;
  winnerScore: number;
  loserScore: number;
  severity: UpsetSeverity;
  holdMs: number;
  flashCount: number;
}
