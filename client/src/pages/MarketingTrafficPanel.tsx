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
  Line,
  LineChart,
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

interface TrendPoint extends Summary {
  monthNumber: number;
  month: string;
  initial: string;
  onlinePeak: number;
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
  yearTrend: TrendPoint[];
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

type TrendKey = keyof TrendPoint;

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
  trend: TrendPoint[];
  dataKey: TrendKey;
  percent?: boolean;
  icon: typeof Users;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <Icon className="h-4 w-4 text-red-600" />
        </div>

        <div className="grid min-h-[102px] grid-cols-[minmax(84px,0.75fr)_minmax(145px,1.25fr)] items-center gap-3">
          <div className="min-w-0">
            <div className="text-3xl font-bold tracking-tight">
              {percent ? formatPercent(value) : formatNumber(value)}
            </div>
            <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{note}</div>
          </div>

          <div className="min-w-0">
            <div className="h-[88px] w-full text-red-600">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 7, right: 4, bottom: 0, left: 4 }}>
                  <XAxis
                    dataKey="initial"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9 }}
                    height={17}
                  />
                  <Tooltip
                    separator=": "
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.month || ""}
                    formatter={(raw: any) => [
                      percent ? formatPercent(Number(raw)) : formatNumber(Number(raw)),
                      title,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey={dataKey as string}
                    stroke="currentColor"
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
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
  const trend = data.yearTrend || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mkt, Acquisition, Traffic Analysis</h2>
          <p className="text-sm text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
              Current value on the left; {data.currentYear} Jan–Dec trend inside each pane.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            note="Current 5-minute activity · chart = monthly peak"
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
