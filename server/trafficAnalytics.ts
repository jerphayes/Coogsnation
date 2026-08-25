import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { pool } from "./db";
import { requireAdmin } from "./auth";

const BUSINESS_TIME_ZONE = "America/Chicago";
const ONLINE_WINDOW_MINUTES = 5;

const idSchema = z.string().uuid().max(64);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const attributionSchema = z.object({
  source: optionalText(160),
  medium: optionalText(80),
  campaign: optionalText(200),
  content: optionalText(200),
  term: optionalText(200),
  referrer: optionalText(1000),
}).strict().optional();

const publicAnalyticsEventSchema = z.object({
  visitorId: idSchema,
  sessionId: idSchema,
  eventType: z.enum(["pageview", "heartbeat", "signup_started"]),
  path: z.string().trim().max(500).optional().default("/"),
  title: z.string().trim().max(300).optional(),
  attribution: attributionSchema,
}).strict();

type AttributionInput = z.infer<typeof attributionSchema>;
export type TrafficRange = "today" | "7d" | "30d" | "year" | "custom";

export interface MarketingTrafficQuery {
  range?: TrafficRange;
  startDate?: string;
  endDate?: string;
}

interface ClassifiedAttribution {
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrerHost: string | null;
}

function clampText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function safeHost(value: unknown): string | null {
  const text = clampText(value, 1000);
  if (!text) return null;
  try {
    return new URL(text).hostname.toLowerCase().replace(/^www\./, "").slice(0, 255);
  } catch {
    return null;
  }
}

function cleanPath(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "/";
  if (!text.startsWith("/")) return "/";
  const q = text.indexOf("?");
  const hash = text.indexOf("#");
  const cuts = [q, hash].filter((n) => n >= 0);
  const cut = cuts.length ? Math.min(...cuts) : text.length;
  return (text.slice(0, cut) || "/").slice(0, 500);
}

function classifyAttribution(input: AttributionInput): ClassifiedAttribution {
  const explicitSource = clampText(input?.source, 160)?.toLowerCase() || null;
  const explicitMedium = clampText(input?.medium, 80)?.toLowerCase() || null;
  const campaign = clampText(input?.campaign, 200);
  const content = clampText(input?.content, 200);
  const term = clampText(input?.term, 200);
  const referrerHost = safeHost(input?.referrer);

  if (explicitSource) {
    const canonicalSources: Record<string, string> = {
      "redcougarrising": "RedCougarRising.com",
      "redcougarrising.com": "RedCougarRising.com",
      "coogsnation": "CoogsNation",
      "coogsnation.com": "CoogsNation",
      "google": "Google",
      "bing": "Bing",
      "duckduckgo": "DuckDuckGo",
      "facebook": "Facebook",
      "instagram": "Instagram",
      "x": "X",
      "twitter": "X",
      "reddit": "Reddit",
      "youtube": "YouTube",
      "tiktok": "TikTok",
      "linkedin": "LinkedIn",
    };
    const source = canonicalSources[explicitSource] || explicitSource;
    return {
      source,
      medium: explicitMedium || (campaign ? "campaign" : "referral"),
      campaign,
      content,
      term,
      referrerHost,
    };
  }

  if (!referrerHost || referrerHost === "coogsnation.com") {
    return {
      source: "CoogsNation Direct",
      medium: "direct",
      campaign,
      content,
      term,
      referrerHost,
    };
  }

  if (referrerHost === "redcougarrising.com") {
    return {
      source: "RedCougarRising.com",
      medium: "domain",
      campaign,
      content,
      term,
      referrerHost,
    };
  }

  const searchMap: Array<[RegExp, string]> = [
    [/(^|\.)google\./, "Google"],
    [/(^|\.)bing\.com$/, "Bing"],
    [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
    [/(^|\.)yahoo\./, "Yahoo"],
    [/(^|\.)baidu\.com$/, "Baidu"],
  ];
  for (const [pattern, source] of searchMap) {
    if (pattern.test(referrerHost)) {
      return { source, medium: "organic", campaign, content, term, referrerHost };
    }
  }

  const socialMap: Array<[RegExp, string]> = [
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, "Facebook"],
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)x\.com$|(^|\.)twitter\.com$/, "X"],
    [/(^|\.)reddit\.com$/, "Reddit"],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)linkedin\.com$/, "LinkedIn"],
  ];
  for (const [pattern, source] of socialMap) {
    if (pattern.test(referrerHost)) {
      return { source, medium: "social", campaign, content, term, referrerHost };
    }
  }

  return {
    source: referrerHost,
    medium: "referral",
    campaign,
    content,
    term,
    referrerHost,
  };
}

