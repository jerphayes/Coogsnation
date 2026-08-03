-- CoogsNation v3.0 — Virtual Venue Engine seat persistence
--
-- Additive and idempotent. Creates one new table and its indexes. Does not
-- modify, rename or drop anything that already exists, so it is safe to run
-- against a populated database and safe to re-run.
--
-- ROLLBACK: see the commented block at the end of this file.

-- ---------------------------------------------------------------------------
-- 1. Venue seat claims
--
-- The Virtual Venue Engine owns RUNTIME seat state — occupancy, avatars, the
-- digital twin. This table is the PERSISTENT record, owned by CoogsNation.
-- The engine never reads or writes it directly; access is through IStorage.
--
-- `seat_persistent_id` is derived by the engine from venue structure, in the
-- form  seat:<venue>:<tier>:<section>:<row>:<number>  rather than randomly
-- assigned, so a seat keeps its history across venue rebuilds.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_seat_claims (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            VARCHAR(32)  NOT NULL,
  seat_persistent_id  VARCHAR(160) NOT NULL,
  seat_index          INTEGER      NOT NULL,
  section             VARCHAR(32)  NOT NULL,
  "row"               INTEGER      NOT NULL,
  seat_number         INTEGER      NOT NULL,
  user_id             VARCHAR      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name        VARCHAR(120) NOT NULL,
  claimed_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- One claim per seat, enforced by the database rather than by application
-- logic. Two simultaneous claims cannot both succeed; the loser is rejected
-- by the constraint and the API returns 409.
CREATE UNIQUE INDEX IF NOT EXISTS venue_seat_claims_seat_unique
  ON venue_seat_claims (venue_id, seat_persistent_id);

-- Loading a venue reads every claim for that venue.
CREATE INDEX IF NOT EXISTS venue_seat_claims_venue_idx
  ON venue_seat_claims (venue_id);

-- Finding "where am I sitting" and cascading account deletion.
CREATE INDEX IF NOT EXISTS venue_seat_claims_user_idx
  ON venue_seat_claims (user_id);

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual)
-- ---------------------------------------------------------------------------
-- DROP INDEX IF EXISTS venue_seat_claims_user_idx;
-- DROP INDEX IF EXISTS venue_seat_claims_venue_idx;
-- DROP INDEX IF EXISTS venue_seat_claims_seat_unique;
-- DROP TABLE IF EXISTS venue_seat_claims;
