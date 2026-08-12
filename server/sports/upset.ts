import type { ReconciledGame, TeamRef, UpsetAlert, UpsetSeverity } from "../../shared/ngfSportsTypes";

function severityFor(rank: number): UpsetSeverity {
  if (rank === 1) return "number1";
  if (rank <= 5) return "top5";
  if (rank <= 10) return "top10";
  return "top25";
}

function alertTiming(severity: UpsetSeverity): Pick<UpsetAlert, "holdMs" | "flashCount"> {
  switch (severity) {
    case "number1": return { holdMs: 6500, flashCount: 4 };
    case "top5": return { holdMs: 5500, flashCount: 3 };
    case "top10": return { holdMs: 5000, flashCount: 3 };
    default: return { holdMs: 4200, flashCount: 2 };
  }
}

function rankOf(team: TeamRef): number | null {
  return typeof team.rank === "number" && team.rank > 0 ? team.rank : null;
}

export function detectUpset(game: ReconciledGame): UpsetAlert | null {
  if (game.phase !== "final") return null;
  if (game.awayScore == null || game.homeScore == null || game.awayScore === game.homeScore) return null;

  const awayWon = game.awayScore > game.homeScore;
  const winner = awayWon ? game.game.away : game.game.home;
  const loser = awayWon ? game.game.home : game.game.away;
  const winnerScore = awayWon ? game.awayScore : game.homeScore;
  const loserScore = awayWon ? game.homeScore : game.awayScore;
  const loserRank = rankOf(loser);
  const winnerRank = rankOf(winner);

  if (loserRank == null || loserRank > 25) return null;
  if (winnerRank != null && winnerRank < loserRank) return null;

  const severity = severityFor(loserRank);
  return {
    gameId: game.game.ngfGameId,
    winner,
    loser,
    winnerScore,
    loserScore,
    severity,
    ...alertTiming(severity),
  };
}
