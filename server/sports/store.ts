import type { Pool } from "pg";
import type { GameRef, ReconciledGame, ScoreObservation, SourceHealth } from "../../shared/ngfSportsTypes";

export class SportsStore {
  private available: boolean | null = null;
  constructor(private readonly pool: Pool) {}

  async isAvailable(): Promise<boolean> {
    if (this.available != null) return this.available;
    const result = await this.pool.query("select to_regclass('public.ngf_sports_games') as games, to_regclass('public.ngf_sports_current') as current");
    this.available = Boolean(result.rows[0]?.games && result.rows[0]?.current);
    return this.available;
  }

  async upsertSource(source: SourceHealth & { label?: string; sourceType?: string }) {
    if (!await this.isAvailable()) return;
    await this.pool.query(`
      insert into ngf_sports_sources(source_id,label,source_type,reliability,last_success_at,consecutive_errors,updated_at)
      values($1,$2,$3,$4,$5,$6,now())
      on conflict(source_id) do update set label=excluded.label, source_type=excluded.source_type,
        reliability=excluded.reliability,last_success_at=excluded.last_success_at,
        consecutive_errors=excluded.consecutive_errors,updated_at=now()`,
      [source.sourceId, source.label || source.sourceId, source.sourceType || 'public-web', source.reliability, source.lastSuccessAt || null, source.consecutiveErrors || 0]);
  }

  async upsertGame(game: GameRef) {
    if (!await this.isAvailable()) return;
    for (const team of [game.away, game.home]) {
      await this.pool.query(`
        insert into ngf_sports_teams(ngf_team_id,sport,division,name,abbreviation,conference,updated_at)
        values($1,$2,$3,$4,$5,$6,now())
        on conflict(ngf_team_id) do update set sport=excluded.sport,division=excluded.division,name=excluded.name,
          abbreviation=excluded.abbreviation,conference=coalesce(excluded.conference,ngf_sports_teams.conference),updated_at=now()`,
        [team.ngfTeamId, game.sport, team.division, team.name, team.abbreviation, team.conference || null]);
    }
    await this.pool.query(`
      insert into ngf_sports_games(ngf_game_id,sport,season,scheduled_start,away_team_id,home_team_id,phase,updated_at)
      values($1,$2,$3,$4,$5,$6,'scheduled',now())
      on conflict(ngf_game_id) do update set scheduled_start=excluded.scheduled_start,away_team_id=excluded.away_team_id,
        home_team_id=excluded.home_team_id,updated_at=now()`,
      [game.ngfGameId, game.sport, game.season, game.scheduledStart, game.away.ngfTeamId, game.home.ngfTeamId]);
  }

  async recordObservation(observation: ScoreObservation) {
    if (!await this.isAvailable()) return;
    await this.upsertGame(observation.game);
    await this.pool.query(`
      insert into ngf_sports_observations(ngf_game_id,source_id,observed_at,away_score,home_score,phase,period,clock,status_text)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [observation.game.ngfGameId, observation.sourceId, observation.observedAt, observation.awayScore, observation.homeScore,
       observation.phase, observation.period || null, observation.clock || null, observation.statusText || null]);
  }

  async saveCurrent(game: ReconciledGame) {
    if (!await this.isAvailable()) return;
    await this.pool.query(`
      insert into ngf_sports_current(ngf_game_id,accepted_at,away_score,home_score,phase,period,clock,status_text,confidence,agreeing_sources,conflicting_sources,updated_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
      on conflict(ngf_game_id) do update set accepted_at=excluded.accepted_at,away_score=excluded.away_score,
        home_score=excluded.home_score,phase=excluded.phase,period=excluded.period,clock=excluded.clock,status_text=excluded.status_text,
        confidence=excluded.confidence,agreeing_sources=excluded.agreeing_sources,conflicting_sources=excluded.conflicting_sources,updated_at=now()`,
      [game.game.ngfGameId, game.acceptedAt, game.awayScore, game.homeScore, game.phase, game.period || null, game.clock || null,
       game.statusText || null, game.confidence, game.agreeingSources, game.conflictingSources]);
  }

  async loadCurrent(hoursPast = 96): Promise<ReconciledGame[]> {
    if (!await this.isAvailable()) return [];

    const result = await this.pool.query(`
      select
        g.ngf_game_id,g.sport,g.season,g.scheduled_start,
        a.ngf_team_id away_id,a.name away_name,a.abbreviation away_abbr,
        a.division away_div,a.conference away_conf,
        h.ngf_team_id home_id,h.name home_name,h.abbreviation home_abbr,
        h.division home_div,h.conference home_conf,
        c.accepted_at,c.away_score,c.home_score,c.phase,c.period,c.clock,
        c.status_text,c.confidence,c.agreeing_sources,c.conflicting_sources
      from ngf_sports_current c
      join ngf_sports_games g on g.ngf_game_id=c.ngf_game_id
      join ngf_sports_teams a on a.ngf_team_id=g.away_team_id
      join ngf_sports_teams h on h.ngf_team_id=g.home_team_id
      where g.scheduled_start >= now() - ($1 || ' hours')::interval
      order by g.scheduled_start asc
    `, [hoursPast]);

    return result.rows.map((r) => ({
      game: {
        ngfGameId: r.ngf_game_id,
        sport: r.sport,
        season: r.season,
        scheduledStart: new Date(r.scheduled_start).toISOString(),
        away: {
          ngfTeamId: r.away_id,
          name: r.away_name,
          abbreviation: r.away_abbr,
          division: r.away_div,
          conference: r.away_conf || undefined,
        },
        home: {
          ngfTeamId: r.home_id,
          name: r.home_name,
          abbreviation: r.home_abbr,
          division: r.home_div,
          conference: r.home_conf || undefined,
        },
      },
      awayScore: r.away_score,
      homeScore: r.home_score,
      phase: r.phase,
      period: r.period,
      clock: r.clock,
      statusText: r.status_text,
      acceptedAt: new Date(r.accepted_at).toISOString(),
      confidence: Number(r.confidence || 0),
      agreeingSources: r.agreeing_sources || [],
      conflictingSources: r.conflicting_sources || [],
    }));
  }

  async loadUpcoming(hoursPast = 6, hoursFuture = 30): Promise<GameRef[]> {
    if (!await this.isAvailable()) return [];
    const result = await this.pool.query(`
      select g.ngf_game_id,g.sport,g.season,g.scheduled_start,
             a.ngf_team_id away_id,a.name away_name,a.abbreviation away_abbr,a.division away_div,a.conference away_conf,
             h.ngf_team_id home_id,h.name home_name,h.abbreviation home_abbr,h.division home_div,h.conference home_conf
      from ngf_sports_games g
      join ngf_sports_teams a on a.ngf_team_id=g.away_team_id
      join ngf_sports_teams h on h.ngf_team_id=g.home_team_id
      where g.scheduled_start between now() - ($1 || ' hours')::interval and now() + ($2 || ' hours')::interval
      order by g.scheduled_start asc`, [hoursPast, hoursFuture]);
    return result.rows.map((r) => ({
      ngfGameId: r.ngf_game_id, sport: r.sport, season: r.season, scheduledStart: new Date(r.scheduled_start).toISOString(),
      away: { ngfTeamId:r.away_id,name:r.away_name,abbreviation:r.away_abbr,division:r.away_div,conference:r.away_conf || undefined },
      home: { ngfTeamId:r.home_id,name:r.home_name,abbreviation:r.home_abbr,division:r.home_div,conference:r.home_conf || undefined },
    }));
  }
}
