-- NGF Intramural Sports
-- Completely separate presentation/data scope from varsity ticker.

CREATE TABLE IF NOT EXISTS ngf_intramural_teams (
  team_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  sport varchar(40) NOT NULL,
  gender varchar(20) NOT NULL DEFAULT 'open',
  league varchar(100) NOT NULL,
  division varchar(100),
  season varchar(50) NOT NULL,
  primary_color varchar(7) NOT NULL DEFAULT '#C8102E',
  secondary_color varchar(7) NOT NULL DEFAULT '#FFFFFF',
  captain_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ngf_intramural_team_members (
  team_id uuid NOT NULL
    REFERENCES ngf_intramural_teams(team_id)
    ON DELETE CASCADE,
  user_id varchar NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  role varchar(20) NOT NULL DEFAULT 'player'
    CHECK (role IN ('captain','player')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(team_id,user_id)
);

CREATE TABLE IF NOT EXISTS ngf_intramural_games (
  game_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport varchar(40) NOT NULL,
  gender varchar(20) NOT NULL DEFAULT 'open',
  league varchar(100) NOT NULL,
  division varchar(100),
  season varchar(50) NOT NULL,

  away_team_id uuid NOT NULL
    REFERENCES ngf_intramural_teams(team_id)
    ON DELETE CASCADE,

  home_team_id uuid NOT NULL
    REFERENCES ngf_intramural_teams(team_id)
    ON DELETE CASCADE,

  scheduled_start timestamptz,
  location varchar(160),

  away_score integer
    CHECK (away_score IS NULL OR away_score >= 0),

  home_score integer
    CHECK (home_score IS NULL OR home_score >= 0),

  status varchar(20) NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'scheduled',
        'live',
        'final',
        'disputed',
        'postponed',
        'cancelled'
      )
    ),

  verified_by varchar
    REFERENCES users(id)
    ON DELETE SET NULL,

  created_by varchar
    REFERENCES users(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (away_team_id <> home_team_id)
);

CREATE TABLE IF NOT EXISTS ngf_intramural_score_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  game_id uuid NOT NULL
    REFERENCES ngf_intramural_games(game_id)
    ON DELETE CASCADE,

  submitted_for_team_id uuid NOT NULL
    REFERENCES ngf_intramural_teams(team_id)
    ON DELETE CASCADE,

  submitted_by varchar NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  away_score integer NOT NULL CHECK (away_score >= 0),
  home_score integer NOT NULL CHECK (home_score >= 0),

  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'disputed',
        'resolved'
      )
    ),

  confirmed_by varchar
    REFERENCES users(id)
    ON DELETE SET NULL,

  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS
  idx_intramural_team_sport
ON ngf_intramural_teams(sport,season);

CREATE INDEX IF NOT EXISTS
  idx_intramural_games_start
ON ngf_intramural_games(scheduled_start DESC);

CREATE INDEX IF NOT EXISTS
  idx_intramural_games_away
ON ngf_intramural_games(away_team_id);

CREATE INDEX IF NOT EXISTS
  idx_intramural_games_home
ON ngf_intramural_games(home_team_id);

CREATE INDEX IF NOT EXISTS
  idx_intramural_submission_game
ON ngf_intramural_score_submissions(game_id,created_at DESC);
