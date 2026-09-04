
import type {
  Express,
} from "express";

import {
  z,
} from "zod";

import {
  pool,
} from "../db";

import {
  isAuthenticated,
} from "../auth";

import {
  sendEmail,
} from "../emailService";


const TEAM_ADMIN_ROLES =
  new Set([
    "captain",
    "co-captain",
  ]);


function userIdOf(
  req:any,
):string | null {
  return req.user?.id || null;
}


async function roleFor(
  teamId:string,
  userId:string,
):Promise<string | null> {

  const result =
    await pool.query(
      `
        SELECT role
        FROM
          ngf_intramural_team_members
        WHERE
          team_id=$1
          AND
          user_id=$2
        LIMIT 1
      `,
      [
        teamId,
        userId,
      ],
    );

  return (
    result.rows[0]?.role ||
    null
  );
}


async function writeAudit({
  teamId,
  action,
  actorUserId,
  subjectUserId = null,
  detail = {},
}:{
  teamId:string;
  action:string;
  actorUserId:string | null;
  subjectUserId?:string | null;
  detail?:Record<string,unknown>;
}) {

  await pool.query(
    `
      INSERT INTO
        ngf_intramural_team_audit(
          team_id,
          action,
          actor_user_id,
          subject_user_id,
          detail
        )
      VALUES(
        $1,
        $2,
        $3,
        $4,
        $5::jsonb
      )
    `,
    [
      teamId,
      action,
      actorUserId,
      subjectUserId,
      JSON.stringify(detail),
    ],
  );
}


async function finalizeExpiredDeletes() {

  const result =
    await pool.query(
      `
        DELETE FROM
          ngf_intramural_teams

        WHERE
          deletion_requested_at
            IS NOT NULL

          AND
          deletion_requested_at
            <= now() - interval '30 days'

        RETURNING
          team_id,
          name,
          deletion_requested_by
      `,
    );

  for (const team of result.rows) {
    await writeAudit({
      teamId:
        team.team_id,

      action:
        "team_deletion_finalized",

      actorUserId:
        team.deletion_requested_by,

      detail:{
        teamName:
          team.name,
      },
    });
  }
}


async function rosterRecipients(
  teamId:string,
) {

  const result =
    await pool.query(
      `
        SELECT
          u.email,
          COALESCE(
            NULLIF(u.nickname,''),
            NULLIF(u.handle,''),
            NULLIF(u.username,''),
            NULLIF(
              concat_ws(
                ' ',
                u.first_name,
                u.last_name
              ),
              ''
            ),
            'CoogsNation Member'
          ) AS display_name

        FROM
          ngf_intramural_team_members m

        JOIN
          users u
            ON u.id=m.user_id

        WHERE
          m.team_id=$1

          AND
          u.email IS NOT NULL
      `,
      [
        teamId,
      ],
    );

  return result.rows;
}


async function teamName(
  teamId:string,
):Promise<string> {

  const result =
    await pool.query(
      `
        SELECT name
        FROM
          ngf_intramural_teams
        WHERE
          team_id=$1
      `,
      [
        teamId,
      ],
    );

  return (
    result.rows[0]?.name ||
    "Your Intramural Team"
  );
}


async function emailRoster({
  teamId,
  subject,
  message,
}:{
  teamId:string;
  subject:string;
  message:string;
}) {

  const recipients =
    await rosterRecipients(
      teamId,
    );

  const base =
    (
      process.env.APP_ORIGIN ||
      "https://coogsnation.com"
    )
      .replace(
        /\/+$/,
        "",
      );

  const link =
    `${base}/intramurals/teams/${teamId}`;

  const from =
    process.env.FROM_EMAIL ||
    "noreply@coogsnation.com";

  await Promise.allSettled(
    recipients.map(
      (member:any) =>
        sendEmail({
          to:
            member.email,

          from,

          subject,

          text:
            `${message}\n\n` +
            `Team page:\n${link}\n\n` +
            `CoogsNation`,
        }),
    ),
  );
}


function requireTeamAdmin(
  req:any,
  res:any,
  next:any,
) {

  const userId =
    userIdOf(req);

  if (!userId) {
    return res
      .status(401)
      .json({
        message:
          "Membership required",
      });
  }

  roleFor(
    req.params.teamId,
    userId,
  )
    .then(
      (role) => {

        if (
          !role ||
          !TEAM_ADMIN_ROLES.has(
            role,
          )
        ) {
          return res
            .status(403)
            .json({
              message:
                "Captain or Co-Captain access required",
            });
        }

        req.intramuralTeamRole =
          role;

        next();
      },
    )
    .catch(
      next,
    );
}


