import type { Express } from "express";
import { pool } from "./db";
import { requireAdmin } from "./auth";
import { getCommerceService } from "./commerce/service";
import { sportsFactsEngine } from "./sports/engine";

const BUSINESS_TIME_ZONE = "America/Chicago";

type CommerceScope = "all" | "affiliate";
type TrendGrain = "day" | "week" | "month";

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function tableExists(name: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT to_regclass($1) AS relation_name",
    [`public.${name}`],
  );
  return Boolean(result.rows[0]?.relation_name);
}

function providerForScope(scope: CommerceScope): string | null {
  return scope === "affiliate" ? "affiliate" : null;
}

const TREND_CONFIG: Record<
  TrendGrain,
  { lookback: string; step: string; label: string }
> = {
  day: { lookback: "34 days", step: "1 day", label: "Mon DD" },
  week: { lookback: "4 weeks", step: "1 week", label: "Mon DD" },
  month: { lookback: "5 months", step: "1 month", label: "Mon YYYY" },
};

async function loadTrendGrain(scope: CommerceScope, grain: TrendGrain) {
  const provider = providerForScope(scope);
  const config = TREND_CONFIG[grain];

  const result = await pool.query(
    `
      WITH buckets AS (
        SELECT
          gs AS bucket_local,
          gs AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS start_at,
          (gs + interval '${config.step}')
            AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS end_at
        FROM generate_series(
          date_trunc('${grain}', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}')
            - interval '${config.lookback}',
          date_trunc('${grain}', now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'),
          interval '${config.step}'
        ) AS gs
      )
      SELECT
        to_char(bucket_local, 'YYYY-MM-DD') AS bucket,
        to_char(bucket_local, '${config.label}') AS label,

        (
          SELECT COUNT(*)::int
          FROM commerce_click_events c
          WHERE c.created_at >= b.start_at
            AND c.created_at < b.end_at
            AND ($1::text IS NULL OR c.provider = $1)
        ) AS clicks,

        (
          SELECT COUNT(*)::int
          FROM commerce_inquiries i
          WHERE i.created_at >= b.start_at
            AND i.created_at < b.end_at
            AND (
              $1::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM commerce_click_events c2
                WHERE c2.provider = $1
                  AND c2.merchant = i.merchant
              )
            )
        ) AS inquiries

      FROM buckets b
      ORDER BY bucket_local
    `,
    [provider],
  );

  return result.rows.map((row: any) => ({
    bucket: String(row.bucket || ""),
    label: String(row.label || ""),
    clicks: num(row.clicks),
    inquiries: num(row.inquiries),
  }));
}

async function loadCommerceTrend(scope: CommerceScope) {
  const [daily, weekly, monthly] = await Promise.all([
    loadTrendGrain(scope, "day"),
    loadTrendGrain(scope, "week"),
    loadTrendGrain(scope, "month"),
  ]);

  return { daily, weekly, monthly };
}

async function loadCommerceSummary(scope: CommerceScope) {
  const provider = providerForScope(scope);

  const result = await pool.query(
    `
      WITH month_bounds AS (
        SELECT
          date_trunc(
            'month',
            now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'
          ) AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS month_start
      )
      SELECT
        (
          SELECT COUNT(*)::int
          FROM commerce_click_events c, month_bounds b
          WHERE c.created_at >= b.month_start
            AND ($1::text IS NULL OR c.provider = $1)
        ) AS month_clicks,

        (
          SELECT COUNT(DISTINCT c.user_id)::int
          FROM commerce_click_events c, month_bounds b
          WHERE c.created_at >= b.month_start
            AND c.user_id IS NOT NULL
            AND ($1::text IS NULL OR c.provider = $1)
        ) AS member_clickers,

        (
          SELECT COUNT(DISTINCT c.merchant)::int
          FROM commerce_click_events c, month_bounds b
          WHERE c.created_at >= b.month_start
            AND ($1::text IS NULL OR c.provider = $1)
        ) AS tracked_merchants,

        (
          SELECT COUNT(*)::int
          FROM commerce_inquiries i, month_bounds b
          WHERE i.created_at >= b.month_start
            AND (
              $1::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM commerce_click_events c2
                WHERE c2.provider = $1
                  AND c2.merchant = i.merchant
              )
            )
        ) AS month_inquiries,

        (
          SELECT COUNT(*)::int
          FROM commerce_inquiries i
          WHERE i.status = 'new'
            AND (
              $1::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM commerce_click_events c2
                WHERE c2.provider = $1
                  AND c2.merchant = i.merchant
              )
            )
        ) AS open_inquiries,

        (
          SELECT COUNT(*)::int
          FROM commerce_click_events c
          WHERE $1::text IS NULL OR c.provider = $1
        ) AS lifetime_clicks
    `,
    [provider],
  );

  const row = result.rows[0] || {};

  return {
    monthClicks: num(row.month_clicks),
    memberClickers: num(row.member_clickers),
    trackedMerchants: num(row.tracked_merchants),
    monthInquiries: num(row.month_inquiries),
    openInquiries: num(row.open_inquiries),
    lifetimeClicks: num(row.lifetime_clicks),
  };
}

