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

    // KISS publication rule:
    // live/halftime/final scores need three independent upstream lineages.
    // Massey is the preferred primary candidate, with two corroborators.
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

    this.current.set(observation.game.ngfGameId, reconciled);

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

  snapshot(now = new Date()): TickerSnapshot {
    const games = sortTicker(
      [...this.current.values()].map((game) =>
        toTickerItem(game, this.focusTeamId),
      ),
    );

    return {
      generatedAt: now.toISOString(),
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
