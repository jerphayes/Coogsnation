import type { GamePhase } from "../../shared/ngfSportsTypes";

export interface PollDecision {
  poll: boolean;
  intervalMs: number | null;
  reason: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function nextPollDecision(params: {
  scheduledStart: string;
  phase: GamePhase;
  now?: Date;
  finalVerified?: boolean;
}): PollDecision {
  const now = params.now ?? new Date();
  const kickoff = new Date(params.scheduledStart);
  const untilKickoff = kickoff.getTime() - now.getTime();

  if (params.phase === "cancelled") return { poll: false, intervalMs: null, reason: "cancelled" };
  if (params.phase === "final" && params.finalVerified) return { poll: false, intervalMs: null, reason: "final verified" };
  if (params.phase === "final") return { poll: true, intervalMs: 60_000, reason: "verify final against a second source" };
  if (params.phase === "postponed") return { poll: true, intervalMs: 30 * MINUTE, reason: "watch for reschedule" };
  if (params.phase === "live" || params.phase === "halftime") return { poll: true, intervalMs: 20_000, reason: "game active" };

  if (untilKickoff > 24 * HOUR) return { poll: true, intervalMs: 6 * HOUR, reason: "schedule maintenance" };
  if (untilKickoff > HOUR) return { poll: true, intervalMs: 15 * MINUTE, reason: "game day verification" };
  if (untilKickoff > 0) return { poll: true, intervalMs: 2 * MINUTE, reason: "pregame watch" };
  if (untilKickoff > -4 * HOUR) return { poll: true, intervalMs: 20_000, reason: "kickoff window" };

  return { poll: true, intervalMs: 10 * MINUTE, reason: "status unresolved after expected game window" };
}
