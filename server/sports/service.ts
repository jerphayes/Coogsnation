import { pool } from "../db";
import { ScheduleDrivenCollector } from "./collector";
import { discoverNcaaDaySlate } from "./discovery";
import { sportsFactsEngine } from "./engine";
import { createDefaultSportsSources } from "./sourceCatalog";
import { SportsStore } from "./store";
import type { GameRef } from "../../shared/ngfSportsTypes";

const DAY = 86_400_000;

export class SportsFactsService {
  private readonly store = new SportsStore(pool);

  private readonly collector = new ScheduleDrivenCollector(
    createDefaultSportsSources(),
    {
      onObservation: (observation) =>
        this.store.recordObservation(observation),

      onCurrent: (current) =>
        current ? this.store.saveCurrent(current) : undefined,

      onSourceHealth: (health) =>
        this.store.upsertSource({
          ...health,
          sourceType: "public-web",
        }),
    },
  );

  private refreshTimer?: ReturnType<typeof setInterval>;
  private started = false;

  async start() {
    if (
      this.started ||
      process.env.SPORTS_FACTS_ENABLED === "false"
    ) {
      return;
    }

    this.started = true;

    await this.refreshSchedule().catch((error) =>
      console.error("[SPORTS] Initial schedule refresh failed", error),
    );

    this.refreshTimer = setInterval(
      () =>
        this.refreshSchedule().catch((error) =>
          console.error("[SPORTS] Schedule refresh failed", error),
        ),
      30 * 60_000,
    );

    if (
      typeof this.refreshTimer === "object" &&
      this.refreshTimer &&
      "unref" in this.refreshTimer
    ) {
      (this.refreshTimer as { unref: () => void }).unref();
    }
  }

  stop() {
    this.collector.stopAll();

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = undefined;
    this.started = false;
  }

  async refreshSchedule(now = new Date()) {
    const discovered = new Map<string, GameRef>();

    /*
     * Always-on ticker:
     * Search progressively farther ahead until the next real NCAA football
     * slate is found. Weekly NCAA URLs mean a seven-day step avoids hammering
     * the same scoreboard repeatedly.
     */
    for (let dayOffset = 0; dayOffset <= 35; dayOffset += 7) {
      const date = new Date(now.getTime() + dayOffset * DAY);
      let gamesFoundThisWeek = 0;

      for (const division of ["fbs", "fcs"] as const) {
        try {
          const games = await discoverNcaaDaySlate(date, division);

          for (const game of games) {
            discovered.set(game.ngfGameId, game);
            await this.store.upsertGame(game);
            this.collector.watch(game);
          }

          gamesFoundThisWeek += games.length;
        } catch (error) {
          console.warn(
            `[SPORTS] NCAA ${division} slate discovery failed for ${date
              .toISOString()
              .slice(0, 10)}`,
            error,
          );
        }
      }

      /*
       * Stop at the first week containing games.
       * Those become the permanent PRE/0-0 ticker slate.
       */
      if (gamesFoundThisWeek > 0) {
        break;
      }
    }

    /*
     * If discovery found a slate, publish it immediately to the ticker.
     * Scheduled games show 0-0 until the live collector replaces them.
     */
    if (discovered.size > 0) {
      sportsFactsEngine.setScheduledSlate([...discovered.values()], now);
    } else {
      /*
       * Fall back to the persistent database. This keeps the ticker alive
       * across collector hiccups and process restarts.
       */
      const storedGames = await this.store.loadUpcoming(72, 24 * 21);

      if (storedGames.length > 0) {
        sportsFactsEngine.setScheduledSlate(storedGames, now);
      }
    }

    /*
     * Only actively poll games near their play window.
     * The ticker can display future games without unnecessarily polling them.
     */
    const activeGames = await this.store.loadUpcoming(4, 28);

    for (const game of activeGames) {
      this.collector.watch(game);
    }
  }
}

export const sportsFactsService = new SportsFactsService();
