import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Eye,
  Radio,
  Repeat2,
  Route,
  Target,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AnalysisRange = "today" | "7d" | "30d" | "year";

interface Summary {
  uniqueVisitors: number;
  sessions: number;
  pageviews: number;
  onlineNow: number;
  newVisitors: number;
  returningVisitors: number;
  guestSessions: number;
  memberSessions: number;
  signupStarted: number;
  signupCompleted: number;
  emailVerified: number;
  activeMembers: number;
  visitorToSignupRate: number;
  signupToVerifiedRate: number;
  visitorToMemberRate: number;
}

interface TrendPoint {
  bucket: string;
  label: string;
  uniqueVisitors: number;
  sessions: number;
  pageviews: number;
  onlinePeak: number;
  newVisitors: number;
  returningVisitors: number;
  guestSessions: number;
  memberSessions: number;
  signupStarted: number;
  signupCompleted: number;
  emailVerified: number;
  activeMembers: number;
  visitorToSignupRate: number;
  signupToVerifiedRate: number;
  visitorToMemberRate: number;
}

interface OperatingTrend {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  monthly: TrendPoint[];
}

interface AcquisitionRow {
  source: string;
  visitors: number;
  sessions: number;
  signups: number;
  verified: number;
  members: number;
  conversionRate: number;
}

interface CampaignRow extends AcquisitionRow {
  medium: string;
  campaign: string;
}

interface LandingRow {
  path: string;
  visitors: number;
  sessions: number;
  signups: number;
}

interface ReferrerRow {
  referrer: string;
  visitors: number;
  sessions: number;
}

