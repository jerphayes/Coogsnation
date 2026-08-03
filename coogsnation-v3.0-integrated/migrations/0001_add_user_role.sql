-- Foundational authorization migration
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'member';

-- Promote the initial site administrator explicitly after deployment, for example:
-- UPDATE users SET role = 'admin' WHERE email = 'owner@example.com';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
