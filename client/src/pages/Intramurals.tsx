import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "wouter";

import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import UniversalParticipationGate from "@/components/UniversalParticipationGate";

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

type Game = {
  game_id:string;
  sport:string;
  status:string;
  scheduled_start?:string | null;
  location?:string | null;

  away_team_id:string;
  away_name:string;
  away_score:number | null;
  away_primary_color:string;
  away_secondary_color:string;

  home_team_id:string;
  home_name:string;
  home_score:number | null;
  home_primary_color:string;
  home_secondary_color:string;
};

type ActivitySuggestion = {
  suggestion_id:string;
  submitted_by:string;
  name:string;
  proposed_slug:string;
  kind:"sport" | "activity";
  description?:string | null;
  status:string;
  submitter_name?:string | null;
  affiliation?:string | null;
};

type ParticipationAction =
  | "team"
  | "game"
  | "score"
  | "suggest";

type Pending = {
  submission_id:string;
  game_id:string;
  away_name:string;
  home_name:string;
  away_score:number;
  home_score:number;
};

const DEFAULT_SPORTS = [
  ["all","All Sports"],
  ["flag-football","Flag Football"],
  ["basketball","Basketball"],
  ["soccer","Soccer"],
  ["volleyball","Volleyball"],
  ["softball","Softball"],
  ["baseball","Baseball"],
  ["cricket","Cricket"],
  ["hockey","Hockey"],
  ["lacrosse","Lacrosse"],
  ["rugby","Rugby"],
  ["ultimate-frisbee","Ultimate Frisbee"],
  ["dodgeball","Dodgeball"],
] as const;

async function requestJson(
  url:string,
  init?:RequestInit,
) {
  const response =
    await fetch(
      url,
      {
        credentials:"same-origin",
        headers:{
          "Content-Type":"application/json",
          ...(init?.headers || {}),
        },
        ...init,
      },
    );

  if (!response.ok) {
    const body =
      await response.json().catch(
        () => ({}),
      );

    throw new Error(
      body.message ||
      `Request failed: ${response.status}`,
    );
  }

  return response.json();
}

