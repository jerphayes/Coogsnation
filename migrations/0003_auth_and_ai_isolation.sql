-- CoogsNation v2.5.3 — Authentication hardening + two-tier AI isolation
--
-- Additive and idempotent. Does not modify or drop existing columns, so it is
-- safe to run against a populated database and safe to re-run.
--
-- ROLLBACK: see the commented block at the end of this file. Rolling back drops
-- the audit tables and the columns added here; it does not touch pre-existing
-- data.

-- ---------------------------------------------------------------------------
-- 1. Account status + session revocation
-- ---------------------------------------------------------------------------

-- Account lifecycle state. Only 'active' accounts may authenticate.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status varchar(20) NOT NULL DEFAULT 'active';

-- Monotonic counter used to revoke outstanding sessions. Incrementing this
-- invalidates every session issued before the change (password reset/change,
-- administrative suspension, credential compromise).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

-- Constrain account_status to known values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'disabled', 'pending'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);

-- ---------------------------------------------------------------------------
-- 2. Authentication audit events (append-only)
-- ---------------------------------------------------------------------------
-- Never stores raw passwords, tokens, API keys, or CAPTCHA secrets.
-- Client IP is stored as a salted hash, not in the clear.

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  event_type    varchar(50)  NOT NULL,
  outcome       varchar(20)  NOT NULL,
  user_id       varchar(255) REFERENCES users(id) ON DELETE SET NULL,
  identifier_hash varchar(64),
  client_ip_hash  varchar(64),
  user_agent    varchar(255),
  detail        text
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_occurred_at ON auth_audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_events (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_type ON auth_audit_events (event_type);

-- ---------------------------------------------------------------------------
-- 3. Privileged AI audit trail (append-only)
-- ---------------------------------------------------------------------------
-- Records administrator AI usage. Stores sanitized tool results only; never
-- secrets, credentials, or raw authentication material.

CREATE TABLE IF NOT EXISTS ai_admin_audit_events (
  id                bigserial PRIMARY KEY,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  admin_user_id     varchar(255) REFERENCES users(id) ON DELETE SET NULL,
  provider          varchar(50),
  model             varchar(120),
  request_category  varchar(80),
  tools_requested   text,
  tool_results      text,
  recommendation    text,
  claude_review_requested boolean NOT NULL DEFAULT false,
  admin_decision    varchar(80),
  execution_status  varchar(40) NOT NULL DEFAULT 'not_applicable',
  input_tokens      integer,
  output_tokens     integer,
  estimated_cost_usd numeric(10, 6)
);

CREATE INDEX IF NOT EXISTS idx_ai_admin_audit_occurred_at ON ai_admin_audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_admin_audit_admin ON ai_admin_audit_events (admin_user_id);

-- ---------------------------------------------------------------------------
-- 4. Public AI usage accounting
-- ---------------------------------------------------------------------------
-- Usage/cost accounting for the public tier. Conversation content is NOT
-- stored; only a request hash plus accounting fields.

CREATE TABLE IF NOT EXISTS ai_public_usage_events (
  id                bigserial PRIMARY KEY,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  user_id           varchar(255) REFERENCES users(id) ON DELETE SET NULL,
  client_ip_hash    varchar(64),
  provider          varchar(50),
  model             varchar(120),
  request_hash      varchar(64),
  status            varchar(40) NOT NULL,
  input_tokens      integer,
  output_tokens     integer,
  estimated_cost_usd numeric(10, 6)
);

CREATE INDEX IF NOT EXISTS idx_ai_public_usage_occurred_at ON ai_public_usage_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_public_usage_user ON ai_public_usage_events (user_id);

-- ---------------------------------------------------------------------------
-- 5. Case-insensitive uniqueness for login identifiers
-- ---------------------------------------------------------------------------
-- PostgreSQL text uniqueness is case-sensitive, so the existing UNIQUE
-- constraints on email/handle would permit "Jerry@x.com" and "jerry@x.com" as
-- separate accounts. These functional unique indexes enforce case-insensitive
-- uniqueness, matching the case-insensitive lookups used by the application.
--
-- NOTE: if existing rows already collide case-insensitively, these index
-- creations will FAIL. Resolve duplicates first with:
--   SELECT lower(email), count(*) FROM users WHERE email IS NOT NULL
--     GROUP BY lower(email) HAVING count(*) > 1;
--   SELECT lower(handle), count(*) FROM users WHERE handle IS NOT NULL
--     GROUP BY lower(handle) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
  ON users (lower(email)) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle_lower_unique
  ON users (lower(handle)) WHERE handle IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Append-only enforcement for the audit tables
-- ---------------------------------------------------------------------------
-- Calling a table "append-only" is only meaningful if the database enforces it.
-- These triggers reject UPDATE and DELETE on the audit tables regardless of the
-- application code path or ORM used.
--
-- Retention/archival must therefore be performed deliberately by a superuser or
-- table owner who first disables the trigger, e.g.:
--   ALTER TABLE auth_audit_events DISABLE TRIGGER trg_auth_audit_append_only;

CREATE OR REPLACE FUNCTION coogsnation_reject_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only; % is not permitted',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auth_audit_append_only ON auth_audit_events;
CREATE TRIGGER trg_auth_audit_append_only
  BEFORE UPDATE OR DELETE ON auth_audit_events
  FOR EACH ROW EXECUTE FUNCTION coogsnation_reject_mutation();

DROP TRIGGER IF EXISTS trg_ai_admin_audit_append_only ON ai_admin_audit_events;
CREATE TRIGGER trg_ai_admin_audit_append_only
  BEFORE UPDATE OR DELETE ON ai_admin_audit_events
  FOR EACH ROW EXECUTE FUNCTION coogsnation_reject_mutation();

-- ---------------------------------------------------------------------------
-- ROLLBACK (run manually, against a disposable test database only)
-- ---------------------------------------------------------------------------
-- Do NOT run this against a populated development or production database.
--
-- DROP TRIGGER IF EXISTS trg_ai_admin_audit_append_only ON ai_admin_audit_events;
-- DROP TRIGGER IF EXISTS trg_auth_audit_append_only ON auth_audit_events;
-- DROP FUNCTION IF EXISTS coogsnation_reject_mutation();
-- DROP INDEX IF EXISTS idx_users_handle_lower_unique;
-- DROP INDEX IF EXISTS idx_users_email_lower_unique;
-- DROP TABLE IF EXISTS ai_public_usage_events;
-- DROP TABLE IF EXISTS ai_admin_audit_events;
-- DROP TABLE IF EXISTS auth_audit_events;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
-- DROP INDEX IF EXISTS idx_users_account_status;
-- ALTER TABLE users DROP COLUMN IF EXISTS session_version;
-- ALTER TABLE users DROP COLUMN IF EXISTS account_status;
