-- ADDITIVE ONLY. Do not run drizzle-kit push for this migration.
-- This migration intentionally does not alter or drop any existing CoogsNation tables.

CREATE TABLE IF NOT EXISTS ngf_sports_sources (
  source_id varchar(80) PRIMARY KEY,
  label varchar(160) NOT NULL,
  source_type varchar(40) NOT NULL,
  reliability numeric(5,4) NOT NULL DEFAULT 0.8500,
  enabled boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  consecutive_errors integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ngf_sports_teams (
  ngf_team_id varchar(100) PRIMARY KEY,
  sport varchar(30) NOT NULL,
  division varchar(30) NOT NULL,
  name varchar(160) NOT NULL,
  abbreviation varchar(20) NOT NULL,
  nickname varchar(100),
  conference varchar(100),
  primary_color varchar(20),
  secondary_color varchar(20),
  source_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ngf_sports_teams_sport_division ON ngf_sports_teams(sport, division);
CREATE INDEX IF NOT EXISTS idx_ngf_sports_teams_conference ON ngf_sports_teams(conference);

CREATE TABLE IF NOT EXISTS ngf_sports_games (
  ngf_game_id varchar(140) PRIMARY KEY,
  sport varchar(30) NOT NULL,
  season integer NOT NULL,
  scheduled_start timestamptz NOT NULL,
  away_team_id varchar(100) NOT NULL REFERENCES ngf_sports_teams(ngf_team_id),
  home_team_id varchar(100) NOT NULL REFERENCES ngf_sports_teams(ngf_team_id),
  venue varchar(200),
  phase varchar(30) NOT NULL DEFAULT 'scheduled',
  source_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ngf_sports_games_start ON ngf_sports_games(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_ngf_sports_games_away ON ngf_sports_games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_ngf_sports_games_home ON ngf_sports_games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_ngf_sports_games_sport_season ON ngf_sports_games(sport, season);

CREATE TABLE IF NOT EXISTS ngf_sports_observations (
  id bigserial PRIMARY KEY,
  ngf_game_id varchar(140) NOT NULL REFERENCES ngf_sports_games(ngf_game_id) ON DELETE CASCADE,
  source_id varchar(80) NOT NULL REFERENCES ngf_sports_sources(source_id),
  observed_at timestamptz NOT NULL,
  away_score integer,
  home_score integer,
  phase varchar(30) NOT NULL,
  period integer,
  clock varchar(30),
  status_text varchar(100),
  payload_hash varchar(128),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ngf_sports_obs_game_time ON ngf_sports_observations(ngf_game_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ngf_sports_obs_source_time ON ngf_sports_observations(source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS ngf_sports_current (
  ngf_game_id varchar(140) PRIMARY KEY REFERENCES ngf_sports_games(ngf_game_id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL,
  away_score integer,
  home_score integer,
  phase varchar(30) NOT NULL,
  period integer,
  clock varchar(30),
  status_text varchar(100),
  confidence numeric(6,5) NOT NULL DEFAULT 0,
  agreeing_sources text[] NOT NULL DEFAULT '{}',
  conflicting_sources text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
