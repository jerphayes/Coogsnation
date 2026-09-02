import type { ReconciledGame, UpsetSeverity } from "../../shared/ngfSportsTypes";
import { detectUpset } from "./upset";

export interface TickerItem {
  gameId: string;
  awayLabel: string;
  awayScore: number | null;
  homeLabel: string;
  homeScore: number | null;
  status: string;
  priority: number;
  accentKey: string;
  upsetSeverity?: UpsetSeverity | null;
}

function defaultPeriodLabel(
  game: ReconciledGame,
): string {

  if (game.periodLabel) {
    return game.periodLabel;
  }

  const period =
    game.period;

  if (!period) {
    return (
      game.stateDetail ||
      game.statusText ||
      "LIVE"
    );
  }

  switch (game.game.sport) {
    case "football":
      return `Q${period}`;

    case "basketball":
      if (
        game.game.competitionGender === "women"
      ) {
        return `Q${period}`;
      }

      return period <= 2
        ? `${period}H`
        : `OT${period - 2}`;

    case "baseball":
    case "softball":
      return (
        game.stateDetail ||
        `INN ${period}`
      );

    case "hockey":
      return period <= 3
        ? `P${period}`
        : "OT";

    case "volleyball":
      return `SET ${period}`;

    default:
      return (
        game.stateDetail ||
        `P${period}`
      );
  }
}

function statusFor(
  game: ReconciledGame,
): string {

  if (game.phase === "final") {
    return "FINAL";
  }

  if (game.phase === "halftime") {
    return "HALF";
  }

  if (game.phase === "postponed") {
    return "PPD";
  }

  if (game.phase === "cancelled") {
    return "CANCELLED";
  }

  if (
    game.phase === "scheduled" ||
    game.phase === "pregame"
  ) {
    return (
      game.statusText ||
      "UPCOMING"
    );
  }

  const label =
    defaultPeriodLabel(game);

  return game.clock
    ? `${label} ${game.clock}`
    : label;
}

function rankedLabel(rank: number | null | undefined, abbreviation: string): string {
  return rank && rank > 0 ? `#${rank} ${abbreviation}` : abbreviation;
}

export function toTickerItem(game: ReconciledGame, focusTeamId?: string): TickerItem {
  const upset = detectUpset(game);
  let priority = 10;
  if (game.phase === "live" || game.phase === "halftime") priority += 30;
  if (game.phase === "final") priority += 5;
  if (game.game.away.rank || game.game.home.rank) priority += 10;
  if (upset) priority += 25;
  if (focusTeamId && [game.game.away.ngfTeamId, game.game.home.ngfTeamId].includes(focusTeamId)) priority += 100;

  return {
    gameId: game.game.ngfGameId,
    awayLabel: rankedLabel(game.game.away.rank, game.game.away.abbreviation),
    awayScore: game.awayScore,
    homeLabel: rankedLabel(game.game.home.rank, game.game.home.abbreviation),
    homeScore: game.homeScore,
    status: statusFor(game),
    priority,
    accentKey: game.game.away.ngfTeamId,
    upsetSeverity: upset?.severity ?? null,
  };
}

export function sortTicker(items: TickerItem[]): TickerItem[] {
  return [...items].sort((a, b) => b.priority - a.priority || a.gameId.localeCompare(b.gameId));
}