const teamEditSchema =
  z
    .object({
      name:
        z.string()
          .trim()
          .min(2)
          .max(100)
          .optional(),

      sport:
        z.string()
          .trim()
          .min(2)
          .max(60)
          .optional(),

      gender:
        z.enum([
          "men",
          "women",
          "coed",
          "open",
        ])
          .optional(),

      league:
        z.string()
          .trim()
          .min(1)
          .max(100)
          .optional(),

      division:
        z.string()
          .trim()
          .max(100)
          .nullable()
          .optional(),

      season:
        z.string()
          .trim()
          .min(2)
          .max(50)
          .optional(),

      primaryColor:
        z.string()
          .regex(
            /^#[0-9a-fA-F]{6}$/,
          )
          .optional(),

      secondaryColor:
        z.string()
          .regex(
            /^#[0-9a-fA-F]{6}$/,
          )
          .optional(),
    })
    .strict();


const memberUpdateSchema =
  z
    .object({
      role:
        z.enum([
          "captain",
          "co-captain",
          "player",
        ])
          .optional(),

      stats:
        z.record(
          z.coerce
            .number()
            .finite()
            .min(0)
            .max(1000000),
        )
          .optional(),
    })
    .strict();


function maskEmail(
  value:string | null,
) {

  if (!value) {
    return "";
  }

  const [
    local,
    domain,
  ] =
    value.split("@");

  if (
    !local ||
    !domain
  ) {
    return "";
  }

  return (
    local.slice(0,1) +
    "***@" +
    domain
  );
}


