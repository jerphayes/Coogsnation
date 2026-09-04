import { Header } from "@/components/Header";
import { useState } from "react";
import { Link } from "wouter";

type DemoFrame = {
  eyebrow: string;
  title: string;
  text: string;
  action: string;
  detail: string;
};

const FRAMES: DemoFrame[] = [
  {
    eyebrow: "STEP 1",
    title: "Create Your Team",
    text: "Start an independent member-organized team for the sport or activity you want.",
    action: "CREATE A TEAM",
    detail: "Choose the sport, team name, season, league and team colors.",
  },
  {
    eyebrow: "STEP 2",
    title: "Join CoogsNation",
    text: "Participation is for CoogsNation members. New users join before creating or joining a team.",
    action: "JOIN COOGSNATION",
    detail: "Existing members simply sign in and continue.",
  },
  {
    eyebrow: "STEP 3",
    title: "Verify Your Email",
    text: "New members verify their email address before completing enrollment.",
    action: "VERIFY EMAIL",
    detail: "The original Intramural action stays attached to the enrollment flow.",
  },
  {
    eyebrow: "STEP 4",
    title: "Complete Your Profile",
    text: "Finish the normal CoogsNation member profile once. No separate Intramural identity is required.",
    action: "COMPLETE PROFILE",
    detail: "Your CoogsNation profile becomes your roster identity.",
  },
  {
    eyebrow: "STEP 5",
    title: "Accept the Participation Agreement",
    text: "Before participating, each member accepts the Intramural Sports & Activities Participation Agreement.",
    action: "I AGREE",
    detail: "The agreement applies to participation, not ordinary CoogsNation membership.",
  },
  {
    eyebrow: "STEP 6",
    title: "Your Team Board",
    text: "The team is now live with its roster, sport, season, schedule, scores and statistics.",
    action: "OPEN TEAM",
    detail: "Captains and Co-Captains receive team administration controls.",
  },
  {
    eyebrow: "STEP 7",
    title: "Captain Controls",
    text: "Team Administrators can manage the roster, roles, statistics, games, results and team information.",
    action: "EDIT",
    detail: "Captains can appoint trusted Co-Captains with full team administrator authority.",
  },
  {
    eyebrow: "STEP 8",
    title: "Recruit Players",
    text: "Share the team and recruit other members. Each participant joins the roster through their own account.",
    action: "JOIN TEAM",
    detail: "Invitations never silently add someone to a roster.",
  },
  {
    eyebrow: "STEP 9",
    title: "Play, Score and Track",
    text: "Teams can schedule games, submit results and build player and team statistics.",
    action: "VIEW RESULTS",
    detail: "The live Intramural area contains real member-created teams only.",
  },
];

export default function IntramuralDemo() {
  const [index, setIndex] = useState(0);
  const frame = FRAMES[index];
  const first = index === 0;
  const last = index === FRAMES.length - 1;

  function next() {
    if (!last) {
      setIndex((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    if (!first) {
      setIndex((value) => value - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-white">
      <Header />

      <div className="border-b border-white/10 bg-black/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="text-xs font-black tracking-[0.24em] text-white/60">
            INTRAMURAL SPORTS & ACTIVITIES • DEMO
          </div>

          <Link
            href="/intramurals"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-black text-white hover:bg-white/5"
          >
            EXIT DEMO
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-7 flex overflow-hidden rounded-xl border border-white/15 bg-black">
          <Link
            href="/intramurals"
            className="flex-1 px-5 py-3 text-center text-sm font-black text-white/65 hover:bg-white/5"
          >
            LIVE TEAMS
          </Link>

          <div className="flex-1 bg-red-600 px-5 py-3 text-center text-sm font-black text-white">
            DEMO
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-red-500/35 bg-[#111315] shadow-2xl">
          <div className="border-b border-white/10 bg-black/70 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black tracking-[0.24em] text-red-400">
                  CLICK-THROUGH DEMO
                </div>

                <h1 className="mt-1 text-3xl font-black md:text-4xl">
                  How CoogsNation Intramurals Work
                </h1>
              </div>

              <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white/70">
                {index + 1} OF {FRAMES.length}
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#090a0b]">
              <div className="border-b border-white/10 bg-gradient-to-r from-red-950/50 to-black px-6 py-6">
                <div className="text-xs font-black tracking-[0.28em] text-red-400">
                  {frame.eyebrow}
                </div>

                <h2 className="mt-2 text-3xl font-black md:text-5xl">
                  {frame.title}
                </h2>

                <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
                  {frame.text}
                </p>
              </div>

              <div className="p-6 md:p-10">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs font-black uppercase tracking-wider text-white/40">
                    CoogsNation Intramural Sports & Activities
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                      <div className="text-xs text-white/40">TEAM</div>
                      <div className="mt-1 font-black">COUGAR EXAMPLE</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                      <div className="text-xs text-white/40">SPORT</div>
                      <div className="mt-1 font-black">OPEN LEAGUE</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                      <div className="text-xs text-white/40">STATUS</div>
                      <div className="mt-1 font-black text-green-400">ACTIVE</div>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-white/55">
                    {frame.detail}
                  </p>

                  <button
                    type="button"
                    onClick={next}
                    className="mt-7 w-full rounded-xl border-2 border-red-400 bg-red-600 px-5 py-5 text-lg font-black text-white shadow-[0_0_35px_rgba(220,38,38,0.25)] transition hover:bg-red-500"
                  >
                    CLICK HERE — {frame.action}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={first}
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-25"
              >
                ← BACK
              </button>

              <div className="flex gap-2">
                {FRAMES.map((_, frameIndex) => (
                  <button
                    key={frameIndex}
                    type="button"
                    aria-label={`Go to demo step ${frameIndex + 1}`}
                    onClick={() => setIndex(frameIndex)}
                    className={
                      frameIndex === index
                        ? "h-3 w-8 rounded-full bg-red-500"
                        : "h-3 w-3 rounded-full bg-white/20"
                    }
                  />
                ))}
              </div>

              {last ? (
                <Link
                  href="/intramurals"
                  className="rounded-lg bg-red-600 px-5 py-3 text-sm font-black text-white"
                >
                  VIEW LIVE INTRAMURALS →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-lg bg-red-600 px-5 py-3 text-sm font-black text-white"
                >
                  NEXT →
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs font-bold uppercase tracking-wider text-white/45">
          DEMONSTRATION ONLY • NO DEMO TEAM OR SCORE DATA IS MIXED WITH LIVE COMMUNITY DATA
        </div>
      </main>
    </div>
  );
}
