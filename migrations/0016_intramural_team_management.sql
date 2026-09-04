
-- NGF Intramural Team Administration
-- Captain / Co-Captains / player statistics / deletion recovery / audit.

ALTER TABLE ngf_intramural_team_members
  DROP CONSTRAINT IF EXISTS
    ngf_intramural_team_members_role_check;

ALTER TABLE ngf_intramural_team_members
  ADD CONSTRAINT
    ngf_intramural_team_members_role_check
  CHECK (
    role IN (
      'captain',
      'co-captain',
      'player'
    )
  );

ALTER TABLE ngf_intramural_team_members
  ADD COLUMN IF NOT EXISTS
    stats jsonb NOT NULL DEFAULT '{}'::jsonb;


ALTER TABLE ngf_intramural_teams
  ADD COLUMN IF NOT EXISTS
    deletion_requested_at timestamptz;

ALTER TABLE ngf_intramural_teams
  ADD COLUMN IF NOT EXISTS
    deletion_requested_by varchar
      REFERENCES users(id)
      ON DELETE SET NULL;

ALTER TABLE ngf_intramural_teams
  ADD COLUMN IF NOT EXISTS
    last_deletion_cancelled_at timestamptz;


CREATE INDEX IF NOT EXISTS
  idx_intramural_team_deletion
ON ngf_intramural_teams(
  deletion_requested_at
);


CREATE TABLE IF NOT EXISTS
  ngf_intramural_team_audit (
    audit_id uuid PRIMARY KEY
      DEFAULT gen_random_uuid(),

    team_id uuid NOT NULL,

    action varchar(80) NOT NULL,

    actor_user_id varchar
      REFERENCES users(id)
      ON DELETE SET NULL,

    subject_user_id varchar
      REFERENCES users(id)
      ON DELETE SET NULL,

    detail jsonb NOT NULL
      DEFAULT '{}'::jsonb,

    created_at timestamptz NOT NULL
      DEFAULT now()
  );


CREATE INDEX IF NOT EXISTS
  idx_intramural_team_audit_team
ON ngf_intramural_team_audit(
  team_id,
  created_at DESC
);


-- Historical snapshot is deliberately NOT FK-linked to the
-- live team because this record survives final deletion.
CREATE TABLE IF NOT EXISTS
  ngf_intramural_team_archives (
    team_id uuid PRIMARY KEY,

    team_name varchar(100) NOT NULL,

    snapshot jsonb NOT NULL,

    archived_at timestamptz NOT NULL
      DEFAULT now()
  );


CREATE OR REPLACE FUNCTION
  ngf_archive_intramural_team_before_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

  INSERT INTO
    ngf_intramural_team_archives(
      team_id,
      team_name,
      snapshot,
      archived_at
    )
  VALUES(
    OLD.team_id,
    OLD.name,

    jsonb_build_object(

      'team',
      to_jsonb(OLD),

      'members',
      COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(m)
          )
          FROM
            ngf_intramural_team_members m
          WHERE
            m.team_id = OLD.team_id
        ),
        '[]'::jsonb
      ),

      'games',
      COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(g)
          )
          FROM
            ngf_intramural_games g
          WHERE
            g.away_team_id = OLD.team_id
            OR
            g.home_team_id = OLD.team_id
        ),
        '[]'::jsonb
      ),

      'score_submissions',
      COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(s)
          )
          FROM
            ngf_intramural_score_submissions s
          JOIN
            ngf_intramural_games g
              ON g.game_id = s.game_id
          WHERE
            g.away_team_id = OLD.team_id
            OR
            g.home_team_id = OLD.team_id
        ),
        '[]'::jsonb
      )
    ),

    now()
  )

  ON CONFLICT(team_id)
  DO UPDATE SET

    team_name =
      EXCLUDED.team_name,

    snapshot =
      EXCLUDED.snapshot,

    archived_at =
      EXCLUDED.archived_at;

  RETURN OLD;

END;
$$;


DROP TRIGGER IF EXISTS
  trg_archive_intramural_team
ON ngf_intramural_teams;


CREATE TRIGGER
  trg_archive_intramural_team

BEFORE DELETE
ON ngf_intramural_teams

FOR EACH ROW
EXECUTE FUNCTION
  ngf_archive_intramural_team_before_delete();

