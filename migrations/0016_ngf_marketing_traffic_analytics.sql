-- NGF first-party marketing, acquisition and traffic analytics.
-- Additive only. Does not alter the existing application sessions table.

CREATE TABLE IF NOT EXISTS ngf_analytics_visitors (
  visitor_id varchar(64) PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  first_source varchar(160),
  first_medium varchar(80),
  first_campaign varchar(200),
  first_content varchar(200),
  first_term varchar(200),
  first_referrer_host varchar(255),
  first_landing_path varchar(500),

  last_source varchar(160),
  last_medium varchar(80),
  last_campaign varchar(200),
  last_content varchar(200),
  last_term varchar(200),
  last_referrer_host varchar(255),
  last_landing_path varchar(500),

  conversion_source varchar(160),
  conversion_medium varchar(80),
  conversion_campaign varchar(200),
  conversion_content varchar(200),
  conversion_referrer_host varchar(255),

  member_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ngf_analytics_sessions (
  session_id varchar(64) PRIMARY KEY,
  visitor_id varchar(64) NOT NULL REFERENCES ngf_analytics_visitors(visitor_id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  landing_path varchar(500),
  source varchar(160),
  medium varchar(80),
  campaign varchar(200),
  content varchar(200),
  term varchar(200),
  referrer_host varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ngf_analytics_events (
  id bigserial PRIMARY KEY,
  visitor_id varchar(64) NOT NULL REFERENCES ngf_analytics_visitors(visitor_id) ON DELETE CASCADE,
  session_id varchar(64) REFERENCES ngf_analytics_sessions(session_id) ON DELETE SET NULL,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  path varchar(500),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ngf_analytics_visitors_first_seen_idx ON ngf_analytics_visitors(first_seen_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_visitors_last_seen_idx ON ngf_analytics_visitors(last_seen_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_visitors_member_idx ON ngf_analytics_visitors(member_user_id);
CREATE INDEX IF NOT EXISTS ngf_analytics_visitors_conversion_idx ON ngf_analytics_visitors(converted_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_visitors_source_idx ON ngf_analytics_visitors(first_source);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_visitor_idx ON ngf_analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_user_idx ON ngf_analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_started_idx ON ngf_analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_last_seen_idx ON ngf_analytics_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_source_idx ON ngf_analytics_sessions(source);
CREATE INDEX IF NOT EXISTS ngf_analytics_sessions_campaign_idx ON ngf_analytics_sessions(campaign);
CREATE INDEX IF NOT EXISTS ngf_analytics_events_time_idx ON ngf_analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_events_type_time_idx ON ngf_analytics_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS ngf_analytics_events_visitor_idx ON ngf_analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS ngf_analytics_events_session_idx ON ngf_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS ngf_analytics_events_user_idx ON ngf_analytics_events(user_id);
