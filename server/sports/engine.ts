import { EventEmitter } from "node:events";
import type {
  GameRef,
  ReconciledGame,
  ScoreObservation,
  SourceHealth,
  UpsetAlert,
} from "../../shared/ngfSportsTypes";
import { reconcileGame } from "./reconcile";
import { detectUpset } from "./upset";
import { sortTicker, toTickerItem, type TickerItem } from "./ticker";

export interface TickerSnapshot {
  generatedAt: string;
  games: TickerItem[];
}

const NGF_ROLLOVER_TIME_ZONE =
  "America/Chicago";

type CentralParts = {
  dateKey: string;
  hour: number;
  minute: number;
};

function centralParts(
  date: Date,
): CentralParts {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          NGF_ROLLOVER_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    );

  const parts =
    Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(
          (part) =>
            part.type !== "literal",
        )
        .map(
          (part) =>
            [part.type, part.value],
        ),
    );

  return {
    dateKey:
      `${parts.year}-${parts.month}-${parts.day}`,
    hour:
      Number(parts.hour),
    minute:
      Number(parts.minute),
  };
}

/**
 * One universal NGF clock:
 *
 * 12:01 AM America/Chicago
 * on the Central-Time calendar date
 * of the team's next scheduled game.
 */
export function gameDayRolloverHasPassed(
  game: ReconciledGame["game"],
  now = new Date(),
): boolean {

  const kickoff =
    new Date(game.scheduledStart);

  if (
    Number.isNaN(
      kickoff.getTime(),
    )
  ) {
    return false;
  }

  const gameCentral =
    centralParts(kickoff);

  const nowCentral =
    centralParts(now);

  if (
    nowCentral.dateKey >
    gameCentral.dateKey
  ) {
    return true;
  }

  if (
    nowCentral.dateKey <
    gameCentral.dateKey
  ) {
    return false;
  }

  return (
    nowCentral.hour > 0 ||
    nowCentral.minute >= 1
  );
}

function parseCountdownClock(
  value: string | null | undefined,
): number | null {
  if (!value) return null;

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})$/,
    );

  if (!match) return null;

  return (
    Number(match[1]) * 60 +
    Number(match[2])
  );
}

function liveStateRegresses(
  previous: ReconciledGame,
  next: ReconciledGame,
): boolean {

  if (
    previous.phase === "final" &&
    next.phase !== "final"
  ) {
    return true;
  }

  if (
    previous.period != null &&
    next.period != null &&
    next.period <
      previous.period
  ) {
    return true;
  }

  const countdownSport =
    previous.game.sport === "football" ||
    previous.game.sport === "basketball" ||
    previous.game.sport === "hockey";

  if (
    countdownSport &&
    previous.period != null &&
    next.period === previous.period
  ) {
    const oldSeconds =
      parseCountdownClock(
        previous.clock,
      );

    const newSeconds =
      parseCountdownClock(
        next.clock,
      );

    if (
      oldSeconds != null &&
      newSeconds != null &&
      newSeconds >
        oldSeconds
    ) {
      return true;
    }
  }

  return false;
}

export class SportsFactsEngine extends EventEmitter {
  private readonly observations = new Map<string, Map<string, ScoreObservation>>();
  private readonly current = new Map<string, ReconciledGame>();
  private readonly health = new Map<string, SourceHealth>();
  private readonly emittedFinalUpsets = new Set<string>();
  private focusTeamId = "hou";

  setFocusTeam(teamId: string) {
    this.focusTeamId = teamId;
  }

  setSourceHealth(health: SourceHealth) {
    this.health.set(health.sourceId, health);
  }

  setScheduledSlate(games: GameRef[], now = new Date()) {
    const incoming = new Set(games.map((game) => game.ngfGameId));

    for (const [gameId, current] of this.current.entries()) {
      if (
        (current.phase === "scheduled" || current.phase === "pregame") &&
        !incoming.has(gameId)
      ) {
        this.current.delete(gameId);
      }
    }

    for (const game of games) {
      const existing = this.current.get(game.ngfGameId);

      if (
        existing &&
        existing.phase !== "scheduled" &&
        existing.phase !== "pregame"
      ) {
        continue;
      }

      const kickoff = new Date(game.scheduledStart);

      const statusText = Number.isNaN(kickoff.getTime())
        ? "UPCOMING"
        : kickoff
            .toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Chicago",
              timeZoneName: "short",
            })
            .toUpperCase();

