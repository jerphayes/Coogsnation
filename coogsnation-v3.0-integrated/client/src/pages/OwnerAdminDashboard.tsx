import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleAlert,
  Database,
  KeyRound,
  LockKeyholeOpen,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  role: string;
  accountStatus: "active" | "suspended" | "disabled" | "pending";
  emailVerifiedAt: string | null;
  isLocalAccount: boolean | null;
  failedLoginAttempts: number | null;
  lockedUntil: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  postCount?: number;
  threadCount?: number;
  daysSinceSignup?: number;
  lastActivityDays?: number;
}

interface AdminOverview {
  version: string;
  generatedAt: string;
  totalUsers: number;
  totalPosts: number;
  totalThreads: number;
  totalEvents: number;
  totalArticles: number;
  activeForums: number;
  todaySignups: number;
  monthlyActiveUsers: number;
  authFailures24h: number;
  adminActions24h: number;
  accountStatus: Record<"active" | "suspended" | "disabled" | "pending", number>;
}

interface AdminAccess {
  ownerConfigured: boolean;
  isOwner: boolean;
  administrators: AdminUser[];
}

interface AuditEvent {
  id: string;
  occurredAt: string;
  eventType: string;
  outcome: string;
  userId: string | null;
  handle: string | null;
  firstName: string | null;
  lastName: string | null;
  detail: string | null;
}

interface SystemStatus {
  version: string;
  environment: string;
  uptimeSeconds: number;
  services: Record<string, any>;
  security: Record<string, any>;
}

interface AdminAIStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  readOnly: boolean;
  toolsEnabled: boolean;
  monthlyBudgetUsd: number;
  usage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    failures: number;
  };
}

interface AdminUserDetail {
  user: AdminUser;
  recentAudit: AuditEvent[];
}

type ActionState =
  | { type: "status"; user: AdminUser; value: AdminUser["accountStatus"] }
  | { type: "role"; user: AdminUser; value: "member" | "admin" }
  | { type: "unlock"; user: AdminUser };