export default function Intramurals() {

  /* PAGE ENTRY: SCROLL TO HEADER */
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const { user, isAuthenticated } =
    useAuth();

  const [teams,setTeams] =
    useState<Team[]>([]);

  const [games,setGames] =
    useState<Game[]>([]);

  const [pending,setPending] =
    useState<Pending[]>([]);

  const [sportOptions,setSportOptions] =
    useState<Array<[string,string]>>(
      () =>
        DEFAULT_SPORTS.map(
          ([value,label]) => [
            value,
            label,
          ],
        ),
    );

  const [
    activitySuggestions,
    setActivitySuggestions,
  ] =
    useState<ActivitySuggestion[]>([]);


  const [sport,setSport] =
    useState("all");

  const [mode,setMode] =
    useState<
      null |
      "team" |
      "game" |
      "score" |
      "suggest"
    >(null);

  const [joinPrompt,setJoinPrompt] =
    useState<ParticipationAction | null>(
      null,
    );

  const [message,setMessage] =
    useState("");

  const [suggestForm,setSuggestForm] =
    useState({
      name:"",
      kind:"sport",
      description:"",
    });


  const [teamForm,setTeamForm] =
    useState({
      name:"",
      sport:"flag-football",
      gender:"open",
      league:"Open",
      division:"",
      season:"2026",
      primaryColor:"#C8102E",
      secondaryColor:"#FFFFFF",
    });

  const [gameForm,setGameForm] =
    useState({
      awayTeamId:"",
      homeTeamId:"",
      scheduledStart:"",
      location:"",
    });

  const [scoreForm,setScoreForm] =
    useState({
      gameId:"",
      submittedForTeamId:"",
      awayScore:"0",
      homeScore:"0",
    });

  async function refresh() {
    const [
      teamData,
      gameData,
    ] =
      await Promise.all([
        requestJson(
          "/api/intramurals/teams?scope=live",
        ),

        requestJson(
          "/api/intramurals/games",
        ),
      ]);

    setTeams(teamData);

    const liveTeamIds =
      new Set(
        teamData.map(
          (team:Team) => team.team_id,
        ),
      );

    setGames(
      gameData.filter(
        (game:Game) =>
          liveTeamIds.has(game.away_team_id) &&
          liveTeamIds.has(game.home_team_id),
      ),
    );

    try {
      const catalogData =
        await requestJson(
          "/api/intramurals/sports",
        );

      if (
        Array.isArray(catalogData) &&
        catalogData.length
      ) {
        setSportOptions([
          ["all","All Sports"],
          ...catalogData.map(
            (item:any) =>
              [
                item.slug,
                item.name,
              ] as [string,string],
          ),
        ]);
      }
    } catch {
      // Keep built-in fallback catalog.
    }

    if (user?.role === "admin") {
      requestJson(
        "/api/intramurals/activity-suggestions/pending",
      )
        .then(setActivitySuggestions)
        .catch(
          () =>
            setActivitySuggestions([]),
        );
    } else {
      setActivitySuggestions([]);
    }


    if (isAuthenticated) {
      requestJson(
        "/api/intramurals/submissions/pending",
      )
        .then(setPending)
        .catch(() => setPending([]));
    }
  }

  useEffect(() => {
    refresh().catch(
      (error) =>
        setMessage(error.message),
    );
  }, [isAuthenticated,user?.role]);

  // INTRAMURAL_RETURN_ACTION_V1
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const requested =
      params.get("action");

    if (
      requested === "team" ||
      requested === "game" ||
      requested === "score" ||
      requested === "suggest"
    ) {
      setMode(requested);

      params.delete("action");

      const remaining =
        params.toString();

      window.history.replaceState(
        {},
        "",
        remaining
          ? `/intramurals?${remaining}`
          : "/intramurals",
      );
    }
  }, [isAuthenticated]);


  // INTRAMURAL_POPUP_ESCAPE_V1
  useEffect(() => {
    if (!joinPrompt) {
      return;
    }

    const closeOnEscape = (
      event:KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setJoinPrompt(null);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
  }, [joinPrompt]);


  const visibleGames =
    useMemo(
      () =>
        sport === "all"
          ? games
          : games.filter(
              (game) =>
                game.sport === sport,
            ),
      [games,sport],
    );

  const tickerGames =
    visibleGames.slice(0,8);

  function beginParticipation(
    action:ParticipationAction,
  ) {
    if (!isAuthenticated) {
      setJoinPrompt(action);
      return;
    }

    setJoinPrompt(null);

    setMode(
      mode === action
        ? null
        : action,
    );
  }


  async function suggestActivity(
    event:React.FormEvent,
  ) {
    event.preventDefault();

    try {
      await requestJson(
        "/api/intramurals/activity-suggestions",
        {
          method:"POST",
          body:JSON.stringify({
            name:
              suggestForm.name,
            kind:
              suggestForm.kind,
            description:
              suggestForm.description ||
              undefined,
          }),
        },
      );

      setMessage(
        "Sport or activity submitted for review.",
      );

      setSuggestForm({
        name:"",
        kind:"sport",
        description:"",
      });

      setMode(null);

      await refresh();
    } catch (error:any) {
      setMessage(error.message);
    }
  }


  async function createTeam(
    event:React.FormEvent,
  ) {
    event.preventDefault();

    try {
      const createdTeam =
        await requestJson(
          "/api/intramurals/teams",
          {
            method:"POST",
            body:JSON.stringify(
              teamForm,
            ),
          },
        );

      /*
       * Creation is the boundary between the
       * demonstration page and the LIVE system.
       */
      window.location.assign(
        `/intramurals/live?created=${encodeURIComponent(
          createdTeam.team_id,
        )}`,
      );

      return;
    } catch (error:any) {
      setMessage(error.message);
    }
  }

  async function createGame(
    event:React.FormEvent,
  ) {
    event.preventDefault();

    try {
      await requestJson(
        "/api/intramurals/games",
        {
          method:"POST",
          body:JSON.stringify({
            awayTeamId:
              gameForm.awayTeamId,

            homeTeamId:
              gameForm.homeTeamId,

            scheduledStart:
              gameForm.scheduledStart
                ? new Date(
                    gameForm.scheduledStart,
                  ).toISOString()
                : undefined,

            location:
              gameForm.location ||
              undefined,
          }),
        },
      );

      setMessage(
        "Game added.",
      );

      setMode(null);

      await refresh();
    } catch (error:any) {
      setMessage(error.message);
    }
  }

  async function submitScore(
    event:React.FormEvent,
  ) {
    event.preventDefault();

    try {
      await requestJson(
        `/api/intramurals/games/${scoreForm.gameId}/scores`,
        {
          method:"POST",
          body:JSON.stringify({
            submittedForTeamId:
              scoreForm.submittedForTeamId,

            awayScore:
              Number(
                scoreForm.awayScore,
              ),

            homeScore:
              Number(
                scoreForm.homeScore,
              ),
          }),
        },
      );

      setMessage(
        "Score submitted for opponent confirmation.",
      );

      setMode(null);

      await refresh();
    } catch (error:any) {
      setMessage(error.message);
    }
  }

  async function reviewActivity(
    id:string,
    action:"approve" | "reject",
  ) {
    let reason = "";

    if (action === "reject") {
      reason =
        window.prompt(
          "Why is this sport/activity not approved? This explanation will be sent to the member.",
        )?.trim() || "";

      if (!reason) {
        return;
      }
    }

    try {
      await requestJson(
        `/api/intramurals/activity-suggestions/${id}/review`,
        {
          method:"POST",
          body:JSON.stringify({
            action,
            reason:
              reason || undefined,
          }),
        },
      );

      setMessage(
        action === "approve"
          ? "Sport or activity approved and added."
          : "Suggestion rejected and member notified.",
      );

      await refresh();
    } catch (error:any) {
      setMessage(error.message);
    }
  }


  async function actOnSubmission(
    id:string,
    action:
      "confirm" |
      "dispute",
  ) {
    try {
      await requestJson(
        `/api/intramurals/submissions/${id}/${action}`,
        {
          method:"POST",
          body:"{}",
        },
      );

      setMessage(
        action === "confirm"
          ? "Result confirmed."
          : "Result disputed.",
      );

      await refresh();
    } catch (error:any) {
      setMessage(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-white">
      <Header />

      <main className="mx-auto max-w-[1500px] px-5 py-7">

        <div
          data-testid="intramural-view-tabs"
          className="mb-7 flex overflow-hidden rounded-xl border border-white/15 bg-black"
        >
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

        <section className="mb-7 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-red-400">
              Intramural Sports
            </div>

            <h1 className="mt-1 text-4xl font-black">
              Intramural Sports & Activities
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
              Create teams, recruit members, schedule games and track
              real community results, standings and player statistics.
              Ready to participate? Click <strong className="text-white">
              ADD YOUR TEAM TO THE ROSTER</strong> to get started.
            </p>

            <Link
              href="/forums/other-sports-men"
              className="mt-4 inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              💬 Intramural Forum & Announcements →
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  beginParticipation("team")
                }
                className="rounded-lg border border-white/20 px-4 py-3 text-sm font-bold"
              >
                + ADD YOUR TEAM TO THE ROSTER
              </button>

              <button
                onClick={() =>
                  beginParticipation("suggest")
                }
                className="rounded-lg border border-white/20 px-4 py-3 text-sm font-bold"
              >
                + Suggest a Sport or Activity
              </button>

              <button
                onClick={() =>
                  beginParticipation("game")
                }
                className="rounded-lg border border-white/20 px-4 py-3 text-sm font-bold"
              >
                + Add Game
              </button>

              <button
                onClick={() =>
                  beginParticipation("score")
                }
                className="rounded-lg bg-red-600 px-4 py-3 text-sm font-black"
              >
                Submit Score
              </button>
            </div>
        </section>

        <UniversalParticipationGate
          open={Boolean(joinPrompt) && !isAuthenticated}
          onOpenChange={(open) => {
            if (!open) setJoinPrompt(null);
          }}
          returnTo={
            joinPrompt
              ? `/intramurals?action=${joinPrompt}`
              : "/intramurals"
          }
          description="Anyone can view Intramural Sports and Activities. A free CoogsNation membership is required to create or join teams, submit results, add games, or suggest a sport or activity."
        />


        {message && (
          <div className="mb-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
            {message}
          </div>
        )}


        {/* SUGGEST SPORT OR ACTIVITY */}
        {mode === "suggest" && (
          <form
            onSubmit={suggestActivity}
            className="mb-6 grid gap-3 rounded-xl border border-red-500/30 bg-white/[0.035] p-5 md:grid-cols-4"
          >
            <div className="md:col-span-4">
              <div className="text-lg font-black">
                Suggest a Sport or Activity
              </div>

              <p className="mt-1 text-sm text-white/60">
                Don't see your sport or activity?
                Submit it for review. Legitimate
                community activities can be added
                to the roster.
              </p>
            </div>

            <input
              required
              minLength={2}
              maxLength={100}
              placeholder="Sport or activity name"
              value={suggestForm.name}
              onChange={(event) =>
                setSuggestForm(
                  (current) => ({
                    ...current,
                    name:event.target.value,
                  }),
                )
              }
              onKeyDown={(event) =>
                event.stopPropagation()
              }
              className="rounded bg-black/50 p-3 md:col-span-2"
            />

            <select
              value={suggestForm.kind}
              onChange={(event) =>
                setSuggestForm({
                  ...suggestForm,
                  kind:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              <option value="sport">
                Sport
              </option>

              <option value="activity">
                Activity
              </option>
            </select>

            <button
              className="rounded bg-red-600 p-3 font-black"
            >
              SUBMIT FOR REVIEW
            </button>

            <textarea
              maxLength={600}
              placeholder="Briefly describe the sport/activity and how members would participate."
              value={suggestForm.description}
              onChange={(event) =>
                setSuggestForm(
                  (current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }),
                )
              }
              onKeyDown={(event) =>
                event.stopPropagation()
              }
              className="min-h-24 rounded bg-black/50 p-3 md:col-span-4"
            />
          </form>
        )}


        {/* CREATE TEAM */}
        {mode === "team" && (
          <form
            onSubmit={createTeam}
            className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-4"
          >
            <input
              required
              placeholder="Team name"
              value={teamForm.name}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  name:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <select
              value={teamForm.sport}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  sport:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              {sportOptions
                .filter(
                  ([value]) =>
                    value !== "all",
                )
                .map(
                  ([value,label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
            </select>

            <select
              value={teamForm.gender}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  gender:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              <option value="men">
                Men's
              </option>

              <option value="women">
                Women's
              </option>

              <option value="coed">
                Coed
              </option>

              <option value="open">
                Open
              </option>
            </select>

            <input
              required
              placeholder="League"
              value={teamForm.league}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  league:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <input
              placeholder="Division"
              value={teamForm.division}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  division:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <input
              required
              placeholder="Season"
              value={teamForm.season}
              onChange={(event) =>
                setTeamForm({
                  ...teamForm,
                  season:event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <label className="flex items-center gap-3 rounded bg-black/50 p-3 text-sm">
              Primary
              <input
                type="color"
                title="Choose Team Color"
                aria-label="Choose Team Color"
                value={
                  teamForm.primaryColor
                }
                onChange={(event) =>
                  setTeamForm({
                    ...teamForm,
                    primaryColor:
                      event.target.value,
                  })
                }
              />
            </label>

            <label className="flex items-center gap-3 rounded bg-black/50 p-3 text-sm">
              Secondary
              <input
                type="color"
                title="Choose Team Color"
                aria-label="Choose Team Color"
                value={
                  teamForm.secondaryColor
                }
                onChange={(event) =>
                  setTeamForm({
                    ...teamForm,
                    secondaryColor:
                      event.target.value,
                  })
                }
              />
            </label>

            <button className="rounded bg-red-600 p-3 font-black md:col-span-4">
              CREATE TEAM
            </button>
          </form>
        )}


        {/* CREATE GAME */}
        {mode === "game" && (
          <form
            onSubmit={createGame}
            className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-4"
          >
            <select
              required
              value={
                gameForm.awayTeamId
              }
              onChange={(event) =>
                setGameForm({
                  ...gameForm,
                  awayTeamId:
                    event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              <option value="">
                Away team
              </option>

              {teams.map(
                (team) => (
                  <option
                    key={team.team_id}
                    value={team.team_id}
                  >
                    {team.name}
                  </option>
                ),
              )}
            </select>

            <select
              required
              value={
                gameForm.homeTeamId
              }
              onChange={(event) =>
                setGameForm({
                  ...gameForm,
                  homeTeamId:
                    event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              <option value="">
                Home team
              </option>

              {teams.map(
                (team) => (
                  <option
                    key={team.team_id}
                    value={team.team_id}
                  >
                    {team.name}
                  </option>
                ),
              )}
            </select>

            <input
              type="datetime-local"
              value={
                gameForm.scheduledStart
              }
              onChange={(event) =>
                setGameForm({
                  ...gameForm,
                  scheduledStart:
                    event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <input
              placeholder="Location"
              value={gameForm.location}
              onChange={(event) =>
                setGameForm({
                  ...gameForm,
                  location:
                    event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            />

            <button className="rounded bg-red-600 p-3 font-black md:col-span-4">
              ADD GAME
            </button>
          </form>
        )}


        {/* SUBMIT SCORE */}
        {mode === "score" && (
          <form
            onSubmit={submitScore}
            className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-4"
          >
            <select
              required
              value={scoreForm.gameId}
              onChange={(event) => {
                const gameId =
                  event.target.value;

                const game =
                  games.find(
                    (item) =>
                      item.game_id ===
                      gameId,
                  );

                setScoreForm({
                  ...scoreForm,
                  gameId,
                  submittedForTeamId:
                    game?.away_team_id ||
                    "",
                });
              }}
              className="rounded bg-black/50 p-3 md:col-span-2"
            >
              <option value="">
                Choose game
              </option>

              {games
                .filter(
                  (game) =>
                    game.status !==
                    "final",
                )
                .map(
                  (game) => (
                    <option
                      key={game.game_id}
                      value={game.game_id}
                    >
                      {game.away_name}
                      {" vs "}
                      {game.home_name}
                    </option>
                  ),
                )}
            </select>

            <select
              required
              value={
                scoreForm.submittedForTeamId
              }
              onChange={(event) =>
                setScoreForm({
                  ...scoreForm,
                  submittedForTeamId:
                    event.target.value,
                })
              }
              className="rounded bg-black/50 p-3"
            >
              <option value="">
                Your team
              </option>

              {(() => {
                const game =
                  games.find(
                    (item) =>
                      item.game_id ===
                      scoreForm.gameId,
                  );

                if (!game) return null;

                return (
                  <>
                    <option
                      value={
                        game.away_team_id
                      }
                    >
                      {game.away_name}
                    </option>

                    <option
                      value={
                        game.home_team_id
                      }
                    >
                      {game.home_name}
                    </option>
                  </>
                );
              })()}
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={
                  scoreForm.awayScore
                }
                onChange={(event) =>
                  setScoreForm({
                    ...scoreForm,
                    awayScore:
                      event.target.value,
                  })
                }
                className="w-1/2 rounded bg-black/50 p-3"
              />

              <input
                type="number"
                min="0"
                value={
                  scoreForm.homeScore
                }
                onChange={(event) =>
                  setScoreForm({
                    ...scoreForm,
                    homeScore:
                      event.target.value,
                  })
                }
                className="w-1/2 rounded bg-black/50 p-3"
              />
            </div>

            <button className="rounded bg-red-600 p-3 font-black md:col-span-4">
              SUBMIT FOR CONFIRMATION
            </button>
          </form>
        )}


        {user?.role === "admin" &&
          activitySuggestions.length > 0 && (
          <section className="mb-7 rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-5">
            <div className="mb-4 text-sm font-black uppercase tracking-wider text-amber-300">
              Sport & Activity Suggestions — Pending Review
            </div>

            <div className="grid gap-3">
              {activitySuggestions.map(
                (suggestion) => (
                  <div
                    key={
                      suggestion.suggestion_id
                    }
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/30 p-4"
                  >
                    <div>
                      <div className="text-lg font-black">
                        {suggestion.name}
                      </div>

                      <div className="text-xs uppercase text-white/50">
                        {suggestion.kind}
                        {" • "}
                        {suggestion.submitter_name}
                        {suggestion.affiliation
                          ? ` • ${suggestion.affiliation}`
                          : ""}
                      </div>

                      {suggestion.description && (
                        <p className="mt-2 max-w-3xl text-sm text-white/65">
                          {suggestion.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          reviewActivity(
                            suggestion.suggestion_id,
                            "approve",
                          )
                        }
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-black"
                      >
                        APPROVE
                      </button>

                      <button
                        onClick={() =>
                          reviewActivity(
                            suggestion.suggestion_id,
                            "reject",
                          )
                        }
                        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-black"
                      >
                        REJECT
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        <div className="relative mb-7 overflow-hidden rounded-xl border border-red-500/30 bg-white/[0.02] p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <div className="-rotate-12 select-none whitespace-nowrap text-5xl font-black tracking-[0.12em] text-white/10 md:text-7xl xl:text-8xl">
              LIVE INTRAMURALS
            </div>
          </div>

          <div className="relative z-20 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-md bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-wider">
              Live Community
            </div>

            <button
              onClick={() => setMode("team")}
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-black"
            >
              + ADD YOUR TEAM TO THE ROSTER
            </button>
          </div>

        {/* INTRAMURAL TICKER */}
        <section className="mb-7">
          <div className="mb-3 text-sm font-black uppercase tracking-wider">
            Live & Recent Intramural Results
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {tickerGames.map(
              (game) => (
                <div
                  key={game.game_id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-[#111315]"
                >
                  <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white/55">
                    {game.sport}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                    <div
                      className="p-4"
                      style={{
                        background:
                          game.away_primary_color,
                        color:
                          game.away_secondary_color,
                      }}
                    >
                      <div className="text-xs font-bold">
                        {game.away_name}
                      </div>

                      <div className="text-3xl font-black">
                        {game.away_score ?? 0}
                      </div>
                    </div>

                    <div className="px-3 text-lg font-black">
                      –
                    </div>

                    <div
                      className="p-4 text-right"
                      style={{
                        background:
                          game.home_primary_color,
                        color:
                          game.home_secondary_color,
                      }}
                    >
                      <div className="text-xs font-bold">
                        {game.home_name}
                      </div>

                      <div className="text-3xl font-black">
                        {game.home_score ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 text-center text-xs font-black uppercase text-yellow-400">
                    {game.status}
                  </div>
                </div>
              ),
            )}

            {!tickerGames.length && (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/[0.025] p-8 text-center text-white/45">
                Intramural results will
                appear here.
              </div>
            )}
          </div>
        </section>


        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          {/* sportOptions */}
          <aside className="rounded-xl border border-white/10 bg-[#111315] p-3">
            <div className="mb-2 px-2 text-xs font-black uppercase text-white/45">
              Choose Sport
            </div>

            {sportOptions.map(
              ([value,label]) => (
                <button
                  key={value}
                  onClick={() =>
                    setSport(value)
                  }
                  className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${
                    sport === value
                      ? "bg-red-600 font-black"
                      : "text-white/70 hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </aside>


          {/* RESULTS GRID */}
          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111315]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-xl font-black">
                Intramural Results
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-black/30 text-left text-xs uppercase text-white/45">
                  <tr>
                    <th className="p-3">
                      Date
                    </th>

                    <th className="p-3">
                      Sport
                    </th>

                    <th className="p-3">
                      Team
                    </th>

                    <th className="p-3 text-center">
                      Score
                    </th>

                    <th className="p-3">
                      Opponent
                    </th>

                    <th className="p-3 text-center">
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
                  {visibleGames.map(
                    (game) => (
                      <tr
                        key={game.game_id}
                        className="border-t border-white/[0.06]"
                      >
                        <td className="p-3 text-white/55">
                          {game.scheduled_start
                            ? new Date(
                                game.scheduled_start,
                              ).toLocaleDateString()
                            : "TBD"}
                        </td>

                        <td className="p-3 capitalize">
                          {game.sport.replace(
                            /-/g,
                            " ",
                          )}
                        </td>

                        <td
                          className="p-3 font-bold"
                          style={{
                            borderLeft:
                              `5px solid ${game.away_primary_color}`,
                          }}
                        >
                          <Link
                            href={`/intramurals/teams/${game.away_team_id}`}
                          >
                            {game.away_name}
                          </Link>
                        </td>

                        <td className="p-3 text-center text-lg font-black">
                          {game.away_score ?? "–"}
                        </td>

                        <td
                          className="p-3 font-bold"
                          style={{
                            borderLeft:
                              `5px solid ${game.home_primary_color}`,
                          }}
                        >
                          <Link
                            href={`/intramurals/teams/${game.home_team_id}`}
                          >
                            {game.home_name}
                          </Link>
                        </td>

                        <td className="p-3 text-center text-lg font-black">
                          {game.home_score ?? "–"}
                        </td>

                        <td className="p-3 font-bold uppercase text-green-400">
                          {game.status}
                        </td>

                        <td className="p-3 text-white/55">
                          {game.location || "—"}
                        </td>
                      </tr>
                    ),
                  )}

                  {!visibleGames.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-10 text-center text-white/40"
                      >
                        No intramural games
                        loaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>


        {/* TEAM CARDS */}
        <section className="mt-7">
          <h2 className="mb-3 text-xl font-black">
            Teams
          </h2>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {teams
              .filter(
                (team) =>
                  sport === "all" ||
                  team.sport === sport,
              )
              .map(
                (team) => (
                  <Link
                    key={team.team_id}
                    href={`/intramurals/teams/${team.team_id}`}
                  >
                    <div
                      className="rounded-xl border p-4 transition hover:-translate-y-0.5"
                      style={{
                        borderColor:
                          team.primary_color,
                        background:
                          `linear-gradient(135deg, ${team.primary_color}55, #111315 65%)`,
                      }}
                    >
                      <div className="text-lg font-black">
                        {team.name}
                      </div>

                      <div className="mt-1 text-xs uppercase text-white/55">
                        {team.sport.replace(
                          /-/g,
                          " ",
                        )}
                        {" • "}
                        {team.league}
                      </div>

                      <div className="mt-4 text-xs text-white/45">
                        {team.member_count}
                        {" members"}
                      </div>
                    </div>
                  </Link>
                ),
              )}
          </div>
        </section>


        {/* CONFIRMATIONS */}
        {isAuthenticated &&
          pending.length > 0 && (
            <section className="mt-7 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <h2 className="mb-4 text-lg font-black">
                Results Waiting For Your Confirmation
              </h2>

              <div className="space-y-3">
                {pending.map(
                  (item) => (
                    <div
                      key={
                        item.submission_id
                      }
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-black/30 p-4"
                    >
                      <div>
                        <strong>
                          {item.away_name}
                          {" "}
                          {item.away_score}
                          {" – "}
                          {item.home_score}
                          {" "}
                          {item.home_name}
                        </strong>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            actOnSubmission(
                              item.submission_id,
                              "confirm",
                            )
                          }
                          className="rounded bg-green-600 px-4 py-2 text-xs font-black"
                        >
                          CONFIRM
                        </button>

                        <button
                          onClick={() =>
                            actOnSubmission(
                              item.submission_id,
                              "dispute",
                            )
                          }
                          className="rounded bg-red-700 px-4 py-2 text-xs font-black"
                        >
                          DISPUTE
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
