CREATE TABLE IF NOT EXISTS admin_mfa_credentials (
  user_id varchar PRIMARY KEY
    REFERENCES users(id) ON DELETE CASCADE,

  secret_ciphertext text NOT NULL,
  secret_iv varchar(128) NOT NULL,
  secret_tag varchar(128) NOT NULL,

  enabled boolean NOT NULL DEFAULT false,

  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,

  enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_mfa_recovery_codes (
  id bigserial PRIMARY KEY,

  user_id varchar NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  code_hash varchar(255) NOT NULL,
  used_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_enabled
  ON admin_mfa_credentials(enabled);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_recovery_user
  ON admin_mfa_recovery_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_recovery_unused
  ON admin_mfa_recovery_codes(user_id, used_at);
