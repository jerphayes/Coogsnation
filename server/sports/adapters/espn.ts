import type { GamePhase, GameRef, ScoreObservation, TeamRef } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";

type Recordish = Record<string, any>;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamMatches(candidate: Recordish, team: TeamRef): boolean {
  const data = candidate?.team ?? candidate ?? {};
  const blob = normalize([data.displayName, data.shortDisplayName, data.name, data.abbreviation].filter(Boolean).join(" "));
  return [team.name, team.abbreviation].map(normalize).filter(Boolean).some((needle) => blob.includes(needle));
}

function phaseFromStatus(status: Recordish): GamePhase {
  const state = String(status?.type?.state ?? status?.type?.name ?? status?.type?.description ?? "").toLowerCase();
  if (status?.type?.completed === true || state.includes("post")) return "final";
  if (state.includes("in") || state.includes("progress")) {
    const detail = String(status?.type?.detail ?? status?.type?.shortDetail ?? "").toLowerCase();
    if (detail.includes("half")) return "halftime";
    return "live";
  }
  return "scheduled";
}

function dateParam(game: GameRef): string {
  const date = new Date(game.scheduledStart);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function endpoint(game: GameRef): string {
  const league = game.sport === "basketball" ? "mens-college-basketball" : "college-football";
  const sport = game.sport === "basketball" ? "basketball" : "football";
  return `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${dateParam(game)}`;
}

class EspnScoreboardAdapter implements SportsSourceAdapter {
  readonly lineageId = "espn";

  constructor(
    public readonly sourceId: string,
    public readonly label: string,
    private readonly sport: "football" | "basketball",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  canHandle(game: GameRef): boolean {
    return game.sport === this.sport;
  }

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;
    const response = await this.fetchImpl(endpoint(game), {
      headers: {
        accept: "application/json",
        "user-agent": "NGF-SportsFacts/1.0 (+public factual scoreboard collector)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`${this.label} HTTP ${response.status}`);
    const payload = await response.json() as Recordish;

    for (const event of payload.events ?? []) {
      const competition = event?.competitions?.[0];
      const competitors: Recordish[] = competition?.competitors ?? [];
      const away = competitors.find((item) => item.homeAway === "away");
      const home = competitors.find((item) => item.homeAway === "home");
      if (!away || !home || !teamMatches(away, game.away) || !teamMatches(home, game.home)) continue;

      return {
        sourceId: this.sourceId,
        sourceLineage: this.lineageId,
        observedAt: new Date().toISOString(),
        game,
        awayScore: Number.isFinite(Number(away.score)) ? Number(away.score) : null,
        homeScore: Number.isFinite(Number(home.score)) ? Number(home.score) : null,
        phase: phaseFromStatus(event.status ?? competition?.status ?? {}),
        period: Number(event.status?.period ?? competition?.status?.period) || null,
        clock: event.status?.displayClock ?? competition?.status?.displayClock ?? null,
        statusText: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? null,
      };
    }
    return null;
  }
}

export function createEspnFootballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new EspnScoreboardAdapter("espn-football-public", "ESPN public college football scoreboard", "football", fetchImpl);
}

export function createEspnBasketballScoreboardAdapter(fetchImpl: typeof fetch = fetch) {
  return new EspnScoreboardAdapter("espn-basketball-public", "ESPN public men's college basketball scoreboard", "basketball", fetchImpl);
}
