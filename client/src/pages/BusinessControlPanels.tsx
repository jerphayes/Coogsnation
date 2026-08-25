import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  BadgeDollarSign,
  CircleDollarSign,
  ClipboardList,
  Handshake,
  Link2,
  MousePointerClick,
  Package,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrendPoint {
  bucket: string;
  label: string;
  clicks: number;
  inquiries: number;
}

interface CommerceTrend {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  monthly: TrendPoint[];
}

interface MerchantRow {
  merchant: string;
  provider: string;
  purchaseMode: string;
  clicks: number;
  memberClickers: number;
  inquiries: number;
  openInquiries: number;
}

interface CommerceSummary {
  monthClicks: number;
  memberClickers: number;
  trackedMerchants: number;
  monthInquiries: number;
  openInquiries: number;
  lifetimeClicks: number;
}

interface CommercePanel {
  available: boolean;
  summary: CommerceSummary;
  trend: CommerceTrend;
  merchants: MerchantRow[];
}

interface BusinessControlData {
  generatedAt: string;
  capabilities: Array<{
    provider: string;
    configured: boolean;
    productDiscovery: boolean;
    directCheckout: boolean;
    affiliateRedirect: boolean;
    inquiries: boolean;
    note: string;
  }>;

  merchandise: CommercePanel & {
    financialFeedConnected: boolean;
    financials: Record<string, number | null>;
  };

  affiliate: CommercePanel & {
    commissionFeedConnected: boolean;
    economics: Record<string, number | null>;
  };

  getem: {
    engineConnected: boolean;
    contests: Record<string, number | null>;
    participation: Record<string, number | null>;
    dataFeedStatus: string;
    auditStatus: string;
  };
}

const formatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return formatter.format(Number.isFinite(value) ? value : 0);
}

function formatDelta(current: number, previous: number | null): string {
  if (previous === null || previous === 0) return "—";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
}

