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
    let finalConfirmations = 0;
    let acceptedFinal: { away: number | null; home: number | null } | null = null;

    for (let index = 0; index < results.length; index++) {
      const adapter = this.adapters[index];
      const result = results[index];
      if (result.status !== "fulfilled" || !result.value) {
        await this.markFailure(adapter);
        continue;
      }
      await this.markSuccess(adapter);
      await this.hooks.onObservation?.(result.value);
      const current = sportsFactsEngine.ingest(result.value);
      if (current) await this.hooks.onCurrent?.(current);
      watch.phase = result.value.phase;
      if (result.value.phase === "final") {
        if (!acceptedFinal) acceptedFinal = { away: result.value.awayScore, home: result.value.homeScore };
        if (acceptedFinal.away === result.value.awayScore && acceptedFinal.home === result.value.homeScore) finalConfirmations += 1;
      }
    }

    watch.finalVerified = finalConfirmations >= 2;
    if (watch.phase === "final" && watch.finalVerified) {
      this.stop(watch.game.ngfGameId);
      return;
    }
    this.schedule(watch);
  }
}
