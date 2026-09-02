import type { Express } from "express";
import { z } from "zod";

import { pool } from "../db";
import {
  isAuthenticated,
  requireAdmin,
} from "../auth";

const colorSchema =
  z.string().regex(/^#[0-9a-fA-F]{6}$/);

const sportSchema =
  z.enum([
    "flag-football",
    "basketball",
    "soccer",
    "volleyball",
    "softball",
    "baseball",
    "hockey",
    "lacrosse",
    "rugby",
    "cricket",
    "ultimate-frisbee",
    "dodgeball",
    "other",
  ]);

const genderSchema =
  z.enum([
    "men",
    "women",
    "coed",
    "open",
  ]);

const createTeamSchema =
  z.object({
    name:
      z.string().trim().min(2).max(100),

    sport:
      sportSchema,

    gender:
      genderSchema.default("open"),

    league:
      z.string().trim().min(1).max(100),

    division:
      z.string().trim().max(100).optional(),

    season:
      z.string().trim().min(2).max(50),

    primaryColor:
      colorSchema.default("#C8102E"),

    secondaryColor:
      colorSchema.default("#FFFFFF"),
  });

const createGameSchema =
  z.object({
    awayTeamId:
      z.string().uuid(),

    homeTeamId:
      z.string().uuid(),

    scheduledStart:
      z.string().datetime().optional(),

    location:
      z.string().trim().max(160).optional(),
  });

const submitScoreSchema =
  z.object({
    submittedForTeamId:
      z.string().uuid(),

    awayScore:
      z.number().int().min(0).max(999),

    homeScore:
      z.number().int().min(0).max(999),

    note:
      z.string().trim().max(500).optional(),
  });

const resolveScoreSchema =
  z.object({
    awayScore:
      z.number().int().min(0).max(999),

    homeScore:
      z.number().int().min(0).max(999),
  });

function userIdOf(req: any): string | null {
  return req.user?.id || null;
}

async function memberOfTeam(
  teamId: string,
  userId: string,
): Promise<boolean> {

  const result =
    await pool.query(
      `
        SELECT 1
        FROM ngf_intramural_team_members
        WHERE team_id=$1
          AND user_id=$2
        LIMIT 1
      `,
      [teamId,userId],
    );

  return result.rowCount === 1;
}

async function captainOfTeam(
  teamId: string,
  userId: string,
): Promise<boolean> {

  const result =
    await pool.query(
      `
        SELECT 1
        FROM ngf_intramural_team_members
        WHERE team_id=$1
          AND user_id=$2
          AND role='captain'
        LIMIT 1
      `,
      [teamId,userId],
    );

  return result.rowCount === 1;
}

export function registerIntramuralRoutes(
  app: Express,
) {

  // ----------------------------------------------------------
  // PUBLIC READS
  // ----------------------------------------------------------

  app.get(
    "/api/intramurals/teams",
    async (req,res) => {
      try {
        const sport =
          typeof req.query.sport === "string"
            ? req.query.sport
            : null;

        const result =
          await pool.query(
            `
              SELECT
                t.*,
                COUNT(m.user_id)::int AS member_count
              FROM ngf_intramural_teams t
              LEFT JOIN ngf_intramural_team_members m
                ON m.team_id=t.team_id
              WHERE ($1::text IS NULL OR t.sport=$1)
              GROUP BY t.team_id
              ORDER BY
                t.sport,
                t.league,
                t.name
            `,
            [sport],
          );

        res.setHeader(
          "Cache-Control",
          "no-store",
        );

        res.json(result.rows);
      } catch (error) {
        console.error(
          "[INTRAMURALS] teams read failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to load intramural teams",
        });
      }
    },
  );

  app.get(
    "/api/intramurals/teams/:teamId",
    async (req,res) => {
      try {
        const result =
          await pool.query(
            `
              SELECT
                t.*,
                COUNT(m.user_id)::int AS member_count
              FROM ngf_intramural_teams t
              LEFT JOIN ngf_intramural_team_members m
                ON m.team_id=t.team_id
              WHERE t.team_id=$1
              GROUP BY t.team_id
            `,
            [req.params.teamId],
          );

        if (!result.rows[0]) {
          return res.status(404).json({
            message:"Team not found",
          });
        }

        const games =
          await pool.query(
            `
              SELECT
                g.*,
                a.name AS away_name,
                a.primary_color AS away_primary_color,
                a.secondary_color AS away_secondary_color,
                h.name AS home_name,
                h.primary_color AS home_primary_color,
                h.secondary_color AS home_secondary_color
              FROM ngf_intramural_games g
              JOIN ngf_intramural_teams a
                ON a.team_id=g.away_team_id
              JOIN ngf_intramural_teams h
                ON h.team_id=g.home_team_id
              WHERE
                g.away_team_id=$1
                OR
                g.home_team_id=$1
              ORDER BY
                g.scheduled_start DESC NULLS LAST,
                g.created_at DESC
            `,
            [req.params.teamId],
          );

        res.json({
          team:result.rows[0],
          games:games.rows,
        });
      } catch (error) {
        console.error(
          "[INTRAMURALS] team detail failed",
          error,
        );

        res.status(500).json({
          message:"Unable to load team",
        });
      }
    },
  );

  app.get(
    "/api/intramurals/games",
    async (req,res) => {
      try {
        const sport =
          typeof req.query.sport === "string"
            ? req.query.sport
            : null;

        const teamId =
          typeof req.query.teamId === "string"
            ? req.query.teamId
            : null;

        const result =
          await pool.query(
            `
              SELECT
                g.*,

                a.name AS away_name,
                a.primary_color AS away_primary_color,
                a.secondary_color AS away_secondary_color,

                h.name AS home_name,
                h.primary_color AS home_primary_color,
                h.secondary_color AS home_secondary_color

              FROM ngf_intramural_games g

              JOIN ngf_intramural_teams a
                ON a.team_id=g.away_team_id

              JOIN ngf_intramural_teams h
                ON h.team_id=g.home_team_id

              WHERE
                ($1::text IS NULL OR g.sport=$1)
                AND
                (
                  $2::uuid IS NULL
                  OR g.away_team_id=$2
                  OR g.home_team_id=$2
                )

              ORDER BY
                g.scheduled_start DESC NULLS LAST,
                g.created_at DESC

              LIMIT 250
            `,
            [sport,teamId],
          );

        res.setHeader(
          "Cache-Control",
          "no-store",
        );

        res.json(result.rows);
      } catch (error) {
        console.error(
          "[INTRAMURALS] games read failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to load intramural games",
        });
      }
    },
  );

  /*
   * INTRAMURAL TICKER ONLY.
   *
   * This endpoint is deliberately separate from:
   *   /api/sports/ticker
   */
  app.get(
    "/api/intramurals/ticker",
    async (_req,res) => {
      try {
        const result =
          await pool.query(`
            SELECT
              g.game_id,
              g.sport,
              g.status,
              g.scheduled_start,
              g.away_score,
              g.home_score,

              a.team_id AS away_team_id,
              a.name AS away_name,
              a.primary_color AS away_primary_color,
              a.secondary_color AS away_secondary_color,

              h.team_id AS home_team_id,
              h.name AS home_name,
              h.primary_color AS home_primary_color,
              h.secondary_color AS home_secondary_color

            FROM ngf_intramural_games g

            JOIN ngf_intramural_teams a
              ON a.team_id=g.away_team_id

            JOIN ngf_intramural_teams h
              ON h.team_id=g.home_team_id

            WHERE
              g.status IN (
                'scheduled',
                'live',
                'final'
              )

              AND (
                g.scheduled_start IS NULL
                OR
                g.scheduled_start >
                  now() - interval '14 days'
              )

            ORDER BY
              CASE g.status
                WHEN 'live' THEN 1
                WHEN 'final' THEN 2
                ELSE 3
              END,
              g.scheduled_start DESC NULLS LAST

            LIMIT 30
          `);

        res.setHeader(
          "Cache-Control",
          "no-store",
        );

        res.json({
          generatedAt:
            new Date().toISOString(),

          games:
            result.rows,
        });
      } catch (error) {
        console.error(
          "[INTRAMURALS] ticker failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to load intramural ticker",
        });
      }
    },
  );


  // ----------------------------------------------------------
  // AUTHENTICATED WRITES
  // ----------------------------------------------------------

  app.post(
    "/api/intramurals/teams",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      const parsed =
        createTeamSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:"Invalid team",
          errors:parsed.error.flatten(),
        });
      }

      const input =
        parsed.data;

      const client =
        await pool.connect();

      try {
        await client.query("BEGIN");

        const created =
          await client.query(
            `
              INSERT INTO ngf_intramural_teams(
                name,
                sport,
                gender,
                league,
                division,
                season,
                primary_color,
                secondary_color,
                captain_user_id
              )
              VALUES(
                $1,$2,$3,$4,$5,$6,$7,$8,$9
              )
              RETURNING *
            `,
            [
              input.name,
              input.sport,
              input.gender,
              input.league,
              input.division || null,
              input.season,
              input.primaryColor,
              input.secondaryColor,
              userId,
            ],
          );

        const team =
          created.rows[0];

        await client.query(
          `
            INSERT INTO ngf_intramural_team_members(
              team_id,
              user_id,
              role
            )
            VALUES($1,$2,'captain')
            ON CONFLICT(team_id,user_id)
            DO UPDATE SET role='captain'
          `,
          [team.team_id,userId],
        );

        await client.query("COMMIT");

        res.status(201).json(team);
      } catch (error) {
        await client.query("ROLLBACK");

        console.error(
          "[INTRAMURALS] create team failed",
          error,
        );

        res.status(500).json({
          message:"Unable to create team",
        });
      } finally {
        client.release();
      }
    },
  );

  app.post(
    "/api/intramurals/teams/:teamId/join",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      try {
        const exists =
          await pool.query(
            `
              SELECT team_id
              FROM ngf_intramural_teams
              WHERE team_id=$1
            `,
            [req.params.teamId],
          );

        if (!exists.rows[0]) {
          return res.status(404).json({
            message:"Team not found",
          });
        }

        await pool.query(
          `
            INSERT INTO ngf_intramural_team_members(
              team_id,
              user_id,
              role
            )
            VALUES($1,$2,'player')
            ON CONFLICT(team_id,user_id)
            DO NOTHING
          `,
          [
            req.params.teamId,
            userId,
          ],
        );

        res.status(201).json({
          ok:true,
        });
      } catch (error) {
        console.error(
          "[INTRAMURALS] join failed",
          error,
        );

        res.status(500).json({
          message:"Unable to join team",
        });
      }
    },
  );

  app.post(
    "/api/intramurals/games",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      const parsed =
        createGameSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:"Invalid game",
          errors:parsed.error.flatten(),
        });
      }

      const input =
        parsed.data;

      if (
        input.awayTeamId ===
        input.homeTeamId
      ) {
        return res.status(400).json({
          message:
            "A team cannot play itself",
        });
      }

      try {
        const teams =
          await pool.query(
            `
              SELECT *
              FROM ngf_intramural_teams
              WHERE team_id = ANY($1::uuid[])
            `,
            [[
              input.awayTeamId,
              input.homeTeamId,
            ]],
          );

        if (teams.rows.length !== 2) {
          return res.status(404).json({
            message:
              "One or both teams not found",
          });
        }

        const away =
          teams.rows.find(
            (team) =>
              team.team_id ===
              input.awayTeamId,
          );

        const home =
          teams.rows.find(
            (team) =>
              team.team_id ===
              input.homeTeamId,
          );

        if (
          !away ||
          !home ||
          away.sport !== home.sport
        ) {
          return res.status(400).json({
            message:
              "Teams must play the same sport",
          });
        }

        const allowed =
          await Promise.all([
            captainOfTeam(
              input.awayTeamId,
              userId,
            ),

            captainOfTeam(
              input.homeTeamId,
              userId,
            ),
          ]);

        if (!allowed.some(Boolean)) {
          return res.status(403).json({
            message:
              "A team captain must create the game",
          });
        }

        const created =
          await pool.query(
            `
              INSERT INTO ngf_intramural_games(
                sport,
                gender,
                league,
                division,
                season,
                away_team_id,
                home_team_id,
                scheduled_start,
                location,
                created_by
              )
              VALUES(
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,$10
              )
              RETURNING *
            `,
            [
              away.sport,
              away.gender,
              away.league,
              away.division,
              away.season,
              input.awayTeamId,
              input.homeTeamId,
              input.scheduledStart || null,
              input.location || null,
              userId,
            ],
          );

        res.status(201).json(
          created.rows[0],
        );
      } catch (error) {
        console.error(
          "[INTRAMURALS] create game failed",
          error,
        );

        res.status(500).json({
          message:"Unable to create game",
        });
      }
    },
  );

  app.post(
    "/api/intramurals/games/:gameId/scores",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      const parsed =
        submitScoreSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:"Invalid score",
          errors:parsed.error.flatten(),
        });
      }

      const input =
        parsed.data;

      try {
        const gameResult =
          await pool.query(
            `
              SELECT *
              FROM ngf_intramural_games
              WHERE game_id=$1
            `,
            [req.params.gameId],
          );

        const game =
          gameResult.rows[0];

        if (!game) {
          return res.status(404).json({
            message:"Game not found",
          });
        }

        if (
          input.submittedForTeamId !==
            game.away_team_id &&
          input.submittedForTeamId !==
            game.home_team_id
        ) {
          return res.status(400).json({
            message:
              "Submitting team is not in this game",
          });
        }

        const member =
          await memberOfTeam(
            input.submittedForTeamId,
            userId,
          );

        if (!member) {
          return res.status(403).json({
            message:
              "You must be a member of the submitting team",
          });
        }

        const created =
          await pool.query(
            `
              INSERT INTO ngf_intramural_score_submissions(
                game_id,
                submitted_for_team_id,
                submitted_by,
                away_score,
                home_score,
                note
              )
              VALUES($1,$2,$3,$4,$5,$6)
              RETURNING *
            `,
            [
              req.params.gameId,
              input.submittedForTeamId,
              userId,
              input.awayScore,
              input.homeScore,
              input.note || null,
            ],
          );

        res.status(201).json(
          created.rows[0],
        );
      } catch (error) {
        console.error(
          "[INTRAMURALS] score submit failed",
          error,
        );

        res.status(500).json({
          message:"Unable to submit score",
        });
      }
    },
  );


  // ----------------------------------------------------------
  // PENDING CONFIRMATIONS
  // ----------------------------------------------------------

  app.get(
    "/api/intramurals/submissions/pending",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      try {
        const result =
          await pool.query(
            `
              SELECT
                s.*,

                a.name AS away_name,
                h.name AS home_name,

                g.away_team_id,
                g.home_team_id

              FROM ngf_intramural_score_submissions s

              JOIN ngf_intramural_games g
                ON g.game_id=s.game_id

              JOIN ngf_intramural_teams a
                ON a.team_id=g.away_team_id

              JOIN ngf_intramural_teams h
                ON h.team_id=g.home_team_id

              WHERE
                s.status='pending'
                AND
                s.submitted_by <> $1
                AND EXISTS(
                  SELECT 1
                  FROM ngf_intramural_team_members m

                  WHERE
                    m.user_id=$1
                    AND m.role='captain'

                    AND m.team_id =
                      CASE
                        WHEN
                          s.submitted_for_team_id =
                          g.away_team_id
                        THEN g.home_team_id
                        ELSE g.away_team_id
                      END
                )

              ORDER BY s.created_at DESC
            `,
            [userId],
          );

        res.json(result.rows);
      } catch (error) {
        console.error(
          "[INTRAMURALS] pending read failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to load confirmations",
        });
      }
    },
  );

  app.post(
    "/api/intramurals/submissions/:submissionId/confirm",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      const client =
        await pool.connect();

      try {
        await client.query("BEGIN");

        const result =
          await client.query(
            `
              SELECT
                s.*,
                g.away_team_id,
                g.home_team_id

              FROM ngf_intramural_score_submissions s

              JOIN ngf_intramural_games g
                ON g.game_id=s.game_id

              WHERE
                s.submission_id=$1
                AND s.status='pending'

              FOR UPDATE
            `,
            [req.params.submissionId],
          );

        const submission =
          result.rows[0];

        if (!submission) {
          await client.query("ROLLBACK");

          return res.status(404).json({
            message:
              "Pending submission not found",
          });
        }

        if (
          submission.submitted_by ===
          userId
        ) {
          await client.query("ROLLBACK");

          return res.status(403).json({
            message:
              "A different team must confirm the result",
          });
        }

        const opponentTeamId =
          submission.submitted_for_team_id ===
            submission.away_team_id
            ? submission.home_team_id
            : submission.away_team_id;

        const allowed =
          await client.query(
            `
              SELECT 1
              FROM ngf_intramural_team_members
              WHERE
                team_id=$1
                AND user_id=$2
                AND role='captain'
              LIMIT 1
            `,
            [
              opponentTeamId,
              userId,
            ],
          );

        if (allowed.rowCount !== 1) {
          await client.query("ROLLBACK");

          return res.status(403).json({
            message:
              "Opponent captain confirmation required",
          });
        }

        await client.query(
          `
            UPDATE ngf_intramural_score_submissions
            SET
              status='confirmed',
              confirmed_by=$2,
              resolved_at=now()
            WHERE submission_id=$1
          `,
          [
            req.params.submissionId,
            userId,
          ],
        );

        await client.query(
          `
            UPDATE ngf_intramural_games
            SET
              away_score=$2,
              home_score=$3,
              status='final',
              verified_by=$4,
              updated_at=now()
            WHERE game_id=$1
          `,
          [
            submission.game_id,
            submission.away_score,
            submission.home_score,
            userId,
          ],
        );

        await client.query("COMMIT");

        res.json({
          ok:true,
          status:"final",
        });
      } catch (error) {
        await client.query("ROLLBACK");

        console.error(
          "[INTRAMURALS] confirmation failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to confirm result",
        });
      } finally {
        client.release();
      }
    },
  );

  app.post(
    "/api/intramurals/submissions/:submissionId/dispute",
    isAuthenticated,
    async (req,res) => {

      const userId =
        userIdOf(req);

      if (!userId) {
        return res.status(401).json({
          message:"Login required",
        });
      }

      try {
        const submission =
          await pool.query(
            `
              SELECT
                s.*,
                g.away_team_id,
                g.home_team_id
              FROM ngf_intramural_score_submissions s
              JOIN ngf_intramural_games g
                ON g.game_id=s.game_id
              WHERE
                s.submission_id=$1
                AND s.status='pending'
            `,
            [req.params.submissionId],
          );

        const row =
          submission.rows[0];

        if (!row) {
          return res.status(404).json({
            message:
              "Pending submission not found",
          });
        }

        const opponentTeamId =
          row.submitted_for_team_id ===
            row.away_team_id
            ? row.home_team_id
            : row.away_team_id;

        const allowed =
          await captainOfTeam(
            opponentTeamId,
            userId,
          );

        if (!allowed) {
          return res.status(403).json({
            message:
              "Opponent captain required",
          });
        }

        await pool.query(
          `
            UPDATE ngf_intramural_score_submissions
            SET
              status='disputed',
              confirmed_by=$2,
              resolved_at=now()
            WHERE submission_id=$1
          `,
          [
            req.params.submissionId,
            userId,
          ],
        );

        await pool.query(
          `
            UPDATE ngf_intramural_games
            SET
              status='disputed',
              updated_at=now()
            WHERE game_id=$1
          `,
          [row.game_id],
        );

        res.json({
          ok:true,
          status:"disputed",
        });
      } catch (error) {
        console.error(
          "[INTRAMURALS] dispute failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to dispute result",
        });
      }
    },
  );


  // ----------------------------------------------------------
  // ADMIN DISPUTE RESOLUTION
  // ----------------------------------------------------------

  app.post(
    "/api/intramurals/submissions/:submissionId/resolve",
    requireAdmin,
    async (req,res) => {

      const parsed =
        resolveScoreSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:"Invalid score",
        });
      }

      const userId =
        userIdOf(req);

      const client =
        await pool.connect();

      try {
        await client.query("BEGIN");

        const submission =
          await client.query(
            `
              SELECT *
              FROM ngf_intramural_score_submissions
              WHERE submission_id=$1
              FOR UPDATE
            `,
            [req.params.submissionId],
          );

        const row =
          submission.rows[0];

        if (!row) {
          await client.query("ROLLBACK");

          return res.status(404).json({
            message:
              "Submission not found",
          });
        }

        await client.query(
          `
            UPDATE ngf_intramural_score_submissions
            SET
              away_score=$2,
              home_score=$3,
              status='resolved',
              confirmed_by=$4,
              resolved_at=now()
            WHERE submission_id=$1
          `,
          [
            req.params.submissionId,
            parsed.data.awayScore,
            parsed.data.homeScore,
            userId,
          ],
        );

        await client.query(
          `
            UPDATE ngf_intramural_games
            SET
              away_score=$2,
              home_score=$3,
              status='final',
              verified_by=$4,
              updated_at=now()
            WHERE game_id=$1
          `,
          [
            row.game_id,
            parsed.data.awayScore,
            parsed.data.homeScore,
            userId,
          ],
        );

        await client.query("COMMIT");

        res.json({
          ok:true,
          status:"final",
        });
      } catch (error) {
        await client.query("ROLLBACK");

        console.error(
          "[INTRAMURALS] admin resolve failed",
          error,
        );

        res.status(500).json({
          message:
            "Unable to resolve dispute",
        });
      } finally {
        client.release();
      }
    },
  );
}