function UpdatedStamp({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <span className="text-xs text-white/70">
      Updated{" "}
      {date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}

function MetricTile({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: number | string | null | undefined;
  note: string;
  icon: any;
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? formatNumber(value)
        : value;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            {title}
          </div>
          <Icon className="h-4 w-4 text-red-600" />
        </div>
        <div className="mt-2 text-3xl font-bold">{display}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
}

function TrendPane({
  title,
  dataKey,
  trend,
  icon: Icon,
}: {
  title: string;
  dataKey: "clicks" | "inquiries";
  trend: CommerceTrend;
  icon: any;
}) {
  const weekly = trend.weekly.slice(-5);
  const padding = Math.max(0, 5 - weekly.length);
  const slots: Array<TrendPoint | null> = [
    ...Array.from({ length: padding }, () => null),
    ...weekly,
  ];
  const monthly = trend.monthly.slice(-3);
  const current = weekly.length
    ? weekly[weekly.length - 1][dataKey]
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              {title}
            </div>
            <div className="mt-1 text-3xl font-bold">
              {formatNumber(current)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Current week
            </div>
          </div>
          <Icon className="h-4 w-4 text-red-600" />
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase text-muted-foreground">
            <span>Weekly</span>
            <span>W5 = current week</span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {slots.map((point, index) => {
              const sourceIndex = index - padding;
              const previous =
                sourceIndex > 0 ? weekly[sourceIndex - 1] : null;
              const value = point ? point[dataKey] : null;

              return (
                <div
                  key={`w-${index}`}
                  className="rounded border px-1 py-2 text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    W{index + 1}
                  </div>
                  <div className="mt-1 text-xs font-bold">
                    {value === null ? "—" : formatNumber(value)}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {value === null
                      ? "—"
                      : formatDelta(
                          value,
                          previous ? previous[dataKey] : null,
                        )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">
            Monthly rollup
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
            {monthly.map((point, index) => {
              const globalIndex =
                trend.monthly.length - monthly.length + index;
              const previous =
                globalIndex > 0
                  ? trend.monthly[globalIndex - 1]
                  : null;
              return (
                <span key={point.bucket}>
                  <strong>{point.label}</strong>{" "}
                  {formatNumber(point[dataKey])}{" "}
                  <span className="text-muted-foreground">
                    {formatDelta(
                      point[dataKey],
                      previous ? previous[dataKey] : null,
                    )}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          {trend.daily.length >= 2 ? (
            <div className="h-[100px] text-red-700">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend.daily}
                  margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
                >
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                    tick={{ fontSize: 9 }}
                    height={18}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="currentColor"
                    fill="currentColor"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-3 text-center text-xs text-muted-foreground">
              Trend begins after additional daily history is collected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MerchantPerformanceTable({
  rows,
  affiliateOnly = false,
}: {
  rows: MerchantRow[];
  affiliateOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {affiliateOnly
            ? "Performance by Partner"
            : "Merchant / Provider Performance"}
        </CardTitle>
        <CardDescription>
          Current-month tracked traffic and inquiries.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Inquiries</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={`${row.provider}:${row.merchant}:${row.purchaseMode}`}
                >
                  <TableCell className="font-medium">
                    {row.merchant}
                  </TableCell>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell>{row.purchaseMode}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.clicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.memberClickers)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.inquiries)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.openInquiries)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No tracked activity yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function useBusinessControlData() {
  return useQuery<BusinessControlData>({
    queryKey: ["/api/admin/business-control-panels"],
    queryFn: async () => {
      const response = await fetch("/api/admin/business-control-panels", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Business panel request failed (${response.status})`);
      }
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

function LoadingPanel() {
  return (
    <Card>
      <CardContent className="p-8 text-sm text-muted-foreground">
        Loading Control Room business data…
      </CardContent>
    </Card>
  );
}

function ErrorPanel() {
  return (
    <Card>
      <CardContent className="p-8 text-sm text-destructive">
        Unable to load this Control Room panel.
      </CardContent>
    </Card>
  );
}

export function MerchandiseSalesPanel() {
  const query = useBusinessControlData();
  if (query.isLoading) return <LoadingPanel />;
  if (query.isError || !query.data) return <ErrorPanel />;

  const data = query.data;
  const panel = data.merchandise;
  const f = panel.financials;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Merchandise & Sales</h2>
          <p className="text-sm text-white/70">
            Product traffic, customer intent, sales economics and merchant
            performance.
          </p>
        </div>
        <UpdatedStamp value={data.generatedAt} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Gross Sales"
          value={f.grossSales}
          note="Order financial feed not connected"
          icon={CircleDollarSign}
        />
        <MetricTile
          title="Orders"
          value={f.orders}
          note="Order feed not connected"
          icon={ShoppingCart}
        />
        <MetricTile
          title="Units Sold"
          value={f.unitsSold}
          note="Order-line feed not connected"
          icon={Package}
        />
        <MetricTile
          title="Average Order Value"
          value={f.averageOrderValue}
          note="Calculated when order data arrives"
          icon={BadgeDollarSign}
        />
        <MetricTile
          title="Gross Profit"
          value={f.grossProfit}
          note="Requires product/vendor cost"
          icon={CircleDollarSign}
        />
        <MetricTile
          title="Gross Margin %"
          value={f.grossMargin}
          note="Requires revenue and cost"
          icon={BadgeDollarSign}
        />
        <MetricTile
          title="Net Revenue"
          value={f.netRevenue}
          note="Requires sales/refund feed"
          icon={CircleDollarSign}
        />
        <MetricTile
          title="Repeat Customers"
          value={f.repeatCustomers}
          note="Requires transaction identity feed"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendPane
          title="Store / Product Clicks"
          dataKey="clicks"
          trend={panel.trend}
          icon={MousePointerClick}
        />
        <TrendPane
          title="Product Inquiries"
          dataKey="inquiries"
          trend={panel.trend}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Clicks This Month"
          value={panel.summary.monthClicks}
          note={`${formatNumber(panel.summary.lifetimeClicks)} lifetime tracked`}
          icon={MousePointerClick}
        />
        <MetricTile
          title="Member Clickers"
          value={panel.summary.memberClickers}
          note="Signed-in users clicking merchandise"
          icon={Users}
        />
        <MetricTile
          title="Tracked Merchants"
          value={panel.summary.trackedMerchants}
          note="Merchants with activity this month"
          icon={ShoppingCart}
        />
        <MetricTile
          title="Open Inquiries"
          value={panel.summary.openInquiries}
          note={`${formatNumber(panel.summary.monthInquiries)} created this month`}
          icon={ClipboardList}
        />
      </div>

      <MerchantPerformanceTable rows={panel.merchants} />
    </div>
  );
}

export function AffiliatePartnersPanel() {
  const query = useBusinessControlData();
  if (query.isLoading) return <LoadingPanel />;
  if (query.isError || !query.data) return <ErrorPanel />;

  const data = query.data;
  const panel = data.affiliate;
  const e = panel.economics;
  const affiliateCapability = data.capabilities.find(
    (item) => item.provider === "affiliate",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Affiliate & Partners Analysis
          </h2>
          <p className="text-sm text-white/70">
            Partner traffic, referrals, conversions, commissions and program
            economics.
          </p>
        </div>
        <UpdatedStamp value={data.generatedAt} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Affiliate catalog</div>
            <div className="text-xs text-muted-foreground">
              {affiliateCapability?.note ||
                "Affiliate provider status unavailable."}
            </div>
          </div>
          <Badge
            variant={
              affiliateCapability?.configured ? "default" : "secondary"
            }
          >
            {affiliateCapability?.configured
              ? "Configured"
              : "Not configured"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Tracked Partners"
          value={panel.summary.trackedMerchants}
          note="Partners with activity this month"
          icon={Handshake}
        />
        <MetricTile
          title="Clicks Sent"
          value={panel.summary.monthClicks}
          note={`${formatNumber(panel.summary.lifetimeClicks)} lifetime affiliate clicks`}
          icon={Link2}
        />
        <MetricTile
          title="Member Clickers"
          value={panel.summary.memberClickers}
          note="Signed-in referred users"
          icon={Users}
        />
        <MetricTile
          title="Partner Inquiries"
          value={panel.summary.monthInquiries}
          note={`${formatNumber(panel.summary.openInquiries)} still open`}
          icon={ClipboardList}
        />

        <MetricTile
          title="Transactions"
          value={e.transactions}
          note="Partner conversion feed not connected"
          icon={ShoppingCart}
        />
        <MetricTile
          title="Commission Earned"
          value={e.commissionEarned}
          note="Commission ledger not connected"
          icon={CircleDollarSign}
        />
        <MetricTile
          title="Earnings Per Click"
          value={e.earningsPerClick}
          note="Available when commissions arrive"
          icon={BadgeDollarSign}
        />
        <MetricTile
          title="Pending Commissions"
          value={e.pendingCommissions}
          note="Partner payout feed not connected"
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendPane
          title="Affiliate Clicks"
          dataKey="clicks"
          trend={panel.trend}
          icon={Link2}
        />
        <TrendPane
          title="Affiliate Inquiries"
          dataKey="inquiries"
          trend={panel.trend}
          icon={ClipboardList}
        />
      </div>

      <MerchantPerformanceTable
        rows={panel.merchants}
        affiliateOnly
      />
    </div>
  );
}

const GETEM_CONTROLS = [
  "Create contest",
  "Schedule games",
  "Open / close picks",
  "Lock deadlines",
  "Correct / void games",
  "Score contests",
  "Rules / point values",
  "Tie breakers",
  "Leaderboards / badges",
  "Admin overrides",
  "Data-feed status",
  "Audit history",
];

export function GetEmControlPanel() {
  const query = useBusinessControlData();
  if (query.isLoading) return <LoadingPanel />;
  if (query.isError || !query.data) return <ErrorPanel />;

  const data = query.data;
  const getem = data.getem;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Get’em / Pick’em Control</h2>
          <p className="text-sm text-white/70">
            Contest operations, participation, scoring, retention and
            conversion control.
          </p>
        </div>
        <UpdatedStamp value={data.generatedAt} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Get’em engine status</div>
            <div className="text-xs text-muted-foreground">
              The Control Room panel is installed. Contest/game tables and
              operational routes have not yet been connected.
            </div>
          </div>
          <Badge variant="secondary">
            {getem.engineConnected
              ? "Engine connected"
              : "Waiting for engine"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Upcoming Contests"
          value={getem.contests.upcoming}
          note="Available after contest engine connection"
          icon={Trophy}
        />
        <MetricTile
          title="Live Contests"
          value={getem.contests.live}
          note="Available after contest engine connection"
          icon={Trophy}
        />
        <MetricTile
          title="Active Players"
          value={getem.participation.activePlayers}
          note="Participation feed not connected"
          icon={Users}
        />
        <MetricTile
          title="Picks Submitted"
          value={getem.participation.picksSubmitted}
          note="Pick ledger not connected"
          icon={ClipboardList}
        />
        <MetricTile
          title="Returning Players"
          value={getem.participation.returningPlayers}
          note="Retention calculation pending"
          icon={Users}
        />
        <MetricTile
          title="Completion %"
          value={getem.participation.completionRate}
          note="Submitted picks ÷ contest entrants"
          icon={Trophy}
        />
        <MetricTile
          title="Correct Pick %"
          value={getem.participation.correctPickRate}
          note="Scoring feed not connected"
          icon={Trophy}
        />
        <MetricTile
          title="Awaiting Results"
          value={getem.contests.awaitingResults}
          note={getem.dataFeedStatus}
          icon={ClipboardList}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contest Operations</CardTitle>
          <CardDescription>
            These controls activate when the Get’em contest engine is
            connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {GETEM_CONTROLS.map((label) => (
              <div
                key={label}
                className="rounded-md border bg-background p-3"
              >
                <div className="font-medium">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Pending engine connection
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
