CREATE TABLE IF NOT EXISTS getem_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  sport varchar(40) NOT NULL,
  season varchar(30) NOT NULL,
  phase varchar(40) NOT NULL DEFAULT 'Regular Season',
  round_label varchar(40),
  visibility varchar(12) NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'public')),
  invite_code varchar(6) NOT NULL UNIQUE,
  created_by varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_players integer NOT NULL DEFAULT 25
    CHECK (max_players BETWEEN 2 AND 500),
  status varchar(16) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'live', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS getem_contest_members (
  contest_id uuid NOT NULL REFERENCES getem_contests(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(12) NOT NULL DEFAULT 'player'
    CHECK (role IN ('owner', 'player')),
  total_points integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contest_id, user_id)
);

CREATE TABLE IF NOT EXISTS getem_games (
  id bigserial PRIMARY KEY,
  contest_id uuid NOT NULL REFERENCES getem_contests(id) ON DELETE CASCADE,
  ngf_game_id varchar(120) NOT NULL,
  phase varchar(40),
  round_label varchar(40),
  scheduled_start timestamptz,
  status varchar(20) NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, ngf_game_id)
);

CREATE TABLE IF NOT EXISTS getem_picks (
  id bigserial PRIMARY KEY,
  contest_id uuid NOT NULL,
  user_id varchar NOT NULL,
  ngf_game_id varchar(120) NOT NULL,
  selected_side varchar(120) NOT NULL,
  confidence integer,
  points_awarded integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (contest_id, user_id)
    REFERENCES getem_contest_members(contest_id, user_id)
    ON DELETE CASCADE,
  UNIQUE (contest_id, user_id, ngf_game_id),
  CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS getem_rank_history (
  id bigserial PRIMARY KEY,
  contest_id uuid NOT NULL,
  user_id varchar NOT NULL,
  rank integer NOT NULL CHECK (rank > 0),
  points integer NOT NULL DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (contest_id, user_id)
    REFERENCES getem_contest_members(contest_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_getem_contests_status
  ON getem_contests(status);

CREATE INDEX IF NOT EXISTS idx_getem_contests_created_by
  ON getem_contests(created_by);

CREATE INDEX IF NOT EXISTS idx_getem_members_user
  ON getem_contest_members(user_id);

CREATE INDEX IF NOT EXISTS idx_getem_games_contest
  ON getem_games(contest_id);

CREATE INDEX IF NOT EXISTS idx_getem_picks_user_contest
  ON getem_picks(user_id, contest_id);

CREATE INDEX IF NOT EXISTS idx_getem_rank_history_contest_time
  ON getem_rank_history(contest_id, snapshot_at DESC);
