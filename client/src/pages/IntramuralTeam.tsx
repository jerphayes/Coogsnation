import MemberAvatar from "@/components/MemberAvatar";
import { Header } from "@/components/Header";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


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
  scheduled_start?:string | null;
  away_name:string;
  home_name:string;
  away_score:number | null;
  home_score:number | null;
  status:string;
  location?:string | null;
};


type RosterMember = {
  user_id:string;
  role:
    | "captain"
    | "co-captain"
    | "player";
  joined_at:string;
  stats:Record<string,number>;
  display_name:string;
  handle?:string | null;
  affiliation?:string | null;
  profile_image_url?:string | null;
};


type Control = {
  viewerRole:
    | "captain"
    | "co-captain"
    | "player"
    | null;

  canEdit:boolean;
  captainUserId:string | null;
  deletionRequestedAt:string | null;
  deletionRequestedBy:string | null;
  lastDeletionCancelledAt:string | null;
};


type SearchResult = {
  id:string;
  handle:string;
  displayName:string;
  emailHint:string;
};


async function requestJson(
  url:string,
  init?:RequestInit,
) {

  const response =
    await fetch(
      url,
      {
        credentials:
          "same-origin",

        headers:{
          "Content-Type":
            "application/json",

          ...(init?.headers || {}),
        },

        ...init,
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      );

  if (!response.ok) {
    throw new Error(
      body.message ||
      `Request failed: ${response.status}`,
    );
  }

  return body;
}


function roleLabel(
  role:string,
) {

  if (
    role ===
    "co-captain"
  ) {
    return "Co-Captain";
  }

  if (
    role ===
    "captain"
  ) {
    return "Captain";
  }

  return "Player";
}


function statFieldsForSport(
  sport:string,
) {

  const common = [
    [
      "gamesPlayed",
      "Games",
    ],
    [
      "matchesWon",
      "Wins",
    ],
  ];

  switch (sport) {

    case "basketball":
      return [
        ...common,
        [
          "points",
          "PTS",
        ],
        [
          "assists",
          "AST",
        ],
        [
          "rebounds",
          "REB",
        ],
        [
          "steals",
          "STL",
        ],
        [
          "blocks",
          "BLK",
        ],
      ];

    case "flag-football":
      return [
        ...common,
        [
          "touchdowns",
          "TD",
        ],
        [
          "receptions",
          "REC",
        ],
        [
          "passingTouchdowns",
          "PASS TD",
        ],
        [
          "sacks",
          "SACK",
        ],
        [
          "interceptions",
          "INT",
        ],
      ];

    case "soccer":
      return [
        ...common,
        [
          "goals",
          "Goals",
        ],
        [
          "assists",
          "Assists",
        ],
        [
          "saves",
          "Saves",
        ],
      ];

    case "baseball":
    case "softball":
      return [
        ...common,
        [
          "runs",
          "Runs",
        ],
        [
          "hits",
          "Hits",
        ],
        [
          "rbi",
          "RBI",
        ],
        [
          "homeRuns",
          "HR",
        ],
        [
          "strikeouts",
          "SO",
        ],
      ];

    case "volleyball":
      return [
        ...common,
        [
          "kills",
          "Kills",
        ],
        [
          "aces",
          "Aces",
        ],
        [
          "blocks",
          "Blocks",
        ],
        [
          "digs",
          "Digs",
        ],
      ];

    case "cricket":
      return [
        ...common,
        [
          "runs",
          "Runs",
        ],
        [
          "wickets",
          "Wickets",
        ],
        [
          "catches",
          "Catches",
        ],
        [
          "sixes",
          "Sixes",
        ],
      ];

    default:
      return [
        ...common,
        [
          "points",
          "Points",
        ],
        [
          "goals",
          "Goals",
        ],
        [
          "assists",
          "Assists",
        ],
      ];
  }
}


export default function IntramuralTeam({
  teamId,
}:{
  teamId:string;
}) {

  /* PAGE ENTRY: SCROLL TO TEAM HEADER */
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);


  const {
    isAuthenticated,
  } =
    useAuth();

  const [
    data,
    setData,
  ] =
    useState<{
      team:Team;
      games:Game[];
    } | null>(
      null,
    );

  const [
    roster,
    setRoster,
  ] =
    useState<RosterMember[]>(
      [],
    );

  const [
    control,
    setControl,
  ] =
    useState<Control | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    editOpen,
    setEditOpen,
  ] =
    useState(false);

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(false);

  const [
    roleConfirm,
    setRoleConfirm,
  ] =
    useState<{
      member:RosterMember;
      role:
        | "captain"
        | "co-captain"
        | "player";
    } | null>(
      null,
    );

  const [
    removeConfirm,
    setRemoveConfirm,
  ] =
    useState<RosterMember | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<SearchResult[]>(
      [],
    );

  const [
    teamForm,
    setTeamForm,
  ] =
    useState({
      name:"",
      sport:"",
      gender:"open",
      league:"",
      division:"",
      season:"",
      primaryColor:
        "#C8102E",
      secondaryColor:
        "#FFFFFF",
    });

  const [
    statsDraft,
    setStatsDraft,
  ] =
    useState<
      Record<
        string,
        Record<string,string>
      >
    >({});


  async function load() {

    const [
      detail,
      rosterData,
    ] =
      await Promise.all([
        requestJson(
          `/api/intramurals/teams/${teamId}`,
        ),

        requestJson(
          `/api/intramurals/teams/${teamId}/roster`,
        ),
      ]);

    setData(
      detail,
    );

    setRoster(
      rosterData,
    );

    const drafts:
      Record<
        string,
        Record<string,string>
      > = {};

    for (
      const member
      of rosterData
    ) {

      drafts[
        member.user_id
      ] = {};

      for (
        const [
          key,
        ]
        of statFieldsForSport(
          detail.team.sport,
        )
      ) {

        drafts[
          member.user_id
        ][key] =
          String(
            member.stats?.[key] ??
            0,
          );
      }
    }

    setStatsDraft(
      drafts,
    );


    setTeamForm({
      name:
        detail.team.name,

      sport:
        detail.team.sport,

      gender:
        detail.team.gender,

      league:
        detail.team.league,

      division:
        detail.team.division ||
        "",

      season:
        detail.team.season,

      primaryColor:
        detail.team
          .primary_color,

      secondaryColor:
        detail.team
          .secondary_color,
    });


    if (
      isAuthenticated
    ) {

      try {

        const controlData =
          await requestJson(
            `/api/intramurals/teams/${teamId}/control`,
          );

        setControl(
          controlData,
        );

      } catch {

        setControl(
          null,
        );
      }

    } else {

      setControl(
        null,
      );
    }
  }


  useEffect(
    () => {

      load()
        .catch(
          (error) =>
            setMessage(
              error.message,
            ),
        );

    },
    [
      teamId,
      isAuthenticated,
    ],
  );


  const statFields =
    useMemo(
      () =>
        statFieldsForSport(
          data?.team.sport ||
          "",
        ),
      [
        data?.team.sport,
      ],
    );


  const isMember =
    !!control
      ?.viewerRole;

  const canEdit =
    control
      ?.canEdit ===
    true;


  async function join() {

    if (
      !isAuthenticated
    ) {

      const returnTo =
        `/intramurals/teams/${teamId}` +
        `?action=join`;

      window.location.href =
        `/join?returnTo=` +
        encodeURIComponent(
          returnTo,
        );

      return;
    }

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/join`,
        {
          method:
            "POST",

          body:
            "{}",
        },
      );

      setMessage(
        "You joined the team.",
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function saveTeam() {

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/manage`,
        {
          method:
            "PATCH",

          body:
            JSON.stringify(
              teamForm,
            ),
        },
      );

      setMessage(
        "Team updated.",
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function searchMembers() {

    if (
      search.trim()
        .length < 2
    ) {
      return;
    }

    try {

      const result =
        await requestJson(
          `/api/intramurals/teams/${teamId}/member-search?q=` +
          encodeURIComponent(
            search.trim(),
          ),
        );

      setSearchResults(
        result,
      );

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function inviteMember(
    userId:string,
  ) {

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/invite`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              userId,
            }),
        },
      );

      setMessage(
        "Invitation sent. The member enrolls themselves.",
      );

      setSearchResults([]);

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function applyRole() {

    if (
      !roleConfirm
    ) {
      return;
    }

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/members/${roleConfirm.member.user_id}`,
        {
          method:
            "PATCH",

          body:
            JSON.stringify({
              role:
                roleConfirm.role,
            }),
        },
      );

      setMessage(
        roleConfirm.role ===
          "captain"
          ? "Captaincy transferred."
          : "Team role updated.",
      );

      setRoleConfirm(
        null,
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function saveStats(
    member:
      RosterMember,
  ) {

    const draft =
      statsDraft[
        member.user_id
      ] || {};

    const stats:
      Record<string,number> =
      {};

    for (
      const [
        key,
      ]
      of statFields
    ) {

      stats[key] =
        Math.max(
          0,
          Number(
            draft[key] ||
            0,
          ),
        );
    }

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/members/${member.user_id}`,
        {
          method:
            "PATCH",

          body:
            JSON.stringify({
              stats,
            }),
        },
      );

      setMessage(
        `${member.display_name} statistics updated.`,
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function removeMember() {

    if (
      !removeConfirm
    ) {
      return;
    }

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/members/${removeConfirm.user_id}`,
        {
          method:
            "DELETE",
        },
      );

      setMessage(
        `${removeConfirm.display_name} removed from the roster.`,
      );

      setRemoveConfirm(
        null,
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function requestDeletion() {

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/delete-request`,
        {
          method:
            "POST",

          body:
            "{}",
        },
      );

      setDeleteOpen(
        false,
      );

      setMessage(
        "Team deletion scheduled. Every roster member has 30 days to keep the team active.",
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  async function keepTeamActive() {

    try {

      await requestJson(
        `/api/intramurals/teams/${teamId}/keep-active`,
        {
          method:
            "POST",

          body:
            "{}",
        },
      );

      setMessage(
        "Deletion cancelled. This team will remain active.",
      );

      await load();

    } catch (error:any) {

      setMessage(
        error.message,
      );
    }
  }


  if (!data) {

    return (
      <div className="min-h-screen bg-black p-8 text-white">
        {message ||
          "Loading team…"}
      </div>
    );
  }


  const team =
    data.team;

  const games =
    data.games ||
    [];

  const memberCount =
    roster.length ||
    team.member_count ||
    0;


  const deletionDeadline =
    control
      ?.deletionRequestedAt
      ? new Date(
          new Date(
            control
              .deletionRequestedAt,
          )
            .getTime() +
          30 *
          24 *
          60 *
          60 *
          1000,
        )
      : null;


  return (
    <div className="min-h-screen bg-[#08090a] text-white">

      <Header />

      <div className="border-b border-white/10 bg-black/80 px-5 py-3">
        <div
          data-testid="intramural-team-navigation"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-5 text-sm font-semibold text-white/70"
        >
          <a
            href="/"
            className="transition hover:text-white"
          >
            Home
          </a>

          <a
            href="/intramurals"
            className="font-black text-red-400 transition hover:text-red-300"
          >
            ← Intramural Home
          </a>

          <a
            href="/intramurals/live"
            className="font-black text-red-500 transition hover:text-red-400"
          >
            Active Intramural Teams
          </a>

          <a
            href="/forums"
            className="transition hover:text-white"
          >
            Forums
          </a>

          <a
            href="/forums/other-sports-men"
            className="transition hover:text-white"
          >
            Intramural Forum
          </a>
        </div>
      </div>


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


          <div className="mt-5 flex flex-wrap items-center gap-4">

            <div className="rounded bg-black/35 px-4 py-2 text-sm font-bold">
              {memberCount}
              {" "}
              {memberCount === 1
                ? "member"
                : "members"}
            </div>


            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  setEditOpen(
                    true,
                  )
                }
                className="text-base font-black italic text-red-400 underline decoration-red-500/50 underline-offset-4 hover:text-red-300"
              >
                Edit
              </button>
            )}


            {!isMember && (
              <button
                type="button"
                onClick={join}
                className="rounded bg-white px-4 py-2 text-sm font-black text-black hover:bg-gray-100"
              >
                JOIN TEAM
              </button>
            )}

          </div>


          {control
            ?.deletionRequestedAt && (
              <div className="mt-6 rounded-lg border border-amber-400/40 bg-amber-950/50 p-4">

                <div className="text-sm font-black uppercase text-amber-300">
                  Pending Deletion
                </div>

                <p className="mt-1 text-sm text-white/75">
                  This team is scheduled for deletion
                  {deletionDeadline
                    ? ` on ${deletionDeadline.toLocaleDateString()}.`
                    : "."}
                  {" "}
                  Any roster member may keep it active.
                </p>

                {isMember && (
                  <button
                    type="button"
                    onClick={
                      keepTeamActive
                    }
                    className="mt-3 rounded bg-amber-400 px-4 py-2 text-sm font-black text-black hover:bg-amber-300"
                  >
                    KEEP THIS TEAM ACTIVE
                  </button>
                )}

              </div>
            )}

        </section>


        {message && (
          <div className="mt-5 rounded border border-white/10 bg-white/5 p-3 text-sm">
            {message}
          </div>
        )}


        {/* REAL ROSTER */}

        <section className="mt-7 overflow-hidden rounded-xl border border-white/10">

          <div className="border-b border-white/10 bg-[#111315] px-5 py-4">

            <h2 className="text-xl font-black">
              Team Roster
            </h2>

            <p className="mt-1 text-xs text-white/45">
              Real CoogsNation member profiles.
            </p>

          </div>


          <div className="divide-y divide-white/[0.06]">

            {roster.map(
              (member) => (

                <div
                  key={
                    member.user_id
                  }
                  className="flex flex-wrap items-center justify-between gap-4 p-4"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    {member
                      .profile_image_url ? (
                      <img
                        src={
                          member.profile_image_url
                        }
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-700 font-black">
                        {member
                          .display_name
                          .slice(
                            0,
                            1,
                          )
                          .toUpperCase()}
                      </div>
                    )}


                    <div className="min-w-0">

                      <div className="font-black">
                        {
                          member
                            .display_name
                        }
                      </div>

                      <div className="text-xs text-white/45">
                        {roleLabel(
                          member.role,
                        )}

                        {member
                          .affiliation
                          ? ` • ${member.affiliation}`
                          : ""}
                      </div>

                    </div>

                  </div>


                  <div className="flex flex-wrap gap-2">

                    {statFields
                      .slice(
                        0,
                        4,
                      )
                      .map(
                        ([
                          key,
                          label,
                        ]) => (

                          <div
                            key={
                              key
                            }
                            className="min-w-[58px] rounded bg-black/40 px-3 py-2 text-center"
                          >

                            <div className="font-black">
                              {member
                                .stats
                                ?.[key] ??
                                0}
                            </div>

                            <div className="text-[9px] uppercase tracking-wide text-white/35">
                              {
                                label
                              }
                            </div>

                          </div>
                        ),
                      )}

                  </div>

                </div>
              ),
            )}


            {!roster.length && (
              <div className="p-8 text-center text-white/40">
                No roster members.
              </div>
            )}

          </div>

        </section>


        {/* SCHEDULE */}

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
                      key={
                        game.game_id
                      }
                      className="border-t border-white/[0.06]"
                    >

                      <td className="p-3 text-white/55">
                        {game
                          .scheduled_start
                          ? new Date(
                              game.scheduled_start,
                            )
                              .toLocaleString()
                          : "TBD"}
                      </td>

                      <td className="p-3 font-bold">
                        {
                          game
                            .away_name
                        }
                        {" vs "}
                        {
                          game
                            .home_name
                        }
                      </td>

                      <td className="p-3 text-lg font-black">
                        {game
                          .away_score ??
                          "–"}
                        {" – "}
                        {game
                          .home_score ??
                          "–"}
                      </td>

                      <td className="p-3 font-black uppercase text-green-400">
                        {
                          game.status
                        }
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


      {/* ====================================================
          EDIT TEAM
      ===================================================== */}

      <Dialog
        open={
          editOpen
        }
        onOpenChange={
          setEditOpen
        }
      >

        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-[#111315] text-white">

          <DialogHeader>

            <DialogTitle className="text-2xl">
              Edit {team.name}
            </DialogTitle>

            <DialogDescription className="text-white/55">
              Captain and Co-Captains have Team Administrator access.
            </DialogDescription>

          </DialogHeader>


          {/* TEAM DETAILS */}

          <section className="rounded-xl border border-white/10 bg-black/25 p-4">

            <h3 className="font-black uppercase tracking-wide">
              Team
            </h3>


            <div className="mt-4 grid gap-3 md:grid-cols-2">

              <input
                value={
                  teamForm.name
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        name:
                          event.target.value,
                      }),
                    )
                }
                placeholder="Team name"
                className="rounded border border-white/15 bg-black p-3"
              />


              <input
                value={
                  teamForm.sport
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        sport:
                          event.target.value,
                      }),
                    )
                }
                placeholder="Sport / activity"
                className="rounded border border-white/15 bg-black p-3"
              />


              <select
                value={
                  teamForm.gender
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        gender:
                          event.target.value,
                      }),
                    )
                }
                className="rounded border border-white/15 bg-black p-3"
              >

                <option value="open">
                  Open
                </option>

                <option value="men">
                  Men's
                </option>

                <option value="women">
                  Women's
                </option>

                <option value="coed">
                  Coed
                </option>

              </select>


              <input
                value={
                  teamForm.league
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        league:
                          event.target.value,
                      }),
                    )
                }
                placeholder="League"
                className="rounded border border-white/15 bg-black p-3"
              />


              <input
                value={
                  teamForm.division
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        division:
                          event.target.value,
                      }),
                    )
                }
                placeholder="Division"
                className="rounded border border-white/15 bg-black p-3"
              />


              <input
                value={
                  teamForm.season
                }
                onChange={
                  (event) =>
                    setTeamForm(
                      current => ({
                        ...current,
                        season:
                          event.target.value,
                      }),
                    )
                }
                placeholder="Season"
                className="rounded border border-white/15 bg-black p-3"
              />


              <label className="flex items-center justify-between rounded border border-white/15 bg-black p-3">

                Primary Color

                <input
                  type="color"
                  value={
                    teamForm
                      .primaryColor
                  }
                  onChange={
                    (event) =>
                      setTeamForm(
                        current => ({
                          ...current,
                          primaryColor:
                            event.target.value,
                        }),
                      )
                  }
                />

              </label>


              <label className="flex items-center justify-between rounded border border-white/15 bg-black p-3">

                Secondary Color

                <input
                  type="color"
                  value={
                    teamForm
                      .secondaryColor
                  }
                  onChange={
                    (event) =>
                      setTeamForm(
                        current => ({
                          ...current,
                          secondaryColor:
                            event.target.value,
                        }),
                      )
                  }
                />

              </label>

            </div>


            <button
              type="button"
              onClick={
                saveTeam
              }
              className="mt-4 rounded bg-red-700 px-5 py-3 font-black hover:bg-red-600"
            >
              SAVE TEAM
            </button>

          </section>


          {/* INVITE */}

          <section className="rounded-xl border border-white/10 bg-black/25 p-4">

            <h3 className="font-black uppercase tracking-wide">
              Invite CoogsNation Member
            </h3>

            <p className="mt-1 text-xs text-white/45">
              An invitation does not enroll the person. The member joins themselves.
            </p>


            <div className="mt-4 flex gap-2">

              <input
                value={
                  search
                }
                onChange={
                  event =>
                    setSearch(
                      event.target.value,
                    )
                }
                onKeyDown={
                  event => {

                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      void searchMembers();
                    }
                  }
                }
                placeholder="Handle, name or email"
                className="min-w-0 flex-1 rounded border border-white/15 bg-black p-3"
              />

              <button
                type="button"
                onClick={
                  searchMembers
                }
                className="rounded border border-white/20 px-4 font-black"
              >
                SEARCH
              </button>

            </div>


            <div className="mt-3 space-y-2">

              {searchResults.map(
                result => (

                  <div
                    key={
                      result.id
                    }
                    className="flex items-center justify-between gap-3 rounded border border-white/10 bg-black/40 p-3"
                  >

                    <div>

                      <div className="font-black">
                        {
                          result.displayName
                        }
                      </div>

                      <div className="text-xs text-white/45">
                        {result.handle
                          ? `@${result.handle}`
                          : ""}
                        {result.emailHint
                          ? ` • ${result.emailHint}`
                          : ""}
                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        inviteMember(
                          result.id,
                        )
                      }
                      className="rounded bg-red-700 px-4 py-2 text-sm font-black hover:bg-red-600"
                    >
                      INVITE
                    </button>

                  </div>
                ),
              )}

            </div>

          </section>


          {/* ROSTER MANAGEMENT */}

          <section className="rounded-xl border border-white/10 bg-black/25 p-4">

            <h3 className="font-black uppercase tracking-wide">
              Roster & Statistics
            </h3>


            <div className="mt-4 space-y-4">

              {roster.map(
                member => (

                  <div
                    key={
                      member.user_id
                    }
                    className="rounded-xl border border-white/10 bg-black/40 p-4"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div>

                        <div className="font-black">
                          {
                            member
                              .display_name
                          }
                        </div>

                        <div className="text-xs text-white/45">
                          {roleLabel(
                            member.role,
                          )}
                        </div>

                      </div>


                      <div className="flex flex-wrap gap-2">

                        {member.role ===
                          "player" && (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleConfirm({
                                member,
                                role:
                                  "co-captain",
                              })
                            }
                            className="rounded border border-red-500/50 px-3 py-2 text-xs font-black text-red-300"
                          >
                            MAKE CO-CAPTAIN
                          </button>
                        )}


                        {member.role ===
                          "co-captain" && (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleConfirm({
                                member,
                                role:
                                  "player",
                              })
                            }
                            className="rounded border border-white/20 px-3 py-2 text-xs font-black"
                          >
                            REVOKE CO-CAPTAIN
                          </button>
                        )}


                        {member.role !==
                          "captain" && (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleConfirm({
                                member,
                                role:
                                  "captain",
                              })
                            }
                            className="rounded border border-amber-400/40 px-3 py-2 text-xs font-black text-amber-300"
                          >
                            MAKE CAPTAIN
                          </button>
                        )}


                        {member.role !==
                          "captain" && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveConfirm(
                                member,
                              )
                            }
                            className="rounded border border-red-700/60 px-3 py-2 text-xs font-black text-red-400"
                          >
                            REMOVE
                          </button>
                        )}

                      </div>

                    </div>


                    <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">

                      {statFields.map(
                        ([
                          key,
                          label,
                        ]) => (

                          <label
                            key={
                              key
                            }
                            className="text-xs text-white/55"
                          >

                            {
                              label
                            }

                            <input
                              type="number"
                              min="0"
                              value={
                                statsDraft[
                                  member.user_id
                                ]?.[key] ??
                                "0"
                              }
                              onChange={
                                event =>
                                  setStatsDraft(
                                    current => ({
                                      ...current,

                                      [member.user_id]:{
                                        ...(current[
                                          member.user_id
                                        ] || {}),

                                        [key]:
                                          event.target.value,
                                      },
                                    }),
                                  )
                              }
                              className="mt-1 w-full rounded border border-white/15 bg-black p-2 text-white"
                            />

                          </label>
                        ),
                      )}

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        saveStats(
                          member,
                        )
                      }
                      className="mt-3 rounded bg-white/10 px-4 py-2 text-xs font-black hover:bg-white/15"
                    >
                      SAVE STATS
                    </button>

                  </div>
                ),
              )}

            </div>

          </section>


          {/* DANGER */}

          <section className="rounded-xl border border-red-800/50 bg-red-950/20 p-4">

            <h3 className="font-black uppercase tracking-wide text-red-400">
              Delete Team
            </h3>

            <p className="mt-2 text-sm text-white/60">
              Deletion is never immediate. Every roster member receives a 30-day notice and any roster member can keep the team active.
            </p>

            <button
              type="button"
              onClick={() =>
                setDeleteOpen(
                  true,
                )
              }
              className="mt-4 rounded border border-red-600 bg-red-950 px-4 py-3 text-sm font-black text-red-300 hover:bg-red-900"
            >
              DELETE TEAM
            </button>

          </section>

        </DialogContent>

      </Dialog>


      {/* CO-CAPTAIN / CAPTAIN CONFIRMATION */}

      <Dialog
        open={
          !!roleConfirm
        }
        onOpenChange={
          open => {
            if (!open) {
              setRoleConfirm(
                null,
              );
            }
          }
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>

              {roleConfirm
                ?.role ===
                "co-captain"
                ? "FULL TEAM ADMINISTRATOR ACCESS"
                : roleConfirm
                    ?.role ===
                    "captain"
                  ? "TRANSFER CAPTAINCY"
                  : "REVOKE CO-CAPTAIN ACCESS"}

            </DialogTitle>


            <DialogDescription>

              {roleConfirm
                ?.role ===
                "co-captain"
                ? "Making this member a Co-Captain gives them broad authority to edit the team, manage members and statistics, change Team Administrator roles and captaincy, and request deletion of the team. Only appoint someone you trust."
                : roleConfirm
                    ?.role ===
                    "captain"
                  ? "This member will become Captain. The current Captain remains on the team as a Co-Captain."
                  : "This member will lose Team Administrator access and return to Player status."}

            </DialogDescription>

          </DialogHeader>


          <DialogFooter>

            <button
              type="button"
              onClick={() =>
                setRoleConfirm(
                  null,
                )
              }
              className="rounded border px-4 py-2"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={
                applyRole
              }
              className="rounded bg-red-700 px-4 py-2 font-black text-white"
            >
              CONFIRM
            </button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* REMOVE MEMBER */}

      <Dialog
        open={
          !!removeConfirm
        }
        onOpenChange={
          open => {
            if (!open) {
              setRemoveConfirm(
                null,
              );
            }
          }
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Remove Team Member?
            </DialogTitle>

            <DialogDescription>
              Remove {removeConfirm?.display_name} from this roster?
            </DialogDescription>

          </DialogHeader>


          <DialogFooter>

            <button
              type="button"
              onClick={() =>
                setRemoveConfirm(
                  null,
                )
              }
              className="rounded border px-4 py-2"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={
                removeMember
              }
              className="rounded bg-red-700 px-4 py-2 font-black text-white"
            >
              REMOVE
            </button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* DELETE TEAM */}

      <Dialog
        open={
          deleteOpen
        }
        onOpenChange={
          setDeleteOpen
        }
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              DELETE TEAM — 30 DAY NOTICE
            </DialogTitle>

            <DialogDescription>
              Every roster member will be emailed. Any roster member can countermand this action by signing in and selecting KEEP THIS TEAM ACTIVE. If nobody does so, the team is deleted after 30 days.
            </DialogDescription>

          </DialogHeader>


          <DialogFooter>

            <button
              type="button"
              onClick={() =>
                setDeleteOpen(
                  false,
                )
              }
              className="rounded border px-4 py-2"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={
                requestDeletion
              }
              className="rounded bg-red-700 px-4 py-2 font-black text-white"
            >
              SCHEDULE DELETION
            </button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}
