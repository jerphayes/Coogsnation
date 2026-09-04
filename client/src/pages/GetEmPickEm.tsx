import { useMemo, useState, type ReactNode, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Flag,
  Flame,
  Lock,
  Plus,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

import { Header } from "@/components/Header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import UniversalParticipationGate from "@/components/UniversalParticipationGate";

type SportsGame = {
  gameId: string;
  awayLabel: string;
  awayScore: number | null;
  homeLabel: string;
  homeScore: number | null;
  status: string;
};

type SportsSnapshot = {
  generatedAt: string;
  games: SportsGame[];
};

type MyContest = {
  id: string;
  name: string;
  sport: string;
  season: string;
  phase: string;
  roundLabel?: string | null;
  visibility: "private" | "public";
  inviteCode: string;
  maxPlayers: number;
  status: string;
  role: "owner" | "player";
  totalPoints: number;
  playerCount: number;
};

type GetEmSummary = {
  available: boolean;
  contests: { open: number; live: number; closed: number };
  players: number;
  myContests: MyContest[];
};

type CreatedContest = {
  id: string;
  name: string;
  inviteCode: string;
  sport: string;
  season: string;
  phase: string;
  status: string;
};

const initialCreate = {
  name: "CoogsNation Weekly Picks",
  sport: "College Football",
  season: String(new Date().getFullYear()),
  phase: "Regular Season",
  roundLabel: "Week 1",
  visibility: "private",
  maxPlayers: 25,
};

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src="/ngf-productions-logo.webp"
      alt="NGF Productions"
      className={compact ? "h-10 w-auto object-contain" : "h-14 w-auto object-contain"}
    />
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto border border-red-500/40 bg-[#0b0b0b] shadow-2xl shadow-red-950/40 sm:max-w-xl sm:rounded-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0b0b] px-5 py-4">
          <div className="text-lg font-black uppercase tracking-wide">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded border border-white/15 text-white/70 hover:bg-white/5"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

export default function GetEmPickEm() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<"create" | "join" | null>(null);
  const [participationIntent, setParticipationIntent] =
    useState<"create" | "join" | null>(null);
  const [createForm, setCreateForm] = useState(initialCreate);
  const [inviteCode, setInviteCode] = useState("");
  const [createdContest, setCreatedContest] = useState<CreatedContest | null>(null);

  const summary = useQuery<GetEmSummary>({
    queryKey: ["/api/getem/summary"],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const sports = useQuery<SportsSnapshot>({
    queryKey: ["/api/sports/ticker"],
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const visibleGames = useMemo(
    () => (sports.data?.games || []).slice(0, 6),
    [sports.data?.games],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const action =
      params.get("action");

    if (
      action !== "create" &&
      action !== "join"
    ) {
      return;
    }

    if (action === "join") {
      const code =
        (
          params.get("code") ||
          ""
        )
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6);

      if (code) {
        setInviteCode(code);
      }
    }

    if (action === "create") {
      setCreatedContest(null);
    }

    setParticipationIntent(null);
    setDialog(action);

    params.delete("action");
    params.delete("code");

    const query =
      params.toString();

    navigate(
      `/get-em${query ? `?${query}` : ""}`,
      {
        replace: true,
      },
    );
  }, [
    isAuthenticated,
    navigate,
  ]);


  const requireMember = (
    action: "create" | "join",
  ) => {
    if (isAuthenticated) {
      return true;
    }

    setParticipationIntent(action);
    return false;
  };

  const createContest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/getem/contests", createForm);
      return (await response.json()) as CreatedContest;
    },
    onSuccess: (contest) => {
      setCreatedContest(contest);
      queryClient.invalidateQueries({ queryKey: ["/api/getem/summary"] });
      toast({
        title: "Get'em game created",
        description: `Invite code: ${contest.inviteCode}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinContest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/getem/contests/join", {
        inviteCode,
      });
      return (await response.json()) as CreatedContest;
    },
    onSuccess: (contest) => {
      setDialog(null);
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/getem/summary"] });
      toast({
        title: "You're in",
        description: `Joined ${contest.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not join game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    if (!requireMember("create")) return;
    setCreatedContest(null);
    setDialog("create");
  };

  const openJoin = () => {
    if (!requireMember("join")) return;
    setDialog("join");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <UniversalParticipationGate
        open={
          Boolean(participationIntent) &&
          !isAuthenticated
        }
        onOpenChange={(open) => {
          if (!open) {
            setParticipationIntent(null);
          }
        }}
        returnTo={
          participationIntent
            ? `/get-em?action=${participationIntent}${
                participationIntent === "join" &&
                inviteCode
                  ? `&code=${encodeURIComponent(inviteCode)}`
                  : ""
              }`
            : "/get-em"
        }
        description="Anyone can view Get'em / Pick'Em information. Membership is required to create a game, join a game, submit picks and compete."
      />

      <Header
        leadingBrand={
          <Link href="/get-em" className="hidden shrink-0 sm:block" aria-label="NGF Productions Get'em">
            <LogoMark />
          </Link>
        }
      />

      <main className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 78% 14%, rgba(220,38,38,.12), transparent 27%), radial-gradient(circle at 15% 28%, rgba(127,29,29,.11), transparent 24%), linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 32px 32px, 32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <LogoMark />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Pick • Score • Race
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.5fr_0.82fr]">
            <section className="min-w-0">
              <div className="pt-2 lg:pt-5">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Coogs compete. Every pick counts.
                </div>

                <h1 className="text-[clamp(4.4rem,7.5vw,8.2rem)] font-black uppercase leading-[0.74] tracking-[-0.065em]">
                  <span className="block text-zinc-100">GET&apos;EM</span>
                  <span className="block text-red-600">PICK&apos;EM</span>
                </h1>

                <p className="mt-6 max-w-xl text-sm leading-6 text-white/65">
                  Make your picks. Earn points. Beat your friends.
                  <br />
                  <strong className="text-red-400">Climb the leaderboard.</strong>
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex min-h-12 items-center justify-center gap-2 rounded border border-red-500/50 bg-gradient-to-r from-red-800 to-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide shadow-lg shadow-red-950/30 hover:from-red-700 hover:to-red-500"
                  >
                    <Plus className="h-5 w-5" />
                    Create Game
                  </button>

                  <button
                    type="button"
                    onClick={openJoin}
                    className="flex min-h-12 items-center justify-center gap-2 rounded border border-white/20 bg-white/[0.035] px-4 py-3 text-sm font-black uppercase tracking-wide hover:bg-white/[0.07]"
                  >
                    <UserPlus className="h-5 w-5" />
                    Join Existing
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-red-500/20 bg-black/55 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-wider">
                      Enter Get&apos;em
                    </div>
                    <Users className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={inviteCode}
                      onChange={(event) =>
                        setInviteCode(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 6),
                        )
                      }
                      placeholder="INVITE CODE"
                      className="min-h-12 flex-1 rounded border border-white/15 bg-black px-4 text-base font-black uppercase tracking-[0.18em] outline-none focus:border-red-500"
                      aria-label="Get'em invite code"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireMember("join")) return;
                        if (inviteCode.length !== 6) {
                          toast({
                            title: "Invite code needed",
                            description: "Enter the 6-character Get'em code.",
                          });
                          return;
                        }
                        joinContest.mutate();
                      }}
                      disabled={joinContest.isPending}
                      className="min-h-12 rounded bg-red-700 px-5 text-sm font-black uppercase hover:bg-red-600 disabled:opacity-50"
                    >
                      {joinContest.isPending ? "Joining…" : "Join"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-[#101010]/90">
                {[
                  [Trophy, "PICK", "Choose winners"],
                  [BarChart3, "SCORE", "Earn points"],
                  [Flag, "WIN", "Climb the ranks"],
                ].map(([Icon, title, body]: any) => (
                  <div key={title} className="border-r border-white/10 p-3 last:border-r-0 sm:p-4">
                    <Icon className="mb-2 h-6 w-6 text-red-500" />
                    <div className="text-[11px] font-black">{title}</div>
                    <div className="mt-1 text-[9px] leading-4 text-white/45">{body}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-xl border border-white/15 bg-[#0d0d0d]/95">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-black uppercase tracking-wide sm:text-xl">
                    Leaderboard
                  </h2>
                </div>
                <span className="rounded bg-red-700 px-3 py-1.5 text-[10px] font-black uppercase">
                  Overall
                </span>
              </div>

              <div className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
                <Trophy className="h-14 w-14 text-red-600" />
                <div className="mt-4 text-xl font-black uppercase">The race starts here</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/50">
                  Real standings will populate from member picks and the NGF scoring engine.
                  No fake production rankings.
                </p>
                <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
                  <div className="rounded border border-white/10 bg-black/40 p-3">
                    <div className="text-lg font-black">{summary.data?.contests.open ?? "—"}</div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40">Open Games</div>
                  </div>
                  <div className="rounded border border-white/10 bg-black/40 p-3">
                    <div className="text-lg font-black">{summary.data?.contests.live ?? "—"}</div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40">Live</div>
                  </div>
                  <div className="rounded border border-white/10 bg-black/40 p-3">
                    <div className="text-lg font-black">{summary.data?.players ?? "—"}</div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40">Players</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#090909] p-4">
              <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
                <Flag className="h-4 w-4 text-red-500" />
                Race to the Top
              </div>
              <div className="absolute left-5 right-5 top-14 border-t-4 border-dashed border-white/45" />
              <div className="absolute inset-x-5 bottom-6 top-20 overflow-hidden rounded border border-white/[0.06]">
                {[18, 36, 54, 72, 90].map((top, index) => (
                  <div key={top} className="absolute left-0 right-0" style={{ top: `${top}%` }}>
                    <div className="border-t border-white/[0.07]" />
                    <div className="absolute right-1 -top-5 text-xs font-black text-white/10">
                      {50 - index * 10}
                    </div>
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                  <div>
                    <div className="text-5xl" aria-hidden="true">🏇</div>
                    <div className="mt-3 text-sm font-black uppercase">Waiting for the field</div>
                    <div className="mt-1 text-xs leading-5 text-white/40">
                      Rank history will drive every racer in real time.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.9fr_.9fr]">
            <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 font-black uppercase">
                  <CalendarClock className="h-5 w-5 text-red-500" />
                  This Week&apos;s Matchups
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Live NGF feed
                </span>
              </div>
              {visibleGames.length ? (
                <div>
                  {visibleGames.map((game) => (
                    <div
                      key={game.gameId}
                      className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/[0.07] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold">
                          {game.awayLabel} vs {game.homeLabel}
                        </div>
                        <div className="mt-1 text-[10px] text-white/40">{game.status}</div>
                      </div>
                      <div className="self-center text-right text-xs font-black">
                        {game.awayScore == null || game.homeScore == null
                          ? "—"
                          : `${game.awayScore}-${game.homeScore}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-white/45">
                  No games are currently loaded in the sports feed.
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-black uppercase">
                <Users className="h-5 w-5 text-red-500" />
                My Get&apos;em Games
              </div>
              {summary.data?.myContests?.length ? (
                <div className="divide-y divide-white/[0.07]">
                  {summary.data.myContests.slice(0, 5).map((contest) => (
                    <div key={contest.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black">{contest.name}</div>
                          <div className="mt-1 text-[10px] text-white/40">
                            {contest.sport} • {contest.phase}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-red-300">
                            {contest.playerCount}/{contest.maxPlayers}
                          </div>
                          <div className="mt-1 text-[9px] uppercase text-white/35">
                            {contest.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-white/45">
                  Create or join your first game.
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-black uppercase">
                <Lock className="h-5 w-5 text-purple-400" />
                Private Groups
              </div>
              <div className="flex min-h-[210px] flex-col items-center justify-center px-6 text-center">
                <Users className="h-10 w-10 text-purple-400" />
                <div className="mt-3 text-sm font-black uppercase">Your crew. Your race.</div>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  Invite friends with a six-character code and compete on the same leaderboard.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 flex min-h-11 items-center gap-2 rounded border border-purple-500/30 bg-purple-950/25 px-4 text-xs font-black uppercase text-purple-200"
                >
                  Create Group <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>

          <section className="mt-5 grid overflow-hidden rounded-xl border border-red-500/20 bg-[#0b0b0b] sm:grid-cols-4">
            {[
              [CalendarClock, "Next Lock", "—"],
              [Flame, "Best Streak", "—"],
              [Trophy, "Best Week", "—"],
              [BarChart3, "Season Points", "—"],
            ].map(([Icon, label, value]: any) => (
              <div key={label} className="flex items-center gap-4 border-b border-white/10 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <Icon className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/35">{label}</div>
                  <div className="mt-1 text-xl font-black">{value}</div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      <footer className="border-t border-red-700/50 bg-black px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <LogoMark compact />
            <span className="pb-1 text-[10px] uppercase tracking-wider text-white/45">
              copyright pending
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/25">
            Make your picks. Earn points. Be legendary.
          </span>
        </div>
      </footer>

      {dialog === "create" && (
        <ModalShell title="Create Game" onClose={() => setDialog(null)}>
          {createdContest ? (
            <div className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-red-500" />
              <div className="mt-4 text-xl font-black">{createdContest.name}</div>
              <div className="mt-2 text-sm text-white/50">
                Your Get&apos;em game is live and ready for members.
              </div>
              <div className="mx-auto mt-6 max-w-sm rounded border border-red-500/40 bg-red-950/25 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Invite Code
                </div>
                <div className="mt-2 text-4xl font-black tracking-[0.18em] text-red-400">
                  {createdContest.inviteCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="mt-6 min-h-12 w-full rounded bg-red-700 px-5 font-black uppercase hover:bg-red-600"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                createContest.mutate();
              }}
            >
              <label className="grid gap-1.5 text-xs font-bold">
                Game Name
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                Sport
                <select
                  value={createForm.sport}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, sport: event.target.value }))
                  }
                  className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                >
                  <option>College Football</option>
                  <option>College Basketball</option>
                  <option>Baseball</option>
                  <option>Softball</option>
                  <option>Soccer</option>
                  <option>Volleyball</option>
                  <option>Intramural</option>
                  <option>Custom</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  Season
                  <input
                    value={createForm.season}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, season: event.target.value }))
                    }
                    className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold">
                  Round / Week
                  <input
                    value={createForm.roundLabel}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, roundLabel: event.target.value }))
                    }
                    className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-bold">
                Phase
                <select
                  value={createForm.phase}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, phase: event.target.value }))
                  }
                  className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                >
                  <option>Regular Season</option>
                  <option>Conference Tournament</option>
                  <option>Bowl Season</option>
                  <option>CFB Playoff</option>
                  <option>Postseason</option>
                  <option>March Madness</option>
                  <option>Championship</option>
                  <option>Custom Phase</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  Visibility
                  <select
                    value={createForm.visibility}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        visibility: event.target.value,
                      }))
                    }
                    className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                  >
                    <option value="private">Private / Invite Only</option>
                    <option value="public">Public</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold">
                  Max Players
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={createForm.maxPlayers}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        maxPlayers: Number(event.target.value),
                      }))
                    }
                    className="min-h-12 rounded border border-white/15 bg-black px-3 text-base outline-none focus:border-red-500"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={createContest.isPending}
                className="mt-2 min-h-12 rounded bg-gradient-to-r from-red-800 to-red-600 px-5 font-black uppercase hover:from-red-700 hover:to-red-500 disabled:opacity-50"
              >
                {createContest.isPending ? "Creating…" : "Create Game"}
              </button>
            </form>
          )}
        </ModalShell>
      )}

      {dialog === "join" && (
        <ModalShell title="Join Existing Game" onClose={() => setDialog(null)}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              joinContest.mutate();
            }}
          >
            <p className="text-sm leading-6 text-white/55">
              Enter the six-character invite code from the game owner.
            </p>
            <input
              autoFocus
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="ABC123"
              className="min-h-14 rounded border border-white/15 bg-black px-4 text-center text-2xl font-black uppercase tracking-[0.22em] outline-none focus:border-red-500"
              aria-label="Invite code"
            />
            <button
              type="submit"
              disabled={inviteCode.length !== 6 || joinContest.isPending}
              className="min-h-12 rounded bg-red-700 px-5 font-black uppercase hover:bg-red-600 disabled:opacity-50"
            >
              {joinContest.isPending ? "Joining…" : "Join Game"}
            </button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
