CREATE TABLE IF NOT EXISTS site_victory_celebration (
  id integer PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  houston_score integer,
  opponent_name varchar(120),
  opponent_score integer,
  activated_at timestamptz,
  expires_at timestamptz,
  updated_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT site_victory_celebration_singleton
    CHECK (id = 1),

  CONSTRAINT site_victory_houston_score_valid
    CHECK (houston_score IS NULL OR houston_score BETWEEN 0 AND 999),

  CONSTRAINT site_victory_opponent_score_valid
    CHECK (opponent_score IS NULL OR opponent_score BETWEEN 0 AND 999),

  CONSTRAINT site_victory_expiration_valid
    CHECK (
      expires_at IS NULL
      OR activated_at IS NULL
      OR expires_at > activated_at
    )
);

INSERT INTO site_victory_celebration (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
