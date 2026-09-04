CREATE TABLE IF NOT EXISTS ngf_intramural_activity_catalog (
  slug varchar(40) PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE,
  kind varchar(20) NOT NULL DEFAULT 'sport'
    CHECK (kind IN ('sport','activity')),
  is_active boolean NOT NULL DEFAULT true,
  source varchar(20) NOT NULL DEFAULT 'system'
    CHECK (source IN ('system','member')),
  sort_order integer NOT NULL DEFAULT 1000,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ngf_intramural_activity_suggestions (
  suggestion_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by varchar NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  name varchar(100) NOT NULL,
  proposed_slug varchar(40) NOT NULL,

  kind varchar(20) NOT NULL DEFAULT 'sport'
    CHECK (kind IN ('sport','activity')),

  description text,

  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),

  review_reason text,

  reviewed_by varchar
    REFERENCES users(id) ON DELETE SET NULL,

  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  idx_intramural_activity_suggestions_status
ON ngf_intramural_activity_suggestions(status,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_intramural_activity_pending_name
ON ngf_intramural_activity_suggestions(lower(name))
WHERE status='pending';

INSERT INTO ngf_intramural_activity_catalog
  (slug,name,kind,sort_order)
VALUES
  ('flag-football','Flag Football','sport',10),
  ('basketball','Basketball','sport',20),
  ('soccer','Soccer','sport',30),
  ('volleyball','Volleyball','sport',40),
  ('softball','Softball','sport',50),
  ('baseball','Baseball','sport',60),
  ('cricket','Cricket','sport',70),
  ('hockey','Hockey','sport',80),
  ('lacrosse','Lacrosse','sport',90),
  ('rugby','Rugby','sport',100),
  ('ultimate-frisbee','Ultimate Frisbee','sport',110),
  ('dodgeball','Dodgeball','sport',120)
ON CONFLICT(slug) DO UPDATE
SET
  name=EXCLUDED.name,
  kind=EXCLUDED.kind,
  is_active=true,
  sort_order=EXCLUDED.sort_order,
  updated_at=now();
