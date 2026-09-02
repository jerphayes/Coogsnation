import {
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

type Props = {
  teamId:string;
};

export default function IntramuralTeam({
  teamId,
}:Props) {

  const { isAuthenticated } =
    useAuth();

  const [data,setData] =
    useState<any>(null);

  const [message,setMessage] =
    useState("");

  async function load() {
    const response =
      await fetch(
        `/api/intramurals/teams/${teamId}`,
        {
          credentials:"same-origin",
          cache:"no-store",
        },
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load team",
      );
    }

    setData(
      await response.json(),
    );
  }

  useEffect(() => {
    load().catch(
      (error) =>
        setMessage(error.message),
    );
  }, [teamId]);

  async function join() {
    const response =
      await fetch(
        `/api/intramurals/teams/${teamId}/join`,
        {
          method:"POST",
          credentials:"same-origin",
          headers:{
            "Content-Type":
              "application/json",
          },
          body:"{}",
        },
      );

    if (!response.ok) {
      const body =
        await response.json().catch(
          () => ({}),
        );

      setMessage(
        body.message ||
        "Unable to join",
      );

      return;
    }

    setMessage(
      "You joined the team.",
    );

    await load();
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        {message || "Loading team…"}
      </div>
    );
  }

  const team =
    data.team;

  const games =
    data.games || [];

  return (
    <div className="min-h-screen bg-[#08090a] text-white">
      <header className="border-b border-white/10 bg-black px-5 py-4">
        <a
          href="/intramurals"
          className="font-black text-red-500"
        >
          ← INTRAMURALS
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section
          className="overflow-hidden rounded-2xl border p-7"
          style={{
            borderColor:
              team.primary_color,

            background:
              `linear-gradient(135deg, ${team.primary_color}88, #111315 60%)`,
          }}
        >
          <div className="text-xs font-black uppercase tracking-[0.25em] text-white/60">
            {team.sport.replace(
              /-/g,
              " ",
            )}
          </div>

          <h1 className="mt-2 text-4xl font-black">
            {team.name}
          </h1>

          <div className="mt-2 text-sm text-white/70">
            {team.league}
            {team.division
              ? ` / ${team.division}`
              : ""}
            {" • "}
            {team.season}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded bg-black/35 px-4 py-2 text-sm font-bold">
              {team.member_count}
              {" members"}
            </div>

            {isAuthenticated && (
              <button
                onClick={join}
                className="rounded bg-white px-4 py-2 text-sm font-black text-black"
              >
                JOIN TEAM
              </button>
            )}
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded border border-white/10 bg-white/5 p-3 text-sm">
            {message}
          </div>
        )}

        <section className="mt-7 overflow-hidden rounded-xl border border-white/10">
          <div className="border-b border-white/10 bg-[#111315] px-5 py-4">
            <h2 className="text-xl font-black">
              Schedule & Results
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-black/40 text-left text-xs uppercase text-white/45">
                <tr>
                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Matchup
                  </th>

                  <th className="p-3">
                    Score
                  </th>

                  <th className="p-3">
                    Status
                  </th>

                  <th className="p-3">
                    Location
                  </th>
                </tr>
              </thead>

              <tbody>
                {games.map(
                  (game:any) => (
                    <tr
                      key={game.game_id}
                      className="border-t border-white/[0.06]"
                    >
                      <td className="p-3 text-white/55">
                        {game.scheduled_start
                          ? new Date(
                              game.scheduled_start,
                            ).toLocaleString()
                          : "TBD"}
                      </td>

                      <td className="p-3 font-bold">
                        {game.away_name}
                        {" vs "}
                        {game.home_name}
                      </td>

                      <td className="p-3 text-lg font-black">
                        {game.away_score ??
                          "–"}
                        {" – "}
                        {game.home_score ??
                          "–"}
                      </td>

                      <td className="p-3 font-black uppercase text-green-400">
                        {game.status}
                      </td>

                      <td className="p-3 text-white/55">
                        {game.location ||
                          "—"}
                      </td>
                    </tr>
                  ),
                )}

                {!games.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-white/40"
                    >
                      No games yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