async function loadMerchantPerformance(scope: CommerceScope) {
  const provider = providerForScope(scope);

  const result = await pool.query(
    `
      WITH month_bounds AS (
        SELECT
          date_trunc(
            'month',
            now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'
          ) AT TIME ZONE '${BUSINESS_TIME_ZONE}' AS month_start
      ),
      click_stats AS (
        SELECT
          c.merchant,
          c.provider,
          c.purchase_mode,
          COUNT(*)::int AS clicks,
          COUNT(DISTINCT c.user_id) FILTER (
            WHERE c.user_id IS NOT NULL
          )::int AS member_clickers
        FROM commerce_click_events c, month_bounds b
        WHERE c.created_at >= b.month_start
          AND ($1::text IS NULL OR c.provider = $1)
        GROUP BY c.merchant, c.provider, c.purchase_mode
      ),
      inquiry_stats AS (
        SELECT
          i.merchant,
          COUNT(*)::int AS inquiries,
          COUNT(*) FILTER (WHERE i.status = 'new')::int AS open_inquiries
        FROM commerce_inquiries i, month_bounds b
        WHERE i.created_at >= b.month_start
        GROUP BY i.merchant
      )
      SELECT
        cs.merchant,
        cs.provider,
        cs.purchase_mode,
        cs.clicks,
        cs.member_clickers,
        COALESCE(ins.inquiries, 0)::int AS inquiries,
        COALESCE(ins.open_inquiries, 0)::int AS open_inquiries
      FROM click_stats cs
      LEFT JOIN inquiry_stats ins
        ON ins.merchant = cs.merchant
      ORDER BY cs.clicks DESC, cs.merchant
      LIMIT 30
    `,
    [provider],
  );

  return result.rows.map((row: any) => ({
    merchant: row.merchant || "Unknown",
    provider: row.provider || "Unknown",
    purchaseMode: row.purchase_mode || "Unknown",
    clicks: num(row.clicks),
    memberClickers: num(row.member_clickers),
    inquiries: num(row.inquiries),
    openInquiries: num(row.open_inquiries),
  }));
}

async function loadCommercePanel(scope: CommerceScope) {
  const [clickTable, inquiryTable] = await Promise.all([
    tableExists("commerce_click_events"),
    tableExists("commerce_inquiries"),
  ]);

  if (!clickTable || !inquiryTable) {
    return {
      available: false,
      summary: {
        monthClicks: 0,
        memberClickers: 0,
        trackedMerchants: 0,
        monthInquiries: 0,
        openInquiries: 0,
        lifetimeClicks: 0,
      },
      trend: { daily: [], weekly: [], monthly: [] },
      merchants: [],
    };
  }

  const [summary, trend, merchants] = await Promise.all([
    loadCommerceSummary(scope),
    loadCommerceTrend(scope),
    loadMerchantPerformance(scope),
  ]);

  return {
    available: true,
    summary,
    trend,
    merchants,
  };
}

function commerceCapabilities() {
  try {
    return getCommerceService()
      .capabilities()
      .map((capability: any) => ({
        provider: capability.provider,
        configured: Boolean(capability.configured),
        productDiscovery: Boolean(capability.productDiscovery),
        directCheckout: Boolean(capability.directCheckout),
        affiliateRedirect: Boolean(capability.affiliateRedirect),
        inquiries: Boolean(capability.inquiries),
        note: capability.note || "",
      }));
  } catch (error) {
    console.error("[CONTROL ROOM] Commerce capability check failed:", error);
    return [];
  }
}


