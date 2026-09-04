BEGIN;

-- International-ready contact fields.
ALTER TABLE users
  ALTER COLUMN state TYPE varchar(100);

ALTER TABLE users
  ALTER COLUMN zip_code TYPE varchar(20);

-- Membership age certification.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age integer;

-- Preserve the participation intent supplied at the original
-- email-only membership entry point.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS registration_return_to varchar(512);

-- Versioned legal acceptance.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_version varchar(40);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_version varchar(40);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamp;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS intramural_agreement_version varchar(40);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS intramural_agreement_accepted_at timestamp;

-- Database-level defense in depth.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_age_18_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_age_18_check
      CHECK (age IS NULL OR age >= 18);
  END IF;
END
$$;

COMMIT;
