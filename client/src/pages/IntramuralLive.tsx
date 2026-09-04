import { Header } from "@/components/Header";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "wouter";

type Team = {
  team_id:string;
  name:string;
  sport:string;
  gender:string;
  league:string;
  division?:string | null;
  season:string;
  primary_color:string;
  secondary_color:string;
  member_count:number;
};

export default function IntramuralLive() {
  const [teams,setTeams] =
    useState<Team[]>([]);

  const [loading,setLoading] =
    useState(true);

  const [error,setError] =
    useState("");

  const createdTeamId =
    new URLSearchParams(
      window.location.search,
    ).get("created");

  useEffect(() => {
    fetch(
      "/api/intramurals/teams?scope=live",
      {
        credentials:"same-origin",
        cache:"no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          const body =
            await response
              .json()
              .catch(() => ({}));

          throw new Error(
            body.message ||
            "Unable to load live teams",
          );
        }

        return response.json();
      })
      .then((rows) => {
        setTeams(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const orderedTeams =
    useMemo(
      () => [
        ...teams.filter(
          (team) =>
            team.team_id === createdTeamId,
        ),
        ...teams.filter(
          (team) =>
            team.team_id !== createdTeamId,
        ),
      ],
      [teams,createdTeamId],
    );

  return (
    <div className="min-h-screen bg-[#08090a] text-white">

      <Header />

      <div className="border-b border-white/10 bg-black/80">
        <nav className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-5 px-5 py-3 text-sm font-semibold text-white/70">
          <Link
            href="/intramurals"
            className="font-black text-red-400 hover:text-red-300"
          >
            ← Intramural Home
          </Link>

          <Link
            href="/intramurals/demo"
            className="hover:text-white"
          >
            Demo / How It Works
          </Link>

          <Link
            href="/forums/other-sports-men"
            className="hover:text-white"
          >
            Intramural Forum
          </Link>
        </nav>
      </div>

      <main className="mx-auto max-w-[1500px] px-5 py-8">

        <div className="mb-7 flex overflow-hidden rounded-xl border border-white/15 bg-black">
          <div className="flex-1 bg-red-600 px-5 py-3 text-center text-sm font-black text-white">
            LIVE TEAMS
          </div>

          <Link
            href="/intramurals/demo"
            className="flex-1 px-5 py-3 text-center text-sm font-black text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            DEMO
          </Link>
        </div>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-green-400">
              LIVE COMMUNITY
            </div>

            <h1 className="mt-2 text-4xl font-black">
              Active Intramural Teams
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-white/60">
              These are real CoogsNation member-created
              teams. Demonstration teams do not appear
              on this board.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/intramurals?action=team"
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-black text-white"
            >
              + ADD ANOTHER TEAM
            </a>

            <a
              href="/intramurals?action=suggest"
              className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold"
            >
              + SUGGEST A SPORT OR ACTIVITY
            </a>
          </div>
        </section>


        {createdTeamId && (
          <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-5 py-4">
            <strong>TEAM CREATED.</strong>
            {" "}
            You are now on the real live
            Intramural Teams board.
          </div>
        )}


        {loading && (
          <div className="mt-8 text-white/50">
            Loading live teams…
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}


        {!loading && !error && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">
                Teams
              </h2>

              <div className="text-sm text-white/50">
                {teams.length}
                {" active "}
                {teams.length === 1
                  ? "team"
                  : "teams"}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {orderedTeams.map(
                (team) => {
                  const justCreated =
                    team.team_id ===
                    createdTeamId;

                  return (
                    <a
                      key={team.team_id}
                      href={
                        `/intramurals/teams/${team.team_id}`
                      }
                      className={[
                        "group rounded-xl border p-5 transition",
                        "hover:-translate-y-0.5 hover:bg-white/[0.05]",
                        justCreated
                          ? "border-green-400 ring-2 ring-green-400/30"
                          : "border-white/15",
                      ].join(" ")}
                      style={{
                        background:
                          `linear-gradient(135deg, ${team.primary_color}25, #111315 65%)`,
                      }}
                    >
                      {justCreated && (
                        <div className="mb-3 inline-block rounded bg-green-500 px-2 py-1 text-[10px] font-black uppercase text-black">
                          Just Created
                        </div>
                      )}

                      <h3 className="text-xl font-black text-red-400">
                        {team.name}
                      </h3>

                      <div className="mt-2 text-xs uppercase text-white/55">
                        {team.sport.replace(
                          /-/g,
                          " ",
                        )}

                        {" • "}

                        {team.league}
                      </div>

                      <div className="mt-5 text-sm text-white/55">
                        {team.member_count}
                        {" "}
                        {team.member_count === 1
                          ? "member"
                          : "members"}
                      </div>

                      <div className="mt-4 text-xs font-black uppercase text-white/40 group-hover:text-white">
                        Open Team Board →
                      </div>
                    </a>
                  );
                },
              )}

              {!orderedTeams.length && (
                <div className="col-span-full rounded-xl border border-white/10 p-8 text-center text-white/45">
                  No live teams yet.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