function isObviousBot(userAgent: unknown): boolean {
  const ua = typeof userAgent === "string" ? userAgent.toLowerCase() : "";
  return /(bot|crawler|spider|slurp|preview|headless|lighthouse|monitoring|uptime)/.test(ua);
}

function parseCookies(header: unknown): Record<string, string> {
  if (typeof header !== "string" || !header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

async function ensureVisitorAndSession(args: {
  visitorId: string;
  sessionId: string;
  userId: string | null;
  path: string;
  attribution: ClassifiedAttribution;
}): Promise<void> {
  const { visitorId, sessionId, userId, path, attribution } = args;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO ngf_analytics_visitors (
         visitor_id,
         first_source, first_medium, first_campaign, first_content, first_term,
         first_referrer_host, first_landing_path,
         last_source, last_medium, last_campaign, last_content, last_term,
         last_referrer_host, last_landing_path
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (visitor_id) DO UPDATE SET
         first_source = CASE
           WHEN ngf_analytics_visitors.first_source IS NULL OR ngf_analytics_visitors.first_source = 'Unknown'
             THEN EXCLUDED.first_source ELSE ngf_analytics_visitors.first_source END,
         first_medium = CASE
           WHEN ngf_analytics_visitors.first_medium IS NULL OR ngf_analytics_visitors.first_medium = 'unknown'
             THEN EXCLUDED.first_medium ELSE ngf_analytics_visitors.first_medium END,
         first_campaign = COALESCE(ngf_analytics_visitors.first_campaign, EXCLUDED.first_campaign),
         first_content = COALESCE(ngf_analytics_visitors.first_content, EXCLUDED.first_content),
         first_term = COALESCE(ngf_analytics_visitors.first_term, EXCLUDED.first_term),
         first_referrer_host = COALESCE(ngf_analytics_visitors.first_referrer_host, EXCLUDED.first_referrer_host),
         first_landing_path = COALESCE(ngf_analytics_visitors.first_landing_path, EXCLUDED.first_landing_path),
         last_seen_at = now(),
         last_source = EXCLUDED.last_source,
         last_medium = EXCLUDED.last_medium,
         last_campaign = EXCLUDED.last_campaign,
         last_content = EXCLUDED.last_content,
         last_term = EXCLUDED.last_term,
         last_referrer_host = EXCLUDED.last_referrer_host,
         last_landing_path = EXCLUDED.last_landing_path,
         updated_at = now()`,
      [
        visitorId,
        attribution.source,
        attribution.medium,
        attribution.campaign,
        attribution.content,
        attribution.term,
        attribution.referrerHost,
        path,
      ],
    );

    await client.query(
      `INSERT INTO ngf_analytics_sessions (
         session_id, visitor_id, user_id, landing_path,
         source, medium, campaign, content, term, referrer_host
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (session_id) DO UPDATE SET
         user_id = COALESCE(EXCLUDED.user_id, ngf_analytics_sessions.user_id),
         last_seen_at = now(),
         updated_at = now()`,
      [
        sessionId,
        visitorId,
        userId,
        path,
        attribution.source,
        attribution.medium,
        attribution.campaign,
        attribution.content,
        attribution.term,
        attribution.referrerHost,
      ],
    );

    if (userId) {
      await client.query(
        `UPDATE ngf_analytics_visitors
         SET member_user_id = COALESCE(member_user_id, $2), updated_at = now()
         WHERE visitor_id = $1`,
        [visitorId, userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function recordMembershipAnalyticsConversion(
  req: any,
  userId: string,
  eventType: "signup_completed" | "email_verified" | "member_activated",
): Promise<void> {
  try {
    const cookies = parseCookies(req?.headers?.cookie);
    let visitorId = cookies.ngf_vid || null;
    let sessionId = cookies.ngf_sid || null;

    if (visitorId && !idSchema.safeParse(visitorId).success) visitorId = null;
    if (sessionId && !idSchema.safeParse(sessionId).success) sessionId = null;

    if (!visitorId) {
      const existing = await pool.query(
        `SELECT visitor_id FROM ngf_analytics_visitors
         WHERE member_user_id = $1 ORDER BY last_seen_at DESC LIMIT 1`,
        [userId],
      );
      visitorId = existing.rows[0]?.visitor_id || null;
    }
    if (!visitorId) return;

    if (!sessionId) {
      const latestSession = await pool.query(
        `SELECT session_id FROM ngf_analytics_sessions
         WHERE visitor_id = $1 ORDER BY last_seen_at DESC LIMIT 1`,
        [visitorId],
      );
      sessionId = latestSession.rows[0]?.session_id || null;
    }

    const session = sessionId
      ? await pool.query(
          `SELECT source, medium, campaign, content, referrer_host
           FROM ngf_analytics_sessions WHERE session_id = $1 AND visitor_id = $2 LIMIT 1`,
          [sessionId, visitorId],
        )
      : { rows: [] as any[] };
    const touch = session.rows[0] || {};

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO ngf_analytics_visitors
           (visitor_id, first_source, first_medium, first_landing_path,
            last_source, last_medium, last_landing_path)
         VALUES ($1, 'Unknown', 'unknown', '/join', 'Unknown', 'unknown', '/join')
         ON CONFLICT (visitor_id) DO NOTHING`,
        [visitorId],
      );
      await client.query(
        `UPDATE ngf_analytics_visitors
         SET member_user_id = $2,
             converted_at = CASE WHEN $3 = 'signup_completed' THEN COALESCE(converted_at, now()) ELSE converted_at END,
             conversion_source = CASE WHEN $3 = 'signup_completed' THEN COALESCE(conversion_source, $4, last_source, first_source) ELSE conversion_source END,
             conversion_medium = CASE WHEN $3 = 'signup_completed' THEN COALESCE(conversion_medium, $5, last_medium, first_medium) ELSE conversion_medium END,
             conversion_campaign = CASE WHEN $3 = 'signup_completed' THEN COALESCE(conversion_campaign, $6, last_campaign, first_campaign) ELSE conversion_campaign END,
             conversion_content = CASE WHEN $3 = 'signup_completed' THEN COALESCE(conversion_content, $7, last_content, first_content) ELSE conversion_content END,
             conversion_referrer_host = CASE WHEN $3 = 'signup_completed' THEN COALESCE(conversion_referrer_host, $8, last_referrer_host, first_referrer_host) ELSE conversion_referrer_host END,
             last_seen_at = now(), updated_at = now()
         WHERE visitor_id = $1`,
        [
          visitorId,
          userId,
          eventType,
          touch.source || null,
          touch.medium || null,
          touch.campaign || null,
          touch.content || null,
          touch.referrer_host || null,
        ],
      );

      if (sessionId) {
        await client.query(
          `UPDATE ngf_analytics_sessions
           SET user_id = $2, last_seen_at = now(), updated_at = now()
           WHERE session_id = $1`,
          [sessionId, userId],
        );
      }

      await client.query(
        `INSERT INTO ngf_analytics_events
           (visitor_id, session_id, user_id, event_type, path, metadata)
         VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`,
        [visitorId, sessionId, userId, eventType, cleanPath(req?.path || "/join")],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[ANALYTICS] membership conversion recording failed:", error);
  }
}

function rangeSql(range: TrafficRange): string {
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

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

export async function buildMarketingTrafficAnalysis(
  query: MarketingTrafficQuery = {},
): Promise<Record<string, unknown>> {
  const range: TrafficRange =
    query.range === "7d" || query.range === "30d" || query.range === "year" || query.range === "custom"
      ? query.range
      : "today";

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const customStart = query.startDate && datePattern.test(query.startDate) ? query.startDate : null;
  const customEnd = query.endDate && datePattern.test(query.endDate) ? query.endDate : null;

  if (range === "custom" && (!customStart || !customEnd)) {
    throw new Error("Custom analytics range requires startDate and endDate in YYYY-MM-DD format");
  }

  const startExpr = range === "custom"
    ? `($1::date::timestamp AT TIME ZONE '${BUSINESS_TIME_ZONE}')`
    : rangeSql(range);
  const endExpr = range === "custom"
    ? `(($2::date + 1)::timestamp AT TIME ZONE '${BUSINESS_TIME_ZONE}')`
    : "now()";
  const params = range === "custom" ? [customStart, customEnd] : [];
  const bounds = `WITH bounds AS (SELECT ${startExpr} AS start_at, ${endExpr} AS end_at)`;

  const [overviewResult, funnelResult, sourceResult, campaignResult, landingResult, referrerResult, trendResult] =
    await Promise.all([
      pool.query(
        `${bounds},
         active_visitors AS (
           SELECT s.visitor_id, bool_or(s.user_id IS NOT NULL) AS has_member_session
           FROM ngf_analytics_sessions s, bounds b
           WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at
           GROUP BY s.visitor_id
         )
         SELECT
           (SELECT COUNT(*)::int FROM active_visitors) AS unique_visitors,
           (SELECT COUNT(*)::int FROM ngf_analytics_sessions s, bounds b
             WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at) AS sessions,
           (SELECT COUNT(*)::int FROM ngf_analytics_events e, bounds b
             WHERE e.event_type = 'pageview' AND e.occurred_at >= b.start_at AND e.occurred_at < b.end_at) AS pageviews,
           (SELECT COUNT(DISTINCT s.visitor_id)::int FROM ngf_analytics_sessions s
             WHERE s.last_seen_at >= now() - interval '${ONLINE_WINDOW_MINUTES} minutes') AS online_now,
           (SELECT COUNT(*)::int FROM active_visitors a
             JOIN ngf_analytics_visitors v ON v.visitor_id = a.visitor_id, bounds b
             WHERE v.first_seen_at >= b.start_at AND v.first_seen_at < b.end_at) AS new_visitors,
           (SELECT COUNT(*)::int FROM active_visitors a
             JOIN ngf_analytics_visitors v ON v.visitor_id = a.visitor_id, bounds b
             WHERE v.first_seen_at < b.start_at) AS returning_visitors,
           (SELECT COUNT(*)::int FROM active_visitors WHERE has_member_session = false) AS guests,
           (SELECT COUNT(*)::int FROM active_visitors WHERE has_member_session = true) AS members`,
        params,
      ),
      pool.query(
        `${bounds}
         SELECT
           (SELECT COUNT(DISTINCT s.visitor_id)::int FROM ngf_analytics_sessions s, bounds b
             WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at) AS visitors,
           (SELECT COUNT(DISTINCT e.visitor_id)::int FROM ngf_analytics_events e, bounds b
             WHERE e.event_type = 'signup_started' AND e.occurred_at >= b.start_at AND e.occurred_at < b.end_at) AS signup_started,
           (SELECT COUNT(DISTINCT v.visitor_id)::int FROM ngf_analytics_visitors v, bounds b
             WHERE v.converted_at >= b.start_at AND v.converted_at < b.end_at) AS signup_completed,
           (SELECT COUNT(DISTINCT v.visitor_id)::int FROM ngf_analytics_visitors v
             JOIN users u ON u.id = v.member_user_id, bounds b
             WHERE u.email_verified_at >= b.start_at AND u.email_verified_at < b.end_at) AS email_verified,
           (SELECT COUNT(DISTINCT v.visitor_id)::int FROM ngf_analytics_visitors v
             JOIN users u ON u.id = v.member_user_id, bounds b
             WHERE u.email_verified_at >= b.start_at AND u.email_verified_at < b.end_at
               AND u.account_status = 'active') AS active_members`,
        params,
      ),
      pool.query(
        `${bounds},
         traffic AS (
           SELECT COALESCE(NULLIF(s.source,''), 'Unknown') AS source,
                  COUNT(DISTINCT s.visitor_id)::int AS visitors, COUNT(*)::int AS sessions
           FROM ngf_analytics_sessions s, bounds b
           WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at
           GROUP BY COALESCE(NULLIF(s.source,''), 'Unknown')
         ),
         conversions AS (
           SELECT COALESCE(NULLIF(v.conversion_source,''), 'Unknown') AS source,
                  COUNT(DISTINCT v.visitor_id)::int AS signups,
                  COUNT(DISTINCT v.visitor_id) FILTER (WHERE u.email_verified_at IS NOT NULL)::int AS verified
           FROM ngf_analytics_visitors v
           LEFT JOIN users u ON u.id = v.member_user_id, bounds b
           WHERE v.converted_at >= b.start_at AND v.converted_at < b.end_at
           GROUP BY COALESCE(NULLIF(v.conversion_source,''), 'Unknown')
         )
         SELECT COALESCE(t.source,c.source) AS source,
                COALESCE(t.visitors,0)::int AS visitors,
                COALESCE(t.sessions,0)::int AS sessions,
                COALESCE(c.signups,0)::int AS signups,
                COALESCE(c.verified,0)::int AS verified
         FROM traffic t FULL OUTER JOIN conversions c ON c.source = t.source
         ORDER BY COALESCE(t.visitors,0) DESC, COALESCE(c.signups,0) DESC LIMIT 50`,
        params,
      ),
      pool.query(
        `${bounds},
         traffic AS (
           SELECT COALESCE(NULLIF(s.campaign,''), 'Unattributed') AS campaign,
                  COALESCE(NULLIF(s.source,''), 'Unknown') AS source,
                  COUNT(DISTINCT s.visitor_id)::int AS visitors, COUNT(*)::int AS sessions
           FROM ngf_analytics_sessions s, bounds b
           WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at
             AND s.campaign IS NOT NULL AND s.campaign <> ''
           GROUP BY s.campaign, s.source
         ),
         conversions AS (
           SELECT COALESCE(NULLIF(v.conversion_campaign,''), 'Unattributed') AS campaign,
                  COALESCE(NULLIF(v.conversion_source,''), 'Unknown') AS source,
                  COUNT(DISTINCT v.visitor_id)::int AS signups,
                  COUNT(DISTINCT v.visitor_id) FILTER (WHERE u.email_verified_at IS NOT NULL)::int AS verified
           FROM ngf_analytics_visitors v
           LEFT JOIN users u ON u.id = v.member_user_id, bounds b
           WHERE v.converted_at >= b.start_at AND v.converted_at < b.end_at
             AND v.conversion_campaign IS NOT NULL AND v.conversion_campaign <> ''
           GROUP BY v.conversion_campaign, v.conversion_source
         )
         SELECT COALESCE(t.campaign,c.campaign) AS campaign,
                COALESCE(t.source,c.source) AS source,
                COALESCE(t.visitors,0)::int AS visitors,
                COALESCE(t.sessions,0)::int AS sessions,
                COALESCE(c.signups,0)::int AS signups,
                COALESCE(c.verified,0)::int AS verified
         FROM traffic t FULL OUTER JOIN conversions c
           ON c.campaign = t.campaign AND c.source = t.source
         ORDER BY COALESCE(t.visitors,0) DESC, COALESCE(c.signups,0) DESC LIMIT 50`,
        params,
      ),
      pool.query(
        `${bounds}
         SELECT COALESCE(NULLIF(s.landing_path,''), '/') AS path,
                COUNT(DISTINCT s.visitor_id)::int AS visitors, COUNT(*)::int AS sessions
         FROM ngf_analytics_sessions s, bounds b
         WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at
         GROUP BY COALESCE(NULLIF(s.landing_path,''), '/')
         ORDER BY visitors DESC, sessions DESC LIMIT 20`,
        params,
      ),
      pool.query(
        `${bounds}
         SELECT COALESCE(NULLIF(s.referrer_host,''), 'Direct / none') AS referrer,
                COUNT(DISTINCT s.visitor_id)::int AS visitors, COUNT(*)::int AS sessions
         FROM ngf_analytics_sessions s, bounds b
         WHERE s.last_seen_at >= b.start_at AND s.started_at < b.end_at
         GROUP BY COALESCE(NULLIF(s.referrer_host,''), 'Direct / none')
         ORDER BY visitors DESC, sessions DESC LIMIT 20`,
        params,
      ),
      pool.query(
        `WITH months AS (
           SELECT generate_series(
             date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '11 months',
             date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'),
             interval '1 month'
           ) AS month_local
         ),
         monthly_sessions AS (
           SELECT date_trunc('month', s.started_at AT TIME ZONE '${BUSINESS_TIME_ZONE}') AS month_local,
                  COUNT(DISTINCT s.visitor_id)::int AS visitors, COUNT(*)::int AS sessions
           FROM ngf_analytics_sessions s
           WHERE s.started_at >= ((date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '11 months') AT TIME ZONE '${BUSINESS_TIME_ZONE}')
           GROUP BY 1
         ),
         monthly_pageviews AS (
           SELECT date_trunc('month', e.occurred_at AT TIME ZONE '${BUSINESS_TIME_ZONE}') AS month_local,
                  COUNT(*)::int AS pageviews
           FROM ngf_analytics_events e
           WHERE e.event_type = 'pageview'
             AND e.occurred_at >= ((date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '11 months') AT TIME ZONE '${BUSINESS_TIME_ZONE}')
           GROUP BY 1
         ),
         monthly_signups AS (
           SELECT date_trunc('month', v.converted_at AT TIME ZONE '${BUSINESS_TIME_ZONE}') AS month_local,
                  COUNT(DISTINCT v.visitor_id)::int AS signups
           FROM ngf_analytics_visitors v
           WHERE v.converted_at IS NOT NULL
             AND v.converted_at >= ((date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '11 months') AT TIME ZONE '${BUSINESS_TIME_ZONE}')
           GROUP BY 1
         ),
         monthly_verified AS (
           SELECT date_trunc('month', u.email_verified_at AT TIME ZONE '${BUSINESS_TIME_ZONE}') AS month_local,
                  COUNT(DISTINCT v.visitor_id)::int AS verified
           FROM ngf_analytics_visitors v JOIN users u ON u.id = v.member_user_id
           WHERE u.email_verified_at IS NOT NULL
             AND u.email_verified_at >= ((date_trunc('month', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}') - interval '11 months') AT TIME ZONE '${BUSINESS_TIME_ZONE}')
           GROUP BY 1
         )
         SELECT to_char(m.month_local,'YYYY-MM') AS month, to_char(m.month_local,'Mon') AS label,
                COALESCE(s.visitors,0)::int AS visitors,
                COALESCE(s.sessions,0)::int AS sessions,
                COALESCE(p.pageviews,0)::int AS pageviews,
                COALESCE(g.signups,0)::int AS signups,
                COALESCE(v.verified,0)::int AS verified
         FROM months m
         LEFT JOIN monthly_sessions s USING (month_local)
         LEFT JOIN monthly_pageviews p USING (month_local)
         LEFT JOIN monthly_signups g USING (month_local)
         LEFT JOIN monthly_verified v USING (month_local)
         ORDER BY m.month_local`,
      ),
    ]);

  const overviewRow = overviewResult.rows[0] || {};
  const funnelRow = funnelResult.rows[0] || {};
  const visitors = Number(funnelRow.visitors || 0);
  const signupCompleted = Number(funnelRow.signup_completed || 0);
  const emailVerified = Number(funnelRow.email_verified || 0);

  const sources = sourceResult.rows.map((row) => {
    const sourceVisitors = Number(row.visitors || 0);
    const signups = Number(row.signups || 0);
    return {
      source: row.source, visitors: sourceVisitors, sessions: Number(row.sessions || 0),
      signups, verified: Number(row.verified || 0), conversionRate: percent(signups, sourceVisitors),
    };
  });

  const campaigns = campaignResult.rows.map((row) => {
    const campaignVisitors = Number(row.visitors || 0);
    const signups = Number(row.signups || 0);
    return {
      campaign: row.campaign, source: row.source, visitors: campaignVisitors,
      sessions: Number(row.sessions || 0), signups, verified: Number(row.verified || 0),
      conversionRate: percent(signups, campaignVisitors),
    };
  });

  const trend = trendResult.rows.map((row) => ({
    month: row.month, label: row.label, visitors: Number(row.visitors || 0),
    sessions: Number(row.sessions || 0), pageviews: Number(row.pageviews || 0),
    signups: Number(row.signups || 0), verified: Number(row.verified || 0),
    visitorToSignupRate: percent(Number(row.signups || 0), Number(row.visitors || 0)),
  }));

  return {
    generatedAt: new Date().toISOString(),
    timeZone: BUSINESS_TIME_ZONE,
    range,
    startDate: customStart,
    endDate: customEnd,
    overview: {
      uniqueVisitors: Number(overviewRow.unique_visitors || 0),
      sessions: Number(overviewRow.sessions || 0),
      pageviews: Number(overviewRow.pageviews || 0),
      onlineNow: Number(overviewRow.online_now || 0),
      newVisitors: Number(overviewRow.new_visitors || 0),
      returningVisitors: Number(overviewRow.returning_visitors || 0),
      guests: Number(overviewRow.guests || 0),
      members: Number(overviewRow.members || 0),
    },
    funnel: {
      visitors,
      signupStarted: Number(funnelRow.signup_started || 0),
      signupCompleted,
      emailVerified,
      activeMembers: Number(funnelRow.active_members || 0),
      visitorToSignupRate: percent(signupCompleted, visitors),
      signupToVerifiedRate: percent(emailVerified, signupCompleted),
      visitorToVerifiedRate: percent(emailVerified, visitors),
    },
    sources,
    campaigns,
    topLandingPages: landingResult.rows.map((row) => ({
      path: row.path, visitors: Number(row.visitors || 0), sessions: Number(row.sessions || 0),
    })),
    topReferrers: referrerResult.rows.map((row) => ({
      referrer: row.referrer, visitors: Number(row.visitors || 0), sessions: Number(row.sessions || 0),
    })),
    trend,
  };
}

export function registerTrafficAnalyticsRoutes(app: Express): void {
  const ingestLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/analytics/event", ingestLimiter, async (req: any, res) => {
    try {
      if (isObviousBot(req.get?.("user-agent"))) {
        return res.status(202).json({ accepted: true, botFiltered: true });
      }

      const actor = req.user as { id?: string; role?: string } | undefined;
      if (actor?.role === "admin") {
        return res.status(202).json({ accepted: true, adminFiltered: true });
      }

      const input = publicAnalyticsEventSchema.parse(req.body);
      const path = cleanPath(input.path);
      if (path.startsWith("/admin")) {
        return res.status(202).json({ accepted: true, adminPathFiltered: true });
      }

      const attribution = classifyAttribution(input.attribution);
      const userId = typeof actor?.id === "string" ? actor.id : null;

      await ensureVisitorAndSession({
        visitorId: input.visitorId,
        sessionId: input.sessionId,
        userId,
        path,
        attribution,
      });

      if (input.eventType !== "heartbeat") {
        await pool.query(
          `INSERT INTO ngf_analytics_events
             (visitor_id, session_id, user_id, event_type, path, metadata)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
          [
            input.visitorId,
            input.sessionId,
            userId,
            input.eventType,
            path,
            JSON.stringify(input.title ? { title: input.title.slice(0, 300) } : {}),
          ],
        );
      }

      return res.status(202).json({ accepted: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid analytics event" });
      }
      console.error("[ANALYTICS] event ingestion failed:", error);
      return res.status(202).json({ accepted: false });
    }
  });

  app.get("/api/admin/marketing-traffic", requireAdmin, async (req, res) => {
    try {
      const range = z.enum(["today", "7d", "30d", "year", "custom"])
        .default("today")
        .parse(req.query.range ?? "today");
      const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
      return res.json(await buildMarketingTrafficAnalysis({ range, startDate, endDate }));
    } catch (error) {
      console.error("[ANALYTICS] admin marketing traffic query failed:", error);
      return res.status(400).json({ message: "Unable to load marketing traffic analysis" });
    }
  });
}
