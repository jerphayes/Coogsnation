CREATE TABLE IF NOT EXISTS lounge_blocks (
  blocker_user_id varchar(255) NOT NULL,
  blocked_user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT lounge_blocks_no_self CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS lounge_reports (
  id uuid PRIMARY KEY,
  room_id varchar(100) NOT NULL,
  message_id uuid REFERENCES lounge_chat_messages(id) ON DELETE SET NULL,
  reporter_user_id varchar(255) NOT NULL,
  reported_user_id varchar(255) NOT NULL,
  reason varchar(80) NOT NULL,
  details text NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lounge_reports_status_created
ON lounge_reports (status, created_at DESC);