async function loadGetEmPanel() {
  const requiredTables = [
    "getem_contests",
    "getem_contest_members",
    "getem_games",
    "getem_picks",
    "getem_rank_history",
  ];

  const exists = await Promise.all(
    requiredTables.map((table) => tableExists(table)),
  );

  if (!exists.every(Boolean)) {
    return {
      engineConnected: false,
      contests: {
        upcoming: null,
        live: null,
        closed: null,
        awaitingResults: null,
      },
      participation: {
        totalPlayers: null,
        activePlayers: null,
        returningPlayers: null,
        picksSubmitted: null,
        completionRate: null,
        correctPickRate: null,
      },
      dataFeedStatus: "Get'em database tables unavailable",
      auditStatus: "Engine unavailable",
    };
  }

  const result = await pool.query(`
    WITH
    contest_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')::int AS upcoming,
        COUNT(*) FILTER (WHERE status = 'live')::int AS live,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
        COUNT(*) FILTER (WHERE status = 'locked')::int AS awaiting_results
      FROM getem_contests
    ),

    participation_stats AS (
      SELECT
        COUNT(DISTINCT m.user_id)::int AS total_players,
        COUNT(DISTINCT m.user_id)
          FILTER (
            WHERE c.status IN ('open', 'locked', 'live')
          )::int AS active_players
      FROM getem_contest_members m
      JOIN getem_contests c
        ON c.id = m.contest_id
    ),

    returning_stats AS (
      SELECT COUNT(*)::int AS returning_players
      FROM (
        SELECT user_id
        FROM getem_contest_members
        GROUP BY user_id
        HAVING COUNT(DISTINCT contest_id) >= 2
      ) returning
    ),

    pick_stats AS (
      SELECT COUNT(*)::int AS picks_submitted
      FROM getem_picks
    ),

    expected_picks AS (
      SELECT
        COALESCE(
          SUM(member_count * game_count),
          0
        )::bigint AS expected_total
      FROM (
        SELECT
          c.id,
          (
            SELECT COUNT(*)
            FROM getem_contest_members m
            WHERE m.contest_id = c.id
          ) AS member_count,
          (
            SELECT COUNT(*)
            FROM getem_games g
            WHERE g.contest_id = c.id
          ) AS game_count
        FROM getem_contests c
        WHERE c.status IN ('open', 'locked', 'live')
      ) counts
    )

    SELECT
      cs.upcoming,
      cs.live,
      cs.closed,
      cs.awaiting_results,
      ps.total_players,
      ps.active_players,
      rs.returning_players,
      pk.picks_submitted,
      ep.expected_total
    FROM contest_stats cs
    CROSS JOIN participation_stats ps
    CROSS JOIN returning_stats rs
    CROSS JOIN pick_stats pk
    CROSS JOIN expected_picks ep
  `);

  const row = result.rows[0] || {};

  const picksSubmitted = num(row.picks_submitted);
  const expectedTotal = num(row.expected_total);

  const completionRate =
    expectedTotal > 0
      ? Math.round((picksSubmitted / expectedTotal) * 1000) / 10
      : null;

  const sportsSnapshot = sportsFactsEngine.snapshot();
  const sportsGameCount = sportsSnapshot.games.length;

  return {
    engineConnected: true,

    contests: {
      upcoming: num(row.upcoming),
      live: num(row.live),
      closed: num(row.closed),
      awaitingResults: num(row.awaiting_results),
    },

    participation: {
      totalPlayers: num(row.total_players),
      activePlayers: num(row.active_players),
      returningPlayers: num(row.returning_players),
      picksSubmitted,
      completionRate,

      // Cannot calculate honestly until scored-result state exists.
      correctPickRate: null,
    },

    dataFeedStatus:
      sportsGameCount > 0
        ? `Connected • ${sportsGameCount} games in NGF sports feed`
        : "Connected • no games currently loaded",

    auditStatus:
      "Get'em database connected • scoring audit ledger pending",
  };
}

export function registerBusinessControlPanelRoutes(app: Express): void {
  app.get(
    "/api/admin/business-control-panels",
    requireAdmin,
    async (_req: any, res) => {
      try {
        const [merchandise, affiliate] = await Promise.all([
          loadCommercePanel("all"),
          loadCommercePanel("affiliate"),
        ]);

        let getem;

        try {
          getem = await loadGetEmPanel();
        } catch (error) {
          console.error("[CONTROL ROOM] Get'em metrics failed:", error);

          getem = {
            engineConnected: false,
            contests: {
              upcoming: null,
              live: null,
              closed: null,
              awaitingResults: null,
            },
            participation: {
              totalPlayers: null,
              activePlayers: null,
              returningPlayers: null,
              picksSubmitted: null,
              completionRate: null,
              correctPickRate: null,
            },
            dataFeedStatus: "Get'em metrics temporarily unavailable",
            auditStatus: "Get'em metrics error isolated from business panels",
          };
        }

        return res.json({
          generatedAt: new Date().toISOString(),
          businessTimeZone: BUSINESS_TIME_ZONE,
          capabilities: commerceCapabilities(),

          merchandise: {
            ...merchandise,
            financialFeedConnected: false,
            financials: {
              grossSales: null,
              orders: null,
              unitsSold: null,
              averageOrderValue: null,
              grossProfit: null,
              grossMargin: null,
              shippingCost: null,
              discounts: null,
              refunds: null,
              netRevenue: null,
              netMargin: null,
              repeatCustomers: null,
            },
          },

          affiliate: {
            ...affiliate,
            commissionFeedConnected: false,
            economics: {
              transactions: null,
              grossTransactionValue: null,
              commissionEarned: null,
              effectiveCommissionRate: null,
              earningsPerClick: null,
              purchaseConversionRate: null,
              pendingCommissions: null,
              approvedCommissions: null,
              paidCommissions: null,
              clawbacks: null,
            },
          },

          getem,
        });
      } catch (error) {
        console.error("[CONTROL ROOM] Business panels query failed:", error);
        return res.status(500).json({
          message: "Unable to load business control panels",
        });
      }
    },
  );
}
