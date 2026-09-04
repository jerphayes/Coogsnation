ALTER TABLE ngf_intramural_teams
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE ngf_intramural_teams
SET is_demo=true
WHERE name IN (
  'Bayou Boys',
  'Coog Crew',
  'Cougar Kings',
  'Law Dogs',
  'Dynamo',
  'Red Storm',
  'Bayou Bombers',
  'Shasta Sluggers',
  'Aces',
  'Spike Squad'
);

CREATE INDEX IF NOT EXISTS
  idx_intramural_teams_demo
ON ngf_intramural_teams(is_demo,sport);
