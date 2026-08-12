import type { GameRef, ScoreObservation } from "../../shared/ngfSportsTypes";
import { sportsFactsEngine } from "./engine";

let seeded = false;
const baseTime = new Date();

function game(id: string, away: string, home: string, options: { awayRank?: number; homeRank?: number } = {}): GameRef {
  return {
    ngfGameId: id,
    sport: "football",
    season: 2026,
    scheduledStart: baseTime.toISOString(),
    away: {
      ngfTeamId: away.toLowerCase(),
      name: away,
      abbreviation: away,
      division: "fbs",
      rank: options.awayRank,
    },
    home: {
      ngfTeamId: home.toLowerCase(),
      name: home,
      abbreviation: home,
      division: "fbs",
      rank: options.homeRank,
    },
  };
}

function observation(sourceId: string, gameRef: GameRef, awayScore: number, homeScore: number, phase: ScoreObservation["phase"], period?: number, clock?: string): ScoreObservation {
  return {
    sourceId,
    observedAt: new Date().toISOString(),
    game: gameRef,
    awayScore,
    homeScore,
    phase,
    period,
    clock,
  };
}

function unrefTimer(timer: ReturnType<typeof setTimeout>) {
  if (typeof timer === "object" && timer && "unref" in timer) {
    (timer as { unref: () => void }).unref();
  }
}

export function seedSportsTickerDemo() {
  if (seeded || process.env.NODE_ENV === "production" || process.env.SPORTS_TICKER_DEMO !== "true") return;
  seeded = true;

  sportsFactsEngine.setSourceHealth({ sourceId: "demo-ncaa", reliability: 0.95 });
  sportsFactsEngine.setSourceHealth({ sourceId: "demo-conference", reliability: 0.9 });

  const games = [
    [game("demo-hou-tcu", "HOU", "TCU"), 31, 24, "live", 4, "6:18"],
    [game("demo-byu-utah", "BYU", "UTAH"), 27, 24, "final"],
    [game("demo-ttu-bay", "TTU", "BAY"), 21, 17, "live", 3, "2:04"],
    [game("demo-asu-ku", "ASU", "KU"), 14, 14, "halftime"],
    [game("demo-kst-okst", "KSU", "OKST", { awayRank: 12 }), 31, 28, "live", 4, "0:48"],
  ] as const;

  for (const [gameRef, awayScore, homeScore, phase, period, clock] of games) {
    sportsFactsEngine.ingest(observation("demo-ncaa", gameRef, awayScore, homeScore, phase, period, clock));
  }

  // Human-eye test: eight seconds after server start, inject a verified top-five
  // upset. Only the ticker reacts; no page-level flashing or takeover occurs.
  const upsetGame = game("demo-hou-tex-upset", "HOU", "TEX", { homeRank: 4 });
  const timer = setTimeout(() => {
    sportsFactsEngine.ingest(observation("demo-ncaa", upsetGame, 38, 35, "final"));
    sportsFactsEngine.ingest(observation("demo-conference", upsetGame, 38, 35, "final"));
  }, 8_000);
  unrefTimer(timer);
}
