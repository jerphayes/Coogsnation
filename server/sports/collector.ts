import type { GameRef, ScoreObservation, SourceHealth } from "../../shared/ngfSportsTypes";
import { nextPollDecision } from "./scheduler";
import { sportsFactsEngine } from "./engine";

export interface SportsSourceAdapter {
  readonly sourceId: string;
  readonly label: string;
  fetchGame(game: GameRef): Promise<ScoreObservation | null>;
}

export interface CollectorHooks {
  onObservation?: (observation: ScoreObservation) => void | Promise<void>;
  onCurrent?: (game: ReturnType<typeof sportsFactsEngine.ingest>) => void | Promise<void>;
  onSourceHealth?: (health: SourceHealth & { label: string }) => void | Promise<void>;
}

export interface ScheduledGameWatch {
  game: GameRef;
  phase: ScoreObservation["phase"];
  finalVerified: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

function requiresScore(observation: ScoreObservation): boolean {
  return observation.phase === "live" || observation.phase === "halftime" || observation.phase === "final";
}

function hasCompleteScore(observation: ScoreObservation): boolean {
  return observation.awayScore != null && observation.homeScore != null;
}

export class ScheduleDrivenCollector {
  private readonly watches = new Map<string, ScheduledGameWatch>();
  private readonly health = new Map<string, SourceHealth>();

  constructor(private readonly adapters: SportsSourceAdapter[], private readonly hooks: CollectorHooks = {}) {
    for (const adapter of adapters) {
      const initial = { sourceId: adapter.sourceId, reliability: 0.85, consecutiveErrors: 0 };
      this.health.set(adapter.sourceId, initial);
      sportsFactsEngine.setSourceHealth(initial);
    }
  }

  watch(game: GameRef) {
    if (this.watches.has(game.ngfGameId)) return;
    const watch: ScheduledGameWatch = { game, phase: "scheduled", finalVerified: false };
    this.watches.set(game.ngfGameId, watch);
    this.schedule(watch, 100);
  }

  watchingCount() { return this.watches.size; }

  stop(gameId: string) {
    const watch = this.watches.get(gameId);
    if (watch?.timer) clearTimeout(watch.timer);
    this.watches.delete(gameId);
  }

  stopAll() { for (const id of [...this.watches.keys()]) this.stop(id); }

  private async markSuccess(adapter: SportsSourceAdapter) {
    const previous = this.health.get(adapter.sourceId);
    const health: SourceHealth = {
      sourceId: adapter.sourceId,
      reliability: Math.min(0.99, (previous?.reliability ?? 0.85) + 0.002),
      lastSuccessAt: new Date().toISOString(),
      consecutiveErrors: 0,
    };
    this.health.set(adapter.sourceId, health);
    sportsFactsEngine.setSourceHealth(health);
    await this.hooks.onSourceHealth?.({ ...health, label: adapter.label });
  }

  private async markFailure(adapter: SportsSourceAdapter) {
    const previous = this.health.get(adapter.sourceId);
    const errors = (previous?.consecutiveErrors ?? 0) + 1;
    const health: SourceHealth = {
      sourceId: adapter.sourceId,
      reliability: Math.max(0.45, (previous?.reliability ?? 0.85) - Math.min(0.05, errors * 0.005)),
      lastSuccessAt: previous?.lastSuccessAt,
      consecutiveErrors: errors,
    };
    this.health.set(adapter.sourceId, health);
    sportsFactsEngine.setSourceHealth(health);
    await this.hooks.onSourceHealth?.({ ...health, label: adapter.label });
  }

  private schedule(watch: ScheduledGameWatch, delayMs?: number) {
    if (watch.timer) clearTimeout(watch.timer);
    const decision = nextPollDecision({ scheduledStart: watch.game.scheduledStart, phase: watch.phase, finalVerified: watch.finalVerified });
    if (!decision.poll || decision.intervalMs == null) return;
    const timer = setTimeout(() => this.poll(watch).catch((error) => {
      console.error(`[SPORTS] Poll failed for ${watch.game.ngfGameId}`, error);
      this.schedule(watch);
    }), delayMs ?? decision.intervalMs);
    watch.timer = timer;
    if (typeof timer === "object" && timer && "unref" in timer) (timer as { unref: () => void }).unref();
  }

  private async poll(watch: ScheduledGameWatch) {
    const results = await Promise.allSettled(this.adapters.map((adapter) => adapter.fetchGame(watch.game)));
    const finalCounts = new Map<string, number>();

    for (let index = 0; index < results.length; index++) {
      const adapter = this.adapters[index];
      const result = results[index];
      if (result.status !== "fulfilled" || !result.value) {
        await this.markFailure(adapter);
        continue;
      }

      const observation = result.value;
      await this.hooks.onObservation?.(observation);

      // A page load is not a successful score collection. During live/halftime/final,
      // missing either score means the parser/data path failed and must not overwrite
      // the canonical game state with null scores.
      if (requiresScore(observation) && !hasCompleteScore(observation)) {
        await this.markFailure(adapter);
        continue;
      }

      await this.markSuccess(adapter);
      const current = sportsFactsEngine.ingest(observation);
      if (current) await this.hooks.onCurrent?.(current);

      if (observation.phase === "final" && hasCompleteScore(observation)) {
        const key = `${observation.awayScore}|${observation.homeScore}`;
        finalCounts.set(key, (finalCounts.get(key) ?? 0) + 1);
      }
    }

    watch.finalVerified = [...finalCounts.values()].some((count) => count >= 2);

    // Follow the reconciled canonical state, not whichever adapter happened to
    // be processed last. This prevents a slower source from regressing phase.
    const current = sportsFactsEngine.getGame(watch.game.ngfGameId);
    if (current) watch.phase = current.phase;

    if (watch.phase === "final" && watch.finalVerified) {
      this.stop(watch.game.ngfGameId);
      return;
    }
    this.schedule(watch);
  }
}
