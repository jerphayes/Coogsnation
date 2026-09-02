export type Sport =
  | "football"
  | "basketball"
  | "baseball"
  | "softball"
  | "soccer"
  | "hockey"
  | "volleyball"
  | "lacrosse"
  | "rugby"
  | "cricket"
  | "other";

export type CompetitionScope =
  | "varsity"
  | "club"
  | "intramural";

export type CompetitionGender =
  | "men"
  | "women"
  | "coed"
  | "open";

export type Division =
  | "fbs"
  | "fcs"
  | "d1"
  | "d2"
  | "d3";

export type GamePhase =
  | "scheduled"
  | "pregame"
  | "live"
  | "halftime"
  | "final"
  | "postponed"
  | "cancelled";

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

  /**
   * Presentation boundary.
   * Main college ticker = varsity only.
   * Intramural presentation stays separate.
   */
  competitionScope?: CompetitionScope;

  /**
   * Basketball and other sports can share one sport identity
   * while preserving men's/women's/coed presentation rules.
   */
  competitionGender?: CompetitionGender;
}

export interface ScoreObservation {
  sourceId: string;

  /** Independent upstream family. One lineage = one vote. */
  sourceLineage?: string;

  observedAt: string;
  game: GameRef;

  awayScore: number | null;
  homeScore: number | null;

  phase: GamePhase;

  /**
   * Generic period:
   * quarter / half / inning / hockey period / volleyball set.
   */
  period?: number | null;

  /**
   * Optional display override:
   * Q3 / 2H / BOT 7 / P2 / SET 4 / etc.
   */
  periodLabel?: string | null;

  clock?: string | null;

  /** Other sport-specific live state. */
  stateDetail?: string | null;

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
  periodLabel?: string | null;

  clock?: string | null;
  stateDetail?: string | null;

  statusText?: string | null;

  acceptedAt: string;
  confidence: number;

  agreeingSources: string[];
  conflictingSources: string[];

  agreeingLineages?: string[];
  conflictingLineages?: string[];
}

export type UpsetSeverity =
  | "top25"
  | "top10"
  | "top5"
  | "number1";

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
