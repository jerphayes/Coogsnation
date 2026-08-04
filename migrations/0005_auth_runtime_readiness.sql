-- CoogsNation v3.0 — Authentication runtime readiness
--
-- Existing installations may have the users table but lack the PostgreSQL
-- session table expected by connect-pg-simple. Without it, password checks can
-- succeed and req.logIn() then fails while trying to persist the session.

CREATE TABLE IF NOT EXISTS sessions (
  sid varchar PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