export function
registerIntramuralManagementRoutes(
  app:Express,
) {

  /*
   * Cheap deterministic cleanup.
   * No AI and no NGF employee intervention.
   *
   * Any request into the Intramural subsystem
   * can finalize teams whose 30-day deletion
   * period has expired.
   */
  app.use(
    "/api/intramurals",
    async (
      _req,
      _res,
      next,
    ) => {

      try {
        await finalizeExpiredDeletes();
      } catch (error) {
        console.error(
          "[INTRAMURALS] deletion cleanup failed",
          error,
        );
      }

      next();
    },
  );


  // ---------------------------------------------------------
  // PUBLIC ROSTER
  // ---------------------------------------------------------

  app.get(
    "/api/intramurals/teams/:teamId/roster",

    async (
      req,
      res,
    ) => {

      try {

        const result =
          await pool.query(
            `
              SELECT
                m.user_id,
                m.role,
                m.joined_at,
                m.stats,

                COALESCE(
                  NULLIF(u.nickname,''),
                  NULLIF(u.handle,''),
                  NULLIF(u.username,''),
                  NULLIF(
                    concat_ws(
                      ' ',
                      u.first_name,
                      u.last_name
                    ),
                    ''
                  ),
                  'Member'
                ) AS display_name,

                u.handle,
                u.affiliation,
                u.profile_image_url

              FROM
                ngf_intramural_team_members m

              JOIN
                users u
                  ON u.id=m.user_id

              WHERE
                m.team_id=$1

              ORDER BY
                CASE m.role
                  WHEN 'captain'
                    THEN 1
                  WHEN 'co-captain'
                    THEN 2
                  ELSE 3
                END,

                m.joined_at
            `,
            [
              req.params.teamId,
            ],
          );

        res.setHeader(
          "Cache-Control",
          "no-store",
        );

        res.json(
          result.rows,
        );

      } catch (error) {

        console.error(
          "[INTRAMURALS] roster read failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to load roster",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // VIEWER CONTROL / PERMISSIONS
  // ---------------------------------------------------------

  app.get(
    "/api/intramurals/teams/:teamId/control",

    isAuthenticated,

    async (
      req:any,
      res,
    ) => {

      try {

        const userId =
          userIdOf(req)!;

        const teamResult =
          await pool.query(
            `
              SELECT
                team_id,
                captain_user_id,
                deletion_requested_at,
                deletion_requested_by,
                last_deletion_cancelled_at

              FROM
                ngf_intramural_teams

              WHERE
                team_id=$1
            `,
            [
              req.params.teamId,
            ],
          );

        if (
          !teamResult.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Team not found",
            });
        }

        const viewerRole =
          await roleFor(
            req.params.teamId,
            userId,
          );

        res.json({
          viewerRole,

          canEdit:
            !!viewerRole &&
            TEAM_ADMIN_ROLES.has(
              viewerRole,
            ),

          captainUserId:
            teamResult.rows[0]
              .captain_user_id,

          deletionRequestedAt:
            teamResult.rows[0]
              .deletion_requested_at,

          deletionRequestedBy:
            teamResult.rows[0]
              .deletion_requested_by,

          lastDeletionCancelledAt:
            teamResult.rows[0]
              .last_deletion_cancelled_at,
        });

      } catch (error) {

        console.error(
          "[INTRAMURALS] control read failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to load team permissions",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // EDIT TEAM
  // ---------------------------------------------------------

  app.patch(
    "/api/intramurals/teams/:teamId/manage",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      try {

        const input =
          teamEditSchema.parse(
            req.body,
          );

        const existing =
          await pool.query(
            `
              SELECT *
              FROM
                ngf_intramural_teams
              WHERE
                team_id=$1
            `,
            [
              req.params.teamId,
            ],
          );

        if (
          !existing.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Team not found",
            });
        }

        const current =
          existing.rows[0];

        const result =
          await pool.query(
            `
              UPDATE
                ngf_intramural_teams

              SET
                name=$2,
                sport=$3,
                gender=$4,
                league=$5,
                division=$6,
                season=$7,
                primary_color=$8,
                secondary_color=$9,
                updated_at=now()

              WHERE
                team_id=$1

              RETURNING *
            `,
            [
              req.params.teamId,

              input.name ??
                current.name,

              input.sport ??
                current.sport,

              input.gender ??
                current.gender,

              input.league ??
                current.league,

              input.division ===
                undefined
                  ? current.division
                  : input.division,

              input.season ??
                current.season,

              input.primaryColor ??
                current.primary_color,

              input.secondaryColor ??
                current.secondary_color,
            ],
          );

        await writeAudit({
          teamId:
            req.params.teamId,

          action:
            "team_edited",

          actorUserId:
            userIdOf(req),

          detail:
            input,
        });

        res.json(
          result.rows[0],
        );

      } catch (error) {

        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              message:
                error.errors?.[0]?.message ||
                "Invalid team update",
            });
        }

        console.error(
          "[INTRAMURALS] team edit failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to edit team",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // MEMBER SEARCH FOR TEAM INVITATION
  // ---------------------------------------------------------

  app.get(
    "/api/intramurals/teams/:teamId/member-search",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      try {

        const q =
          String(
            req.query.q ||
            "",
          )
            .trim();

        if (
          q.length < 2
        ) {
          return res.json([]);
        }

        const like =
          `%${q}%`;

        const result =
          await pool.query(
            `
              SELECT
                u.id,
                u.email,
                u.handle,
                u.username,
                u.nickname,

                COALESCE(
                  NULLIF(u.nickname,''),
                  NULLIF(u.handle,''),
                  NULLIF(u.username,''),
                  NULLIF(
                    concat_ws(
                      ' ',
                      u.first_name,
                      u.last_name
                    ),
                    ''
                  ),
                  'Member'
                ) AS display_name

              FROM
                users u

              LEFT JOIN
                ngf_intramural_team_members m

                ON
                  m.user_id=u.id
                  AND
                  m.team_id=$1

              WHERE
                m.user_id IS NULL

                AND
                u.account_status='active'

                AND (
                  u.email ILIKE $2
                  OR
                  u.handle ILIKE $2
                  OR
                  u.username ILIKE $2
                  OR
                  u.nickname ILIKE $2
                  OR
                  concat_ws(
                    ' ',
                    u.first_name,
                    u.last_name
                  ) ILIKE $2
                )

              ORDER BY
                display_name

              LIMIT 12
            `,
            [
              req.params.teamId,
              like,
            ],
          );

        res.json(
          result.rows.map(
            (row:any) => ({
              id:
                row.id,

              handle:
                row.handle ||
                row.username ||
                "",

              displayName:
                row.display_name,

              emailHint:
                maskEmail(
                  row.email,
                ),
            }),
          ),
        );

      } catch (error) {

        console.error(
          "[INTRAMURALS] member search failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to search members",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // INVITE EXISTING COOGSNATION MEMBER
  //
  // Important: this does NOT enroll the person.
  // The member still joins themselves.
  // ---------------------------------------------------------

  app.post(
    "/api/intramurals/teams/:teamId/invite",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      try {

        const input =
          z
            .object({
              userId:
                z.string().min(1),
            })
            .strict()
            .parse(
              req.body,
            );

        const person =
          await pool.query(
            `
              SELECT
                id,
                email

              FROM
                users

              WHERE
                id=$1
            `,
            [
              input.userId,
            ],
          );

        if (
          !person.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Member not found",
            });
        }

        const name =
          await teamName(
            req.params.teamId,
          );

        const email =
          person.rows[0].email;

        if (email) {

          const base =
            (
              process.env.APP_ORIGIN ||
              "https://coogsnation.com"
            )
              .replace(
                /\/+$/,
                "",
              );

          void sendEmail({
            to:
              email,

            from:
              process.env.FROM_EMAIL ||
              "noreply@coogsnation.com",

            subject:
              `${name} invited you to join`,

            text:
              `You have been invited to join ${name} on CoogsNation.\n\n` +
              `You decide whether to enroll. Open the team page here:\n\n` +
              `${base}/intramurals/teams/${req.params.teamId}?action=join\n\n` +
              `CoogsNation`,
          });
        }

        await writeAudit({
          teamId:
            req.params.teamId,

          action:
            "member_invited",

          actorUserId:
            userIdOf(req),

          subjectUserId:
            input.userId,
        });

        res.json({
          ok:true,
        });

      } catch (error) {

        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid invitation",
            });
        }

        console.error(
          "[INTRAMURALS] invitation failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to invite member",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // MEMBER ROLE / STATS
  // ---------------------------------------------------------

  app.patch(
    "/api/intramurals/teams/:teamId/members/:memberId",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      const client =
        await pool.connect();

      try {

        const input =
          memberUpdateSchema.parse(
            req.body,
          );

        await client.query(
          "BEGIN",
        );

        const target =
          await client.query(
            `
              SELECT
                role

              FROM
                ngf_intramural_team_members

              WHERE
                team_id=$1
                AND
                user_id=$2

              FOR UPDATE
            `,
            [
              req.params.teamId,
              req.params.memberId,
            ],
          );

        if (
          !target.rows[0]
        ) {
          await client.query(
            "ROLLBACK",
          );

          return res
            .status(404)
            .json({
              message:
                "Roster member not found",
            });
        }

        const oldRole =
          target.rows[0].role;


        if (
          input.role ===
          "captain"
        ) {

          /*
           * One Captain.
           * Previous Captain becomes a Co-Captain
           * rather than being thrown off the team.
           */
          await client.query(
            `
              UPDATE
                ngf_intramural_team_members

              SET
                role='co-captain'

              WHERE
                team_id=$1
                AND
                role='captain'
                AND
                user_id<>$2
            `,
            [
              req.params.teamId,
              req.params.memberId,
            ],
          );

          await client.query(
            `
              UPDATE
                ngf_intramural_team_members

              SET
                role='captain'

              WHERE
                team_id=$1
                AND
                user_id=$2
            `,
            [
              req.params.teamId,
              req.params.memberId,
            ],
          );

          await client.query(
            `
              UPDATE
                ngf_intramural_teams

              SET
                captain_user_id=$2,
                updated_at=now()

              WHERE
                team_id=$1
            `,
            [
              req.params.teamId,
              req.params.memberId,
            ],
          );

        } else if (
          input.role
        ) {

          if (
            oldRole ===
              "captain"
          ) {

            await client.query(
              "ROLLBACK",
            );

            return res
              .status(409)
              .json({
                message:
                  "Transfer captaincy to another roster member first.",
              });
          }


          if (
            TEAM_ADMIN_ROLES.has(
              oldRole,
            ) &&
            input.role ===
              "player"
          ) {

            const count =
              await client.query(
                `
                  SELECT
                    COUNT(*)::int
                      AS count

                  FROM
                    ngf_intramural_team_members

                  WHERE
                    team_id=$1

                    AND
                    role IN (
                      'captain',
                      'co-captain'
                    )
                `,
                [
                  req.params.teamId,
                ],
              );

            if (
              Number(
                count.rows[0]
                  ?.count ||
                0,
              ) <= 1
            ) {

              await client.query(
                "ROLLBACK",
              );

              return res
                .status(409)
                .json({
                  message:
                    "A team must retain at least one Team Administrator.",
                });
            }
          }


          await client.query(
            `
              UPDATE
                ngf_intramural_team_members

              SET
                role=$3

              WHERE
                team_id=$1
                AND
                user_id=$2
            `,
            [
              req.params.teamId,
              req.params.memberId,
              input.role,
            ],
          );
        }


        if (
          input.stats
        ) {

          await client.query(
            `
              UPDATE
                ngf_intramural_team_members

              SET
                stats=$3::jsonb

              WHERE
                team_id=$1
                AND
                user_id=$2
            `,
            [
              req.params.teamId,
              req.params.memberId,
              JSON.stringify(
                input.stats,
              ),
            ],
          );
        }


        await client.query(
          "COMMIT",
        );


        if (
          input.role &&
          input.role !==
            oldRole
        ) {

          await writeAudit({
            teamId:
              req.params.teamId,

            action:
              "member_role_changed",

            actorUserId:
              userIdOf(req),

            subjectUserId:
              req.params.memberId,

            detail:{
              from:
                oldRole,

              to:
                input.role,
            },
          });
        }


        if (
          input.stats
        ) {

          await writeAudit({
            teamId:
              req.params.teamId,

            action:
              "member_stats_updated",

            actorUserId:
              userIdOf(req),

            subjectUserId:
              req.params.memberId,

            detail:{
              stats:
                input.stats,
            },
          });
        }


        res.json({
          ok:true,
        });

      } catch (error) {

        await client
          .query(
            "ROLLBACK",
          )
          .catch(
            () => {},
          );

        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              message:
                error.errors?.[0]?.message ||
                "Invalid roster update",
            });
        }

        console.error(
          "[INTRAMURALS] roster update failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to update roster member",
          });

      } finally {

        client.release();
      }
    },
  );


  // ---------------------------------------------------------
  // REMOVE MEMBER
  // ---------------------------------------------------------

  app.delete(
    "/api/intramurals/teams/:teamId/members/:memberId",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      try {

        const result =
          await pool.query(
            `
              SELECT
                role

              FROM
                ngf_intramural_team_members

              WHERE
                team_id=$1
                AND
                user_id=$2
            `,
            [
              req.params.teamId,
              req.params.memberId,
            ],
          );

        if (
          !result.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Roster member not found",
            });
        }

        if (
          result.rows[0].role ===
          "captain"
        ) {
          return res
            .status(409)
            .json({
              message:
                "Transfer captaincy before removing the Captain.",
            });
        }


        if (
          TEAM_ADMIN_ROLES.has(
            result.rows[0].role,
          )
        ) {

          const count =
            await pool.query(
              `
                SELECT
                  COUNT(*)::int
                    AS count

                FROM
                  ngf_intramural_team_members

                WHERE
                  team_id=$1

                  AND
                  role IN (
                    'captain',
                    'co-captain'
                  )
              `,
              [
                req.params.teamId,
              ],
            );

          if (
            Number(
              count.rows[0]
                ?.count ||
              0,
            ) <= 1
          ) {
            return res
              .status(409)
              .json({
                message:
                  "A team must retain at least one Team Administrator.",
              });
          }
        }


        await pool.query(
          `
            DELETE FROM
              ngf_intramural_team_members

            WHERE
              team_id=$1
              AND
              user_id=$2
          `,
          [
            req.params.teamId,
            req.params.memberId,
          ],
        );


        await writeAudit({
          teamId:
            req.params.teamId,

          action:
            "member_removed",

          actorUserId:
            userIdOf(req),

          subjectUserId:
            req.params.memberId,
        });


        res.json({
          ok:true,
        });

      } catch (error) {

        console.error(
          "[INTRAMURALS] remove member failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to remove roster member",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // REQUEST TEAM DELETION — 30 DAYS
  // ---------------------------------------------------------

  app.post(
    "/api/intramurals/teams/:teamId/delete-request",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req:any,
      res,
    ) => {

      try {

        const team =
          await pool.query(
            `
              SELECT
                name,
                deletion_requested_at,
                last_deletion_cancelled_at

              FROM
                ngf_intramural_teams

              WHERE
                team_id=$1
            `,
            [
              req.params.teamId,
            ],
          );

        if (
          !team.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Team not found",
            });
        }


        if (
          team.rows[0]
            .deletion_requested_at
        ) {
          return res.json({
            ok:true,
            alreadyPending:true,
            deletionRequestedAt:
              team.rows[0]
                .deletion_requested_at,
          });
        }


        if (
          team.rows[0]
            .last_deletion_cancelled_at
        ) {

          const cancelled =
            new Date(
              team.rows[0]
                .last_deletion_cancelled_at,
            )
              .getTime();

          const thirtyDays =
            30 *
            24 *
            60 *
            60 *
            1000;

          if (
            Date.now() -
              cancelled <
            thirtyDays
          ) {

            const unlock =
              new Date(
                cancelled +
                thirtyDays,
              );

            return res
              .status(409)
              .json({
                message:
                  `Deletion is locked until ${unlock.toLocaleDateString()} because a roster member recently kept this team active.`,
              });
          }
        }


        const result =
          await pool.query(
            `
              UPDATE
                ngf_intramural_teams

              SET
                deletion_requested_at=now(),
                deletion_requested_by=$2,
                updated_at=now()

              WHERE
                team_id=$1

              RETURNING
                deletion_requested_at
            `,
            [
              req.params.teamId,
              userIdOf(req),
            ],
          );


        await writeAudit({
          teamId:
            req.params.teamId,

          action:
            "team_deletion_requested",

          actorUserId:
            userIdOf(req),

          detail:{
            windowDays:
              30,
          },
        });


        const name =
          team.rows[0].name;

        void emailRoster({
          teamId:
            req.params.teamId,

          subject:
            `${name} is scheduled for deletion`,

          message:
            `${name} has been scheduled for deletion by a Team Administrator.\n\n` +
            `The team will be deleted in 30 days unless any roster member chooses KEEP THIS TEAM ACTIVE.\n\n` +
            `Sign in to CoogsNation and open the team page if you want the team to remain active.`,
        });


        res.json({
          ok:true,

          deletionRequestedAt:
            result.rows[0]
              .deletion_requested_at,
        });

      } catch (error) {

        console.error(
          "[INTRAMURALS] deletion request failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to schedule team deletion",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // ANY ROSTER MEMBER CAN KEEP TEAM ACTIVE
  // ---------------------------------------------------------

  app.post(
    "/api/intramurals/teams/:teamId/keep-active",

    isAuthenticated,

    async (
      req:any,
      res,
    ) => {

      try {

        const userId =
          userIdOf(req)!;

        const role =
          await roleFor(
            req.params.teamId,
            userId,
          );

        if (!role) {
          return res
            .status(403)
            .json({
              message:
                "Only a roster member can countermand team deletion.",
            });
        }


        const team =
          await pool.query(
            `
              SELECT
                name,
                deletion_requested_at

              FROM
                ngf_intramural_teams

              WHERE
                team_id=$1
            `,
            [
              req.params.teamId,
            ],
          );

        if (
          !team.rows[0]
        ) {
          return res
            .status(404)
            .json({
              message:
                "Team not found",
            });
        }


        if (
          !team.rows[0]
            .deletion_requested_at
        ) {
          return res
            .status(409)
            .json({
              message:
                "This team is not scheduled for deletion.",
            });
        }


        await pool.query(
          `
            UPDATE
              ngf_intramural_teams

            SET
              deletion_requested_at=NULL,
              deletion_requested_by=NULL,
              last_deletion_cancelled_at=now(),
              updated_at=now()

            WHERE
              team_id=$1
          `,
          [
            req.params.teamId,
          ],
        );


        await writeAudit({
          teamId:
            req.params.teamId,

          action:
            "team_deletion_cancelled",

          actorUserId:
            userId,

          detail:{
            role,
          },
        });


        void emailRoster({
          teamId:
            req.params.teamId,

          subject:
            `${team.rows[0].name} deletion cancelled`,

          message:
            `${team.rows[0].name} will remain active.\n\n` +
            `A roster member countermanded the deletion request.`,
        });


        res.json({
          ok:true,
        });

      } catch (error) {

        console.error(
          "[INTRAMURALS] keep-active failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to keep team active",
          });
      }
    },
  );


  // ---------------------------------------------------------
  // AUDIT — TEAM ADMINS ONLY
  // ---------------------------------------------------------

  app.get(
    "/api/intramurals/teams/:teamId/audit",

    isAuthenticated,
    requireTeamAdmin,

    async (
      req,
      res,
    ) => {

      try {

        const result =
          await pool.query(
            `
              SELECT
                audit_id,
                action,
                actor_user_id,
                subject_user_id,
                detail,
                created_at

              FROM
                ngf_intramural_team_audit

              WHERE
                team_id=$1

              ORDER BY
                created_at DESC

              LIMIT 100
            `,
            [
              req.params.teamId,
            ],
          );

        res.json(
          result.rows,
        );

      } catch (error) {

        console.error(
          "[INTRAMURALS] audit read failed",
          error,
        );

        res
          .status(500)
          .json({
            message:
              "Unable to load team history",
          });
      }
    },
  );

}
