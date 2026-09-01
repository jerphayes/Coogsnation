import type { GameRef, ScoreObservation, TeamRef } from "../../../shared/ngfSportsTypes";
import type { SportsSourceAdapter } from "../collector";
import { PublicScoreboardAdapter } from "./publicScoreboard";

export type OfficialSchoolSide = "away" | "home";
export type OfficialSchoolSport = "football" | "basketball";
export type OfficialSchoolResolver = (team: TeamRef, sport: OfficialSchoolSport, game: GameRef) => string | null;

const OFFICIAL_SCHOOL_PAGES: Record<string, Partial<Record<OfficialSchoolSport, string>>> = {
  hou: {
    football: "https://uhcougars.com/sports/football/schedule",
    basketball: "https://uhcougars.com/sports/mens-basketball/schedule",
  },
  houston: {
    football: "https://uhcougars.com/sports/football/schedule",
    basketball: "https://uhcougars.com/sports/mens-basketball/schedule",
  },
  orst: {
    football: "https://osubeavers.com/sports/football/schedule/",
  },
  oregonstate: {
    football: "https://osubeavers.com/sports/football/schedule/",
  },
};

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const defaultOfficialSchoolResolver: OfficialSchoolResolver = (team, sport) => {
  const keys = [team.ngfTeamId, team.abbreviation, team.name].map(normalizedKey).filter(Boolean);
  for (const key of keys) {
    const url = OFFICIAL_SCHOOL_PAGES[key]?.[sport];
    if (url) return url;
  }
  return null;
};

export class OfficialSchoolScoreboardAdapter implements SportsSourceAdapter {
  readonly sourceId: string;
  readonly label: string;

  constructor(
    private readonly side: OfficialSchoolSide,
    private readonly resolver: OfficialSchoolResolver = defaultOfficialSchoolResolver,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.sourceId = `official-${side}-school`;
    this.label = `Official ${side} school athletics scoreboard`;
  }

  private teamFor(game: GameRef): TeamRef {
    return this.side === "away" ? game.away : game.home;
  }

  canHandle(game: GameRef): boolean {
    if (game.sport !== "football" && game.sport !== "basketball") return false;
    return Boolean(this.resolver(this.teamFor(game), game.sport, game));
  }

  async fetchGame(game: GameRef): Promise<ScoreObservation | null> {
    if (!this.canHandle(game)) return null;
    const team = this.teamFor(game);
    const url = this.resolver(team, game.sport as OfficialSchoolSport, game);
    if (!url) return null;

    const delegate = new PublicScoreboardAdapter(this.sourceId, this.label, () => url, this.fetchImpl);
    const observation = await delegate.fetchGame(game);
    if (!observation) return null;

    return {
      ...observation,
      sourceLineage: `school:${normalizedKey(team.ngfTeamId || team.abbreviation || team.name)}`,
    };
  }
}
