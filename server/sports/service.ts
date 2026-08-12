import { pool } from "../db";
import { ScheduleDrivenCollector } from "./collector";
import { discoverNcaaDaySlate } from "./discovery";
import { createDefaultSportsSources } from "./sourceCatalog";
import { SportsStore } from "./store";

const DAY = 86_400_000;

export class SportsFactsService {
  private readonly store = new SportsStore(pool);
  private readonly collector = new ScheduleDrivenCollector(createDefaultSportsSources(), {
    onObservation: (observation) => this.store.recordObservation(observation),
    onCurrent: (current) => current ? this.store.saveCurrent(current) : undefined,
    onSourceHealth: (health) => this.store.upsertSource({ ...health, sourceType: "public-web" }),
  });
  private refreshTimer?: ReturnType<typeof setInterval>;
  private started = false;

  async start() {
    if (this.started || process.env.SPORTS_FACTS_ENABLED === "false") return;
    this.started = true;
    await this.refreshSchedule().catch((error) => console.error("[SPORTS] Initial schedule refresh failed", error));
    this.refreshTimer = setInterval(() => this.refreshSchedule().catch((error) => console.error("[SPORTS] Schedule refresh failed", error)), 30 * 60_000);
    if (typeof this.refreshTimer === "object" && this.refreshTimer && "unref" in this.refreshTimer) (this.refreshTimer as { unref: () => void }).unref();
  }

  stop() {
    this.collector.stopAll();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    this.started = false;
  }

  async refreshSchedule(now = new Date()) {
    // Rolling 48-hour discovery is intentionally tiny: 4 NCAA scoreboard page
    // requests (FBS/FCS today + tomorrow), then per-game polling only when the
    // scheduler says the game is near/live. This is the anti-hammering design.
    const dates = [new Date(now.getTime()), new Date(now.getTime() + DAY)];
    for (const date of dates) {
      for (const division of ["fbs", "fcs"] as const) {
        try {
          const games = await discoverNcaaDaySlate(date, division);
          for (const game of games) {
            await this.store.upsertGame(game);
            this.collector.watch(game);
          }
        } catch (error) {
          console.warn(`[SPORTS] NCAA ${division} slate discovery failed for ${date.toISOString().slice(0, 10)}`, error);
        }
      }
    }

    // Database is the canonical schedule registry. Load only games in the
    // active window and let ScheduleDrivenCollector decide exact polling rate.
    const games = await this.store.loadUpcoming(4, 28);
    for (const game of games) this.collector.watch(game);
  }
}

export const sportsFactsService = new SportsFactsService();
