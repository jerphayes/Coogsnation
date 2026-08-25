import type { Express } from "express";
import { pool } from "./db";
import { requireAdmin } from "./auth";

const BUSINESS_TIME_ZONE = "America/Chicago";

type AnalysisRange = "today" | "7d" | "30d" | "year";

function normalizeRange(value: unknown): AnalysisRange {
  return value === "7d" || value === "30d" || value === "year" ? value : "today";
}

function rangeStartSql(range: AnalysisRange): string {
  switch (range) {
    case "7d":
      return `(date_trunc('day', (now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '6 days') AT TIME ZONE '${BUSINESS_TIME_ZONE}')`;
    case "30d":
      return `(date_trunc('day', (now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '29 days') AT TIME ZONE '${BUSINESS_TIME_ZONE}')`;
    case "year":
      return `(date_trunc('year', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') AT TIME ZONE '${BUSINESS_TIME_ZONE}')`;
    case "today":
    default:
      return `(date_trunc('day', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') AT TIME ZONE '${BUSINESS_TIME_ZONE}')`;
  }
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

async function loadSummary(range: AnalysisRange) {
  const startSql = rangeStartSql(range);

  const result = await pool.query(`
    WITH bounds AS (
      SELECT ${startSql} AS start_at, now() AS end_at
    ),
    rs AS (
      SELECT s.*
      FROM ngf_analytics_sessions s, bounds b
      WHERE s.started_at >= b.start_at AND s.started_at < b.end_at
    ),
    re AS (
      SELECT e.*
      FROM ngf_analytics_events e, bounds b
      WHERE e.occurred_at >= b.start_at AND e.occurred_at < b.end_at
    )
    SELECT
      (SELECT COUNT(DISTINCT visitor_id)::int FROM rs) AS unique_visitors,
      (SELECT COUNT(*)::int FROM rs) AS sessions,
      (SELECT COUNT(*)::int FROM re WHERE event_type = 'pageview') AS pageviews,
      (SELECT COUNT(DISTINCT session_id)::int
         FROM ngf_analytics_sessions
        WHERE last_seen_at >= now() - interval '5 minutes') AS online_now,
      (SELECT COUNT(*)::int
         FROM ngf_analytics_visitors v, bounds b
        WHERE v.first_seen_at >= b.start_at AND v.first_seen_at < b.end_at) AS new_visitors,
      (SELECT COUNT(DISTINCT rs.visitor_id)::int
         FROM rs
         JOIN ngf_analytics_visitors v ON v.visitor_id = rs.visitor_id
         CROSS JOIN bounds b
        WHERE v.first_seen_at < b.start_at) AS returning_visitors,
      (SELECT COUNT(*)::int FROM rs WHERE user_id IS NULL) AS guest_sessions,
      (SELECT COUNT(*)::int FROM rs WHERE user_id IS NOT NULL) AS member_sessions,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM re WHERE event_type = 'signup_started') AS signup_started,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM re WHERE event_type = 'signup_completed') AS signup_completed,
      (SELECT COUNT(DISTINCT COALESCE(user_id, visitor_id))::int FROM re WHERE event_type = 'email_verified') AS email_verified,
      (SELECT COUNT(DISTINCT COALESCE(user_id, visitor_id))::int FROM re WHERE event_type = 'member_activated') AS active_members
  `);

  const row = result.rows[0] || {};
  const uniqueVisitors = num(row.unique_visitors);
  const signupCompleted = num(row.signup_completed);
  const emailVerified = num(row.email_verified);
  const activeMembers = num(row.active_members);

  return {
    uniqueVisitors,
    sessions: num(row.sessions),
    pageviews: num(row.pageviews),
    onlineNow: num(row.online_now),
    newVisitors: num(row.new_visitors),
    returningVisitors: num(row.returning_visitors),
    guestSessions: num(row.guest_sessions),
    memberSessions: num(row.member_sessions),
    signupStarted: num(row.signup_started),
    signupCompleted,
    emailVerified,
    activeMembers,
    visitorToSignupRate: pct(signupCompleted, uniqueVisitors),
    signupToVerifiedRate: pct(emailVerified, signupCompleted),
    visitorToMemberRate: pct(activeMembers, uniqueVisitors),
  };
}

async function loadYearTrend() {
  const result = await pool.query(`
    WITH months AS (
      SELECT
        gs AS month_local,
        EXTRACT(MONTH FROM gs)::int AS month_number,
        to_char(gs, 'Mon') AS month
      FROM generate_series(
        date_trunc('year', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'),
        date_trunc('year', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') + interval '11 months',
        interval '1 month'
      ) AS gs
    ),
    mb AS (
      SELECT
        month_local,
        month_number,
        month,
        month_local AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS start_at,
        (month_local + interval '1 month') AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS end_at
      FROM months
    ),
    session_stats AS (
      SELECT
        mb.month_number,
        COUNT(DISTINCT s.visitor_id)::int AS unique_visitors,
        COUNT(s.session_id)::int AS sessions,
        COUNT(DISTINCT s.visitor_id) FILTER (
          WHERE v.first_seen_at >= mb.start_at AND v.first_seen_at < mb.end_at
        )::int AS new_visitors,
        COUNT(DISTINCT s.visitor_id) FILTER (
          WHERE v.first_seen_at < mb.start_at
        )::int AS returning_visitors,
        COUNT(s.session_id) FILTER (WHERE s.user_id IS NULL)::int AS guest_sessions,
        COUNT(s.session_id) FILTER (WHERE s.user_id IS NOT NULL)::int AS member_sessions
      FROM mb
      LEFT JOIN ngf_analytics_sessions s
        ON s.started_at >= mb.start_at AND s.started_at < mb.end_at
      LEFT JOIN ngf_analytics_visitors v
        ON v.visitor_id = s.visitor_id
      GROUP BY mb.month_number
    ),
    event_stats AS (
      SELECT
        mb.month_number,
        COUNT(*) FILTER (WHERE e.event_type = 'pageview')::int AS pageviews,
        COUNT(DISTINCT e.visitor_id) FILTER (WHERE e.event_type = 'signup_started')::int AS signup_started,
        COUNT(DISTINCT e.visitor_id) FILTER (WHERE e.event_type = 'signup_completed')::int AS signup_completed,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'email_verified')::int AS email_verified,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'member_activated')::int AS active_members
      FROM mb
      LEFT JOIN ngf_analytics_events e
        ON e.occurred_at >= mb.start_at AND e.occurred_at < mb.end_at
      GROUP BY mb.month_number
    ),
    presence_buckets AS (
      SELECT
        mb.month_number,
        date_bin('5 minutes', e.occurred_at, timestamptz '2001-01-01 00:00:00+00') AS bucket,
        COUNT(DISTINCT e.session_id)::int AS concurrent_sessions
      FROM mb
      JOIN ngf_analytics_events e
        ON e.occurred_at >= mb.start_at AND e.occurred_at < mb.end_at
      WHERE e.event_type IN ('pageview', 'heartbeat')
        AND e.session_id IS NOT NULL
      GROUP BY mb.month_number, bucket
    ),
    peak_presence AS (
      SELECT month_number, COALESCE(MAX(concurrent_sessions), 0)::int AS online_peak
      FROM presence_buckets
      GROUP BY month_number
    )
    SELECT
      mb.month_number,
      mb.month,
      COALESCE(ss.unique_visitors, 0)::int AS unique_visitors,
      COALESCE(ss.sessions, 0)::int AS sessions,
      COALESCE(es.pageviews, 0)::int AS pageviews,
      COALESCE(pp.online_peak, 0)::int AS online_peak,
      COALESCE(ss.new_visitors, 0)::int AS new_visitors,
      COALESCE(ss.returning_visitors, 0)::int AS returning_visitors,
      COALESCE(ss.guest_sessions, 0)::int AS guest_sessions,
      COALESCE(ss.member_sessions, 0)::int AS member_sessions,
      COALESCE(es.signup_started, 0)::int AS signup_started,
      COALESCE(es.signup_completed, 0)::int AS signup_completed,
      COALESCE(es.email_verified, 0)::int AS email_verified,
      COALESCE(es.active_members, 0)::int AS active_members
    FROM mb
    LEFT JOIN session_stats ss USING (month_number)
    LEFT JOIN event_stats es USING (month_number)
    LEFT JOIN peak_presence pp USING (month_number)
    ORDER BY mb.month_number
  `);

  return result.rows.map((row: any) => {
    const uniqueVisitors = num(row.unique_visitors);
    const signupCompleted = num(row.signup_completed);
    const emailVerified = num(row.email_verified);
    const activeMembers = num(row.active_members);
    return {
      monthNumber: num(row.month_number),
      month: row.month,
      initial: String(row.month || "").slice(0, 1),
      uniqueVisitors,
      sessions: num(row.sessions),
      pageviews: num(row.pageviews),
      onlinePeak: num(row.online_peak),
      newVisitors: num(row.new_visitors),
      returningVisitors: num(row.returning_visitors),
      guestSessions: num(row.guest_sessions),
      memberSessions: num(row.member_sessions),
      signupStarted: num(row.signup_started),
      signupCompleted,
      emailVerified,
      activeMembers,
      visitorToSignupRate: pct(signupCompleted, uniqueVisitors),
      signupToVerifiedRate: pct(emailVerified, signupCompleted),
      visitorToMemberRate: pct(activeMembers, uniqueVisitors),
    };
  });
}

async function loadAcquisition(range: AnalysisRange) {
  const startSql = rangeStartSql(range);
  const result = await pool.query(`
    WITH bounds AS (
      SELECT ${startSql} AS start_at, now() AS end_at
    ),
    session_sources AS (
      SELECT
        COALESCE(NULLIF(s.source, ''), 'Unknown') AS source,
        COUNT(DISTINCT s.visitor_id)::int AS visitors,
        COUNT(*)::int AS sessions
      FROM ngf_analytics_sessions s, bounds b
      WHERE s.started_at >= b.start_at AND s.started_at < b.end_at
      GROUP BY 1
    ),
    conversion_sources AS (
      SELECT
        COALESCE(NULLIF(v.conversion_source, ''), NULLIF(v.last_source, ''), NULLIF(v.first_source, ''), 'Unknown') AS source,
        COUNT(DISTINCT e.visitor_id) FILTER (WHERE e.event_type = 'signup_completed')::int AS signups,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'email_verified')::int AS verified,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'member_activated')::int AS members
      FROM ngf_analytics_events e
      JOIN ngf_analytics_visitors v ON v.visitor_id = e.visitor_id
      CROSS JOIN bounds b
      WHERE e.occurred_at >= b.start_at
        AND e.occurred_at < b.end_at
        AND e.event_type IN ('signup_completed', 'email_verified', 'member_activated')
      GROUP BY 1
    )
    SELECT
      COALESCE(ss.source, cs.source) AS source,
      COALESCE(ss.visitors, 0)::int AS visitors,
      COALESCE(ss.sessions, 0)::int AS sessions,
      COALESCE(cs.signups, 0)::int AS signups,
      COALESCE(cs.verified, 0)::int AS verified,
      COALESCE(cs.members, 0)::int AS members
    FROM session_sources ss
    FULL OUTER JOIN conversion_sources cs USING (source)
    ORDER BY COALESCE(ss.visitors, 0) DESC, COALESCE(cs.signups, 0) DESC, source
    LIMIT 30
  `);

  return result.rows.map((row: any) => {
    const visitors = num(row.visitors);
    const signups = num(row.signups);
    return {
      source: row.source || "Unknown",
      visitors,
      sessions: num(row.sessions),
      signups,
      verified: num(row.verified),
      members: num(row.members),
      conversionRate: pct(signups, visitors),
    };
  });
}

async function loadCampaigns(range: AnalysisRange) {
  const startSql = rangeStartSql(range);
  const result = await pool.query(`
    WITH bounds AS (
      SELECT ${startSql} AS start_at, now() AS end_at
    ),
    campaign_sessions AS (
      SELECT
        COALESCE(NULLIF(s.source, ''), 'Unknown') AS source,
        COALESCE(NULLIF(s.medium, ''), 'campaign') AS medium,
        s.campaign,
        COUNT(DISTINCT s.visitor_id)::int AS visitors,
        COUNT(*)::int AS sessions
      FROM ngf_analytics_sessions s, bounds b
      WHERE s.started_at >= b.start_at
        AND s.started_at < b.end_at
        AND s.campaign IS NOT NULL
        AND btrim(s.campaign) <> ''
      GROUP BY 1,2,3
    ),
    campaign_conversions AS (
      SELECT
        COALESCE(NULLIF(v.conversion_source, ''), 'Unknown') AS source,
        COALESCE(NULLIF(v.conversion_medium, ''), 'campaign') AS medium,
        v.conversion_campaign AS campaign,
        COUNT(DISTINCT e.visitor_id) FILTER (WHERE e.event_type = 'signup_completed')::int AS signups,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'email_verified')::int AS verified,
        COUNT(DISTINCT COALESCE(e.user_id, e.visitor_id)) FILTER (WHERE e.event_type = 'member_activated')::int AS members
      FROM ngf_analytics_events e
      JOIN ngf_analytics_visitors v ON v.visitor_id = e.visitor_id
      CROSS JOIN bounds b
      WHERE e.occurred_at >= b.start_at
        AND e.occurred_at < b.end_at
        AND v.conversion_campaign IS NOT NULL
        AND btrim(v.conversion_campaign) <> ''
        AND e.event_type IN ('signup_completed', 'email_verified', 'member_activated')
      GROUP BY 1,2,3
    )
    SELECT
      COALESCE(cs.source, cc.source) AS source,
      COALESCE(cs.medium, cc.medium) AS medium,
      COALESCE(cs.campaign, cc.campaign) AS campaign,
      COALESCE(cs.visitors, 0)::int AS visitors,
      COALESCE(cs.sessions, 0)::int AS sessions,
      COALESCE(cc.signups, 0)::int AS signups,
      COALESCE(cc.verified, 0)::int AS verified,
      COALESCE(cc.members, 0)::int AS members
    FROM campaign_sessions cs
    FULL OUTER JOIN campaign_conversions cc
      ON cs.source = cc.source
     AND cs.medium = cc.medium
     AND cs.campaign = cc.campaign
    ORDER BY COALESCE(cs.visitors, 0) DESC, COALESCE(cc.signups, 0) DESC, campaign
    LIMIT 30
  `);

  return result.rows.map((row: any) => {
    const visitors = num(row.visitors);
    const signups = num(row.signups);
    return {
      source: row.source || "Unknown",
      medium: row.medium || "campaign",
      campaign: row.campaign || "Unnamed campaign",
      visitors,
      sessions: num(row.sessions),
      signups,
      verified: num(row.verified),
      members: num(row.members),
      conversionRate: pct(signups, visitors),
    };
  });
}

async function loadLandingPages(range: AnalysisRange) {
  const startSql = rangeStartSql(range);
  const result = await pool.query(`
    WITH bounds AS (
      SELECT ${startSql} AS start_at, now() AS end_at
    ),
    landing_sessions AS (
      SELECT
        COALESCE(NULLIF(s.landing_path, ''), '/') AS landing_path,
        COUNT(DISTINCT s.visitor_id)::int AS visitors,
        COUNT(*)::int AS sessions
      FROM ngf_analytics_sessions s, bounds b
      WHERE s.started_at >= b.start_at AND s.started_at < b.end_at
      GROUP BY 1
    ),
    landing_signups AS (
      SELECT
        COALESCE(NULLIF(s.landing_path, ''), '/') AS landing_path,
        COUNT(DISTINCT e.visitor_id)::int AS signups
      FROM ngf_analytics_events e
      JOIN ngf_analytics_sessions s ON s.session_id = e.session_id
      CROSS JOIN bounds b
      WHERE e.occurred_at >= b.start_at
        AND e.occurred_at < b.end_at
        AND e.event_type = 'signup_completed'
      GROUP BY 1
    )
    SELECT
      ls.landing_path,
      ls.visitors,
      ls.sessions,
      COALESCE(lg.signups, 0)::int AS signups
    FROM landing_sessions ls
    LEFT JOIN landing_signups lg USING (landing_path)
    ORDER BY ls.visitors DESC, ls.sessions DESC
    LIMIT 20
  `);

  return result.rows.map((row: any) => ({
    path: row.landing_path || "/",
    visitors: num(row.visitors),
    sessions: num(row.sessions),
    signups: num(row.signups),
  }));
}

async function loadReferrers(range: AnalysisRange) {
  const startSql = rangeStartSql(range);
  const result = await pool.query(`
    WITH bounds AS (
      SELECT ${startSql} AS start_at, now() AS end_at
    )
    SELECT
      COALESCE(NULLIF(referrer_host, ''), 'Direct / unavailable') AS referrer,
      COUNT(DISTINCT visitor_id)::int AS visitors,
      COUNT(*)::int AS sessions
    FROM ngf_analytics_sessions s, bounds b
    WHERE s.started_at >= b.start_at AND s.started_at < b.end_at
    GROUP BY 1
    ORDER BY visitors DESC, sessions DESC
    LIMIT 15
  `);

  return result.rows.map((row: any) => ({
    referrer: row.referrer || "Direct / unavailable",
    visitors: num(row.visitors),
    sessions: num(row.sessions),
  }));
}

async function buildPanelData(range: AnalysisRange) {
  const [summary, yearTrend, acquisition, campaigns, landingPages, referrers] = await Promise.all([
    loadSummary(range),
    loadYearTrend(),
    loadAcquisition(range),
    loadCampaigns(range),
    loadLandingPages(range),
    loadReferrers(range),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    businessTimeZone: BUSINESS_TIME_ZONE,
    range,
    currentYear: new Date().getFullYear(),
    autoRefreshSeconds: 30,
    summary,
    yearTrend,
    acquisition,
    campaigns,
    landingPages,
    referrers,
  };
}

export function registerMarketingTrafficPanelRoutes(app: Express): void {
  app.get("/api/admin/marketing-traffic-analysis", requireAdmin, async (req: any, res) => {
    try {
      const range = normalizeRange(req.query?.range);
      return res.json(await buildPanelData(range));
    } catch (error) {
      console.error("[MKT ANALYTICS] panel query failed:", error);
      return res.status(500).json({ message: "Unable to load marketing and traffic analysis" });
    }
  });
}