interface MarketingTrafficData {
  generatedAt: string;
  businessTimeZone: string;
  range: AnalysisRange;
  currentYear: number;
  autoRefreshSeconds: number;
  summary: Summary;
  trend: OperatingTrend;
  acquisition: AcquisitionRow[];
  campaigns: CampaignRow[];
  landingPages: LandingRow[];
  referrers: ReferrerRow[];
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

function UpdatedStamp({ generatedAt }: { generatedAt?: string }) {
  if (!generatedAt) return null;
  const date = new Date(generatedAt);
  return (
    <span className="text-xs font-medium text-foreground/70">
      Updated {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
      {" · "}auto 30 sec
    </span>
  );
}

type TrendKey = Exclude<keyof TrendPoint, "bucket" | "label">;

function metricValue(point: TrendPoint, dataKey: TrendKey): number {
  return Number(point[dataKey] ?? 0);
}

function formatMetric(value: number, percent: boolean): string {
  return percent ? formatPercent(value) : formatNumber(value);
}

function formatDelta(current: number, previous: number | null): string {
  if (
    previous === null ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return "—";
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

function MetricTrendPane({
  title,
  value,
  note,
  trend,
  dataKey,
  percent = false,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  trend: OperatingTrend;
  dataKey: TrendKey;
  percent?: boolean;
  icon: typeof Users;
}) {
  const weekly = trend.weekly.slice(-5);
  const weeklyPadding = Math.max(0, 5 - weekly.length);
  const weeklySlots: Array<TrendPoint | null> = [
    ...Array.from({ length: weeklyPadding }, () => null),
    ...weekly,
  ];

  const monthOffset = Math.max(0, trend.monthly.length - 3);
  const months = trend.monthly.slice(monthOffset);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-muted-foreground">
              {title}
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">
              {formatMetric(value, percent)}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {note}
            </div>
          </div>

          <Icon className="mt-1 h-4 w-4 shrink-0 text-red-600" />
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Weekly
            </span>
            <span className="text-[10px] text-muted-foreground">
              W5 = current week
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {weeklySlots.map((point, index) => {
              const seriesIndex = index - weeklyPadding;
              const previous =
                seriesIndex > 0 ? weekly[seriesIndex - 1] : null;
              const current = point ? metricValue(point, dataKey) : null;
              const previousValue = previous
                ? metricValue(previous, dataKey)
                : null;

              return (
                <div
                  key={`week-${index}`}
                  className="min-w-0 rounded border bg-background px-1 py-2 text-center"
                >
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    W{index + 1}
                  </div>
                  <div className="mt-1 truncate text-xs font-bold">
                    {current === null
                      ? "—"
                      : formatMetric(current, percent)}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {current === null
                      ? "—"
                      : formatDelta(current, previousValue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Monthly rollup
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {months.length === 0 ? (
              <span className="text-muted-foreground">
                Insufficient monthly history
              </span>
            ) : (
              months.map((point, index) => {
                const sourceIndex = monthOffset + index;
                const previous =
                  sourceIndex > 0
                    ? trend.monthly[sourceIndex - 1]
                    : null;
                const current = metricValue(point, dataKey);
                const previousValue = previous
                  ? metricValue(previous, dataKey)
                  : null;

                return (
                  <span key={point.bucket} className="whitespace-nowrap">
                    <span className="font-medium">{point.label}</span>{" "}
                    {formatMetric(current, percent)}{" "}
                    <span className="text-muted-foreground">
                      {formatDelta(current, previousValue)}
                    </span>
                  </span>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          {trend.daily.length >= 2 ? (
            <div className="h-[105px] w-full text-red-700">
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
                    tick={{ fontSize: 9 }}
                    minTickGap={24}
                    height={18}
                  />
                  <Tooltip
                    separator=": "
                    formatter={(raw: any) => [
                      formatMetric(Number(raw), percent),
                      title,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={dataKey as string}
                    stroke="currentColor"
                    fill="currentColor"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[34px] items-center justify-center py-2 text-[11px] text-muted-foreground">
              Trend begins after additional daily history is collected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function FunnelStep({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{formatNumber(value)}</div>
      {note && <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

export default function MarketingTrafficPanel() {
  const [range, setRange] = useState<AnalysisRange>("today");

  const query = useQuery<MarketingTrafficData>({
    queryKey: ["/api/admin/marketing-traffic-analysis", range],
    queryFn: async () => {
      const response = await fetch(`/api/admin/marketing-traffic-analysis?range=${encodeURIComponent(range)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Marketing analytics request failed (${response.status})`);
      }
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Loading marketing, acquisition and traffic analysis…
        </CardContent>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-destructive">
          Unable to load marketing, acquisition and traffic analysis.
        </CardContent>
      </Card>
    );
  }

  const data = query.data;
  const s = data.summary;
  const trend = data.trend || { daily: [], weekly: [], monthly: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mkt, Acquisition, Traffic Analysis</h2>
          <p className="text-sm text-white/70">
            Marketing acquisition, traffic, attribution, campaign effectiveness and member conversion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={range} onValueChange={(value) => setRange(value as AnalysisRange)}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
          <UpdatedStamp generatedAt={data.generatedAt} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Operating trends</h3>
            <p className="text-xs text-white/70">
              Current value follows the selected range. W5 is the current week; weekly deltas compare with the prior week and the filled chart shows daily history.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricTrendPane
            title="Unique Visitors"
            value={s.uniqueVisitors}
            note={`${formatNumber(s.newVisitors)} new · ${formatNumber(s.returningVisitors)} returning`}
            trend={trend}
            dataKey="uniqueVisitors"
            icon={Users}
          />
          <MetricTrendPane
            title="Sessions"
            value={s.sessions}
            note={`${formatNumber(s.guestSessions)} guest · ${formatNumber(s.memberSessions)} member`}
            trend={trend}
            dataKey="sessions"
            icon={Activity}
          />
          <MetricTrendPane
            title="Pageviews"
            value={s.pageviews}
            note="First-party pageviews"
            trend={trend}
            dataKey="pageviews"
            icon={Eye}
          />
          <MetricTrendPane
            title="Online Now"
            value={s.onlineNow}
            note="Current 5-minute activity · chart = daily peak"
            trend={trend}
            dataKey="onlinePeak"
            icon={Radio}
          />

          <MetricTrendPane
            title="New Visitors"
            value={s.newVisitors}
            note="First observed in selected period"
            trend={trend}
            dataKey="newVisitors"
            icon={UserPlus}
          />
          <MetricTrendPane
            title="Returning Visitors"
            value={s.returningVisitors}
            note="Previously observed visitors returning"
            trend={trend}
            dataKey="returningVisitors"
            icon={Repeat2}
          />
          <MetricTrendPane
            title="Signup Started"
            value={s.signupStarted}
            note="Visitors entering the membership funnel"
            trend={trend}
            dataKey="signupStarted"
            icon={Target}
          />
          <MetricTrendPane
            title="Signup Completed"
            value={s.signupCompleted}
            note="Membership registrations completed"
            trend={trend}
            dataKey="signupCompleted"
            icon={UserCheck}
          />

          <MetricTrendPane
            title="Email Verified"
            value={s.emailVerified}
            note={`${formatPercent(s.signupToVerifiedRate)} signup → verified`}
            trend={trend}
            dataKey="emailVerified"
            icon={BadgeCheck}
          />
          <MetricTrendPane
            title="Active Members"
            value={s.activeMembers}
            note="Completed member activation"
            trend={trend}
            dataKey="activeMembers"
            icon={BadgeCheck}
          />
          <MetricTrendPane
            title="Visitor → Signup"
            value={s.visitorToSignupRate}
            note="Completed signups ÷ unique visitors"
            trend={trend}
            dataKey="visitorToSignupRate"
            percent
            icon={Route}
          />
          <MetricTrendPane
            title="Visitor → Member"
            value={s.visitorToMemberRate}
            note="Activated members ÷ unique visitors"
            trend={trend}
            dataKey="visitorToMemberRate"
            percent
            icon={Route}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership Conversion Funnel</CardTitle>
          <CardDescription>Traffic progressing from visitor through active membership.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FunnelStep label="Visitors" value={s.uniqueVisitors} />
            <FunnelStep label="Signup Started" value={s.signupStarted} />
            <FunnelStep label="Signup Completed" value={s.signupCompleted} note={formatPercent(s.visitorToSignupRate)} />
            <FunnelStep label="Email Verified" value={s.emailVerified} note={formatPercent(s.signupToVerifiedRate)} />
            <FunnelStep label="Active Member" value={s.activeMembers} note={formatPercent(s.visitorToMemberRate)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acquisition Performance</CardTitle>
            <CardDescription>Where visitors came from and whether those sources became members.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.acquisition.length === 0 ? (
                  <EmptyRow colSpan={7} message="No acquisition traffic recorded for this period yet." />
                ) : data.acquisition.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium">{row.source}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.signups)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.verified)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.members)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.conversionRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketing Campaign Effectiveness</CardTitle>
            <CardDescription>UTM, banner, email, social and QR campaign conversion.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.campaigns.length === 0 ? (
                  <EmptyRow colSpan={7} message="No tagged campaigns recorded for this period yet." />
                ) : data.campaigns.map((row) => (
                  <TableRow key={`${row.source}:${row.medium}:${row.campaign}`}>
                    <TableCell>
                      <div className="font-medium">{row.campaign}</div>
                      <div className="text-xs text-muted-foreground">{row.medium}</div>
                    </TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.signups)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.verified)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.members)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.conversionRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Campaign cost, CPA and ROAS can be added when marketing-spend inputs are connected.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Landing Pages</CardTitle>
            <CardDescription>The first internal page visitors reached during their session.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Landing page</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.landingPages.length === 0 ? (
                  <EmptyRow colSpan={4} message="No landing-page data recorded for this period yet." />
                ) : data.landingPages.map((row) => (
                  <TableRow key={row.path}>
                    <TableCell className="max-w-[300px] truncate font-mono text-xs">{row.path}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.signups)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
            <CardDescription>Domains that sent visitors into CoogsNation.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrers.length === 0 ? (
                  <EmptyRow colSpan={3} message="No referrer data recorded for this period yet." />
                ) : data.referrers.map((row) => (
                  <TableRow key={row.referrer}>
                    <TableCell className="font-medium">{row.referrer}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.sessions)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