      this.current.set(game.ngfGameId, {
        game,
        awayScore: 0,
        homeScore: 0,
        phase: "scheduled",
        statusText,
        acceptedAt: now.toISOString(),
        confidence: 1,
        agreeingSources: ["schedule"],
        conflictingSources: [],
      });
    }

    this.emit("ticker:update", this.snapshot(now));
  }

  ingest(observation: ScoreObservation, now = new Date()): ReconciledGame | null {
    const perGame =
      this.observations.get(observation.game.ngfGameId) ??
      new Map<string, ScoreObservation>();

    perGame.set(observation.sourceId, observation);
    this.observations.set(observation.game.ngfGameId, perGame);

    const reconciled = reconcileGame(
      [...perGame.values()],
      [...this.health.values()],
      now,
    );

    if (!reconciled) return null;

    const previous = this.current.get(observation.game.ngfGameId);

    // Publication rule:
    // live/halftime/final scores need three independent upstream lineages.
    const agreeingLineageCount =
      reconciled.agreeingLineages?.length ?? reconciled.agreeingSources.length;

    const requiresVerifiedScore =
      reconciled.phase === "live" ||
      reconciled.phase === "halftime" ||
      reconciled.phase === "final";

    if (requiresVerifiedScore && agreeingLineageCount < 3) {
      // Hold the existing canonical state in memory, but return null so
      // callers do not persist an unaccepted/scheduled state over a
      // previously verified score.
      return null;
    }

    if (
      previous &&
      liveStateRegresses(
        previous,
        reconciled,
      )
    ) {
      return null;
    }

    this.current.set(
      observation.game.ngfGameId,
      reconciled,
    );

    const materiallyChanged =
      !previous ||
      previous.awayScore !== reconciled.awayScore ||
      previous.homeScore !== reconciled.homeScore ||
      previous.phase !== reconciled.phase ||
      previous.period !== reconciled.period ||
      previous.clock !== reconciled.clock;

    if (materiallyChanged) {
      this.emit("ticker:update", this.snapshot(now));
    }

    if (
      reconciled.phase === "final" &&
      !this.emittedFinalUpsets.has(reconciled.game.ngfGameId)
    ) {
      const upset = detectUpset(reconciled);

      if (upset && reconciled.agreeingSources.length >= 2) {
        this.emittedFinalUpsets.add(reconciled.game.ngfGameId);
        this.emit("upset:alert", upset);
      }
    }

    return reconciled;
  }

  restoreCurrent(games: ReconciledGame[]) {
    for (const game of games) {
      this.current.set(game.game.ngfGameId, game);
    }

    if (games.length > 0) {
      this.emit("ticker:update", this.snapshot());
    }
  }

  getGame(gameId: string): ReconciledGame | null {
    return this.current.get(gameId) ?? null;
  }

  private rollingTickerCurrent(
    now = new Date(),
  ): ReconciledGame[] {

    const all =
      [...this.current.values()];

    const gameTime = (
      game: ReconciledGame,
    ): number => {
      const value =
        new Date(
          game.game.scheduledStart,
        ).getTime();

      return Number.isFinite(value)
        ? value
        : 0;
    };

    const latestPlayedByTeam =
      new Map<string, ReconciledGame>();

    const played =
      all
        .filter(
          (game) =>
            game.phase === "live" ||
            game.phase === "halftime" ||
            game.phase === "final",
        )
        .sort(
          (a, b) =>
            gameTime(a) -
            gameTime(b),
        );

    for (const game of played) {
      for (const teamId of [
        game.game.away.ngfTeamId,
        game.game.home.ngfTeamId,
      ]) {
        latestPlayedByTeam.set(
          teamId,
          game,
        );
      }
    }

    const selectedByTeam =
      new Map(
        latestPlayedByTeam,
      );

    const scheduled =
      all
        .filter(
          (game) =>
            game.phase === "scheduled" ||
            game.phase === "pregame",
        )
        .sort(
          (a, b) =>
            gameTime(a) -
            gameTime(b),
        );

    for (const game of scheduled) {
      const awayId =
        game.game.away.ngfTeamId;

      const homeId =
        game.game.home.ngfTeamId;

      const awayPlayed =
        latestPlayedByTeam.get(
          awayId,
        );

      const homePlayed =
        latestPlayedByTeam.get(
          homeId,
        );

      const rolloverPassed =
        gameDayRolloverHasPassed(
          game.game,
          now,
        );

      /*
       * Both teams roll together.
       *
       * Before rollover:
       * - if either team has a previous result,
       *   keep that previous result.
       *
       * Season opener:
       * - if neither has a prior game,
       *   showing the upcoming game prevents an empty ticker.
       */
      if (
        !rolloverPassed &&
        (awayPlayed || homePlayed)
      ) {
        continue;
      }

      /*
       * Earliest eligible next matchup wins.
       * Do not let a later future game replace it.
       */
      const awaySelected =
        selectedByTeam.get(
          awayId,
        );

      const homeSelected =
        selectedByTeam.get(
          homeId,
        );

      const awayCanReplace =
        !awaySelected ||
        (
          rolloverPassed &&
          gameTime(game) >
            gameTime(awaySelected)
        ) ||
        (
          !awayPlayed &&
          gameTime(game) <
            gameTime(awaySelected)
        );

      const homeCanReplace =
        !homeSelected ||
        (
          rolloverPassed &&
          gameTime(game) >
            gameTime(homeSelected)
        ) ||
        (
          !homePlayed &&
          gameTime(game) <
            gameTime(homeSelected)
        );

      if (
        rolloverPassed ||
        (
          !awayPlayed &&
          !homePlayed
        )
      ) {
        if (awayCanReplace) {
          selectedByTeam.set(
            awayId,
            game,
          );
        }

        if (homeCanReplace) {
          selectedByTeam.set(
            homeId,
            game,
          );
        }
      }
    }

    const unique =
      new Map<string, ReconciledGame>();

    for (
      const game
      of selectedByTeam.values()
    ) {
      unique.set(
        game.game.ngfGameId,
        game,
      );
    }

    /*
     * Defensive presentation boundary:
     * varsity ticker can never surface
     * an intramural record.
     */
    return [...unique.values()]
      .filter(
        (game) =>
          (game.game.competitionScope ??
            "varsity") ===
          "varsity",
      );
  }

  snapshot(
    now = new Date(),
  ): TickerSnapshot {

    const games =
      sortTicker(
        this
          .rollingTickerCurrent(
            now,
          )
          .map(
            (game) =>
              toTickerItem(
                game,
                this.focusTeamId,
              ),
          ),
      );

    return {
      generatedAt:
        now.toISOString(),
      games,
    };
  }

  clear() {
    this.observations.clear();
    this.current.clear();
    this.emittedFinalUpsets.clear();
  }
}

export const sportsFactsEngine = new SportsFactsEngine();
export type { UpsetAlert };
