-- CoogsNation — one seat per member per venue
--
-- Additive and idempotent. Adds one constraint; creates no tables and drops
-- no columns. Safe to run against a populated database and safe to re-run.
--
-- ---------------------------------------------------------------------------
-- WHY
--
-- `venue_seat_claims` has always had a unique index on
-- (venue_id, seat_persistent_id) — one OWNER per seat. Nothing has ever
-- enforced the other direction: one SEAT per owner.
--
-- The application relied on `claimVenueSeat()` deleting a member's existing
-- claim before inserting the new one. That transaction had two defects:
--
--   1. If the target seat was already held, the INSERT hit the unique index
--      and returned nothing — but the DELETE had already run. The member lost
--      the seat they were sitting in and gained nothing.
--   2. Any path that inserted without that delete could leave one member
--      holding several seats, with no constraint to stop it.
--
-- The transaction is corrected to insert first and only then release the old
-- seat. This migration adds the constraint that makes the invariant true in
-- the database rather than only in the code that happens to write to it.
--
-- ---------------------------------------------------------------------------
-- 1. Remove pre-existing duplicates
--
-- A unique index CANNOT be created while violating rows exist, and the old
-- code path could have produced them. So dedupe first, keeping the member's
-- MOST RECENT claim — that is the seat they last chose, and therefore the one
-- they expect to still be in.
--
-- This deletes rows. It only ever deletes duplicates: a member holding a
-- single seat in a venue is untouched.
-- ---------------------------------------------------------------------------
DELETE FROM venue_seat_claims a
USING venue_seat_claims b
WHERE a.venue_id = b.venue_id
  AND a.user_id  = b.user_id
  AND (
    a.claimed_at < b.claimed_at
    OR (a.claimed_at = b.claimed_at AND a.id < b.id)   -- deterministic tie-break
  );

-- ---------------------------------------------------------------------------
-- 2. Enforce it
--
-- With this in place a member can hold at most one seat per venue, whatever
-- the calling code does. Combined with the existing seat-side index, the two
-- constraints together make double-booking impossible in either direction.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS venue_seat_claims_user_unique
  ON venue_seat_claims (venue_id, user_id);

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual)
-- ---------------------------------------------------------------------------
-- DROP INDEX IF EXISTS venue_seat_claims_user_unique;
--
-- The deduplication in step 1 is NOT reversible. Take a backup before
-- migrating if the duplicate rows have any value.