function displayName(user: AdminUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.handle || user.email || user.id;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function statusBadge(status: AdminUser["accountStatus"]) {
  if (status === "active") return <Badge>Active</Badge>;
  if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function outcomeBadge(outcome: string) {
  if (outcome === "success") return <Badge>Success</Badge>;
  if (outcome === "blocked") return <Badge variant="destructive">Blocked</Badge>;
  return <Badge variant="secondary">{outcome}</Badge>;
}

function MetricCard({ title, value, note, icon: Icon }: { title: string; value: number | string; note: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function ServiceRow({ label, value }: { label: string; value: any }) {
  const okay = value === true || value === "operational" || value?.configured === true || value?.enabled === true;
  const text = typeof value === "object" && value !== null
    ? Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`).join(" · ")
    : String(value);
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium capitalize">{label.replace(/([A-Z])/g, " $1")}</span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {okay ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}
        {text}
      </span>
    </div>
  );
}

export default function OwnerAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [reason, setReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const adminEnabled = isAuthenticated && user?.role === "admin";

  const overviewQuery = useQuery<AdminOverview>({ queryKey: ["/api/admin/overview"], enabled: adminEnabled });
  const usersQuery = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], enabled: adminEnabled });
  const auditQuery = useQuery<AuditEvent[]>({ queryKey: ["/api/admin/audit?limit=150"], enabled: adminEnabled });
  const accessQuery = useQuery<AdminAccess>({ queryKey: ["/api/admin/access"], enabled: adminEnabled });
  const systemQuery = useQuery<SystemStatus>({ queryKey: ["/api/admin/system-status"], enabled: adminEnabled });
  const aiStatusQuery = useQuery<AdminAIStatus>({ queryKey: ["/api/admin/ai/status"], enabled: adminEnabled });
  const detailQuery = useQuery<AdminUserDetail>({
    queryKey: [`/api/admin/users/${selectedUserId}`],
    enabled: adminEnabled && Boolean(selectedUserId),
  });

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (usersQuery.data || []).filter((candidate) => {
      const matchesStatus = statusFilter === "all" || candidate.accountStatus === statusFilter;
      const haystack = [candidate.firstName, candidate.lastName, candidate.email, candidate.handle, candidate.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [search, statusFilter, usersQuery.data]);

  const refreshAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit?limit=150"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/access"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-status"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/status"] }),
    ]);
    if (selectedUserId) {
      await queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${selectedUserId}`] });
    }
  };

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!action) throw new Error("No administrator action selected");
      const base = `/api/admin/users/${action.user.id}`;
      const body = { reason, currentPassword };
      if (action.type === "status") {
        return apiRequest("PATCH", `${base}/status`, { ...body, status: action.value });
      }
      if (action.type === "role") {
        return apiRequest("PATCH", `${base}/role`, { ...body, role: action.value });
      }
      return apiRequest("POST", `${base}/unlock`, body);
    },
    onSuccess: async () => {
      toast({ title: "Administrator action completed", description: "The change was recorded in the append-only audit log." });
      setAction(null);
      setReason("");
      setCurrentPassword("");
      await refreshAdminData();
    },
    onError: (error: Error) => {
      toast({ title: "Administrator action failed", description: error.message, variant: "destructive" });
    },
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/ai", { question: aiQuestion });
      return response.json() as Promise<{ answer: string }>;
    },
    onSuccess: async (data) => {
      setAiAnswer(data.answer);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Administrator AI unavailable", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Checking administrator access…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Authentication required</AlertTitle>
            <AlertDescription>Sign in before opening the administrator dashboard.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>403 — Administrator access required</AlertTitle>
            <AlertDescription>This account does not have administrator capability.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const overview = overviewQuery.data;
  const access = accessQuery.data;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-7 w-7 text-red-700" />
              <h1 className="text-3xl font-bold">CoogsNation Control Room</h1>
            </div>
            <p className="text-muted-foreground">Owner-controlled administration. Every sensitive action requires your password and creates an audit record.</p>
          </div>
          <Button variant="outline" onClick={refreshAdminData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        {!access?.ownerConfigured && (
          <Alert className="mb-6">
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Owner ID is not configured</AlertTitle>
            <AlertDescription>Dashboard access works for administrators, but promotion and demotion remain disabled until OWNER_USER_ID is set.</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="ai">Admin AI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total users" value={overview?.totalUsers ?? 0} note={`${overview?.todaySignups ?? 0} joined today`} icon={Users} />
              <MetricCard title="Active accounts" value={overview?.accountStatus.active ?? 0} note={`${overview?.accountStatus.suspended ?? 0} suspended`} icon={UserCog} />
              <MetricCard title="Auth alerts" value={overview?.authFailures24h ?? 0} note="Failed or blocked logins in 24 hours" icon={ShieldAlert} />
              <MetricCard title="Admin actions" value={overview?.adminActions24h ?? 0} note="Recorded in the last 24 hours" icon={Activity} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Platform activity</CardTitle><CardDescription>Live PostgreSQL-backed counts</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Forum posts</span><div className="text-2xl font-semibold">{overview?.totalPosts ?? 0}</div></div>
                  <div><span className="text-muted-foreground">Threads</span><div className="text-2xl font-semibold">{overview?.totalThreads ?? 0}</div></div>
                  <div><span className="text-muted-foreground">Events</span><div className="text-2xl font-semibold">{overview?.totalEvents ?? 0}</div></div>
                  <div><span className="text-muted-foreground">Published articles</span><div className="text-2xl font-semibold">{overview?.totalArticles ?? 0}</div></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Administrator access</CardTitle><CardDescription>{access?.isOwner ? "You are the configured owner." : "Full administrator access; owner-only role controls are locked."}</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {(access?.administrators || []).map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between rounded-md border p-3">
                      <div><div className="font-medium">{displayName(admin)}</div><div className="text-xs text-muted-foreground">{admin.email}</div></div>
                      <Badge>{admin.id === user?.id ? "Current" : "Admin"}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User administration</CardTitle>
                <CardDescription>Search, inspect, suspend, restore, unlock, and—owner only—grant administrator access.</CardDescription>
                <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search name, email, handle, or user ID" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="sm:w-48"><SelectValue placeholder="Account status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Verification</TableHead><TableHead>Activity</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredUsers.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell><div className="font-medium">{displayName(candidate)}</div><div className="text-xs text-muted-foreground">{candidate.email || candidate.id}{candidate.handle ? ` · @${candidate.handle}` : ""}</div>{candidate.role === "admin" && <Badge className="mt-1">Administrator</Badge>}</TableCell>
                          <TableCell>{statusBadge(candidate.accountStatus || "active")}{candidate.lockedUntil && new Date(candidate.lockedUntil) > new Date() && <Badge variant="destructive" className="ml-2">Locked</Badge>}</TableCell>
                          <TableCell>{candidate.emailVerifiedAt ? <span className="text-green-700">Verified</span> : <span className="text-muted-foreground">Unverified</span>}</TableCell>
                          <TableCell><div className="text-sm">{candidate.postCount ?? 0} posts · {candidate.threadCount ?? 0} threads</div><div className="text-xs text-muted-foreground">Last active: {formatDate(candidate.lastActiveAt)}</div></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedUserId(candidate.id)}>Inspect</Button>
                              {candidate.accountStatus === "active" ? (
                                <Button size="sm" variant="destructive" onClick={() => setAction({ type: "status", user: candidate, value: "suspended" })}>Suspend</Button>
                              ) : (
                                <Button size="sm" onClick={() => setAction({ type: "status", user: candidate, value: "active" })}>Restore</Button>
                              )}
                              {candidate.lockedUntil && new Date(candidate.lockedUntil) > new Date() && <Button size="sm" variant="outline" onClick={() => setAction({ type: "unlock", user: candidate })}><LockKeyholeOpen className="mr-1 h-4 w-4" />Unlock</Button>}
                              {access?.isOwner && candidate.id !== user?.id && (
                                <Button size="sm" variant="outline" onClick={() => setAction({ type: "role", user: candidate, value: candidate.role === "admin" ? "member" : "admin" })}>{candidate.role === "admin" ? "Remove admin" : "Make admin"}</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredUsers.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users match the current filters.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader><CardTitle>Append-only audit history</CardTitle><CardDescription>Authentication and administrator-account events. Passwords, tokens, API keys, and raw IP addresses are never shown.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Outcome</TableHead><TableHead>User</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(auditQuery.data || []).map((event) => <TableRow key={event.id}><TableCell className="whitespace-nowrap text-xs">{formatDate(event.occurredAt)}</TableCell><TableCell>{event.eventType}</TableCell><TableCell>{outcomeBadge(event.outcome)}</TableCell><TableCell>{event.handle ? `@${event.handle}` : event.userId || "—"}</TableCell><TableCell className="max-w-md break-words text-xs text-muted-foreground">{event.detail || "—"}</TableCell></TableRow>)}
                      {!auditQuery.data?.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No audit events found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Service status</CardTitle><CardDescription>Configuration state only; secret values are never returned.</CardDescription></CardHeader><CardContent>{Object.entries(systemQuery.data?.services || {}).map(([key, value]) => <ServiceRow key={key} label={key} value={value} />)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security controls</CardTitle><CardDescription>Version {systemQuery.data?.version || overview?.version || "unknown"} · {systemQuery.data?.environment || "unknown"}</CardDescription></CardHeader><CardContent>{Object.entries(systemQuery.data?.security || {}).map(([key, value]) => <ServiceRow key={key} label={key} value={value} />)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Alert><Bot className="h-4 w-4" /><AlertTitle>Read-only administrator analyst</AlertTitle><AlertDescription>This AI receives a sanitized server-built snapshot. It has no tools and cannot suspend users, change roles, edit settings, send messages, or execute commands.</AlertDescription></Alert>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader><CardTitle>Ask about platform operations</CardTitle><CardDescription>Useful for summaries, trends, risk review, and recommendations based on current dashboard data.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <Textarea rows={5} placeholder="Example: Summarize authentication risks from the last 24 hours and recommend what I should review." value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} />
                  <Button disabled={!aiQuestion.trim() || aiMutation.isPending || !aiStatusQuery.data?.enabled} onClick={() => aiMutation.mutate()}>{aiMutation.isPending ? "Analyzing…" : "Analyze read-only snapshot"}</Button>
                  {aiAnswer && <div className="whitespace-pre-wrap rounded-md border bg-background p-4 text-sm leading-relaxed">{aiAnswer}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Administrator AI status</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ServiceRow label="enabled" value={aiStatusQuery.data?.enabled ?? false} />
                  <ServiceRow label="readOnly" value={aiStatusQuery.data?.readOnly ?? true} />
                  <ServiceRow label="toolsEnabled" value={aiStatusQuery.data?.toolsEnabled ?? false} />
                  <ServiceRow label="provider" value={aiStatusQuery.data?.provider || "not configured"} />
                  <ServiceRow label="model" value={aiStatusQuery.data?.model || "not configured"} />
                  <ServiceRow label="monthlyRequests" value={aiStatusQuery.data?.usage.requests ?? 0} />
                  <ServiceRow label="estimatedCostUsd" value={`$${(aiStatusQuery.data?.usage.estimatedCostUsd ?? 0).toFixed(4)}`} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>User administration record</DialogTitle><DialogDescription>Safe account details and recent audit events. Credentials and private security secrets are excluded.</DialogDescription></DialogHeader>
          {detailQuery.data && <div className="space-y-5"><div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"><div><Label>Name</Label><p>{displayName(detailQuery.data.user)}</p></div><div><Label>User ID</Label><p className="break-all text-sm">{detailQuery.data.user.id}</p></div><div><Label>Email</Label><p>{detailQuery.data.user.email || "—"}</p></div><div><Label>Handle</Label><p>{detailQuery.data.user.handle ? `@${detailQuery.data.user.handle}` : "—"}</p></div><div><Label>Role</Label><p>{detailQuery.data.user.role}</p></div><div><Label>Status</Label><div>{statusBadge(detailQuery.data.user.accountStatus)}</div></div><div><Label>Created</Label><p>{formatDate(detailQuery.data.user.createdAt)}</p></div><div><Label>Last active</Label><p>{formatDate(detailQuery.data.user.lastActiveAt)}</p></div></div><div><h3 className="mb-2 font-semibold">Recent account audit</h3><div className="space-y-2">{detailQuery.data.recentAudit.map((event) => <div key={event.id} className="rounded-md border p-3 text-sm"><div className="flex justify-between gap-4"><span className="font-medium">{event.eventType}</span><span className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.detail || event.outcome}</p></div>)}</div></div></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open) { setAction(null); setReason(""); setCurrentPassword(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm sensitive administrator action</DialogTitle><DialogDescription>{action ? `${action.type === "status" ? `Change ${displayName(action.user)} to ${action.value}` : action.type === "role" ? `Change ${displayName(action.user)} to ${action.value}` : `Unlock ${displayName(action.user)}`}. This action will be audited.` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor="admin-reason">Reason</Label><Textarea id="admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="State the operational or moderation reason." /></div><div className="space-y-2"><Label htmlFor="admin-password">Your current password</Label><Input id="admin-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button variant={action?.type === "status" && action.value !== "active" ? "destructive" : "default"} disabled={reason.trim().length < 3 || !currentPassword || actionMutation.isPending} onClick={() => actionMutation.mutate()}>{actionMutation.isPending ? "Confirming…" : "Confirm and record"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
