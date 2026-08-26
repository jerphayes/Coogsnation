import crypto from "node:crypto";
import type { Express } from "express";
import { z } from "zod";
import { pool } from "../db";
import { isAuthenticated } from "../auth";

const createContestSchema = z.object({
  name: z.string().trim().min(3).max(80),
  sport: z.enum([
    "College Football",
    "College Basketball",
    "Baseball",
    "Softball",
    "Soccer",
    "Volleyball",
    "Intramural",
    "Custom",
  ]),
  season: z.string().trim().min(4).max(30),
  phase: z.string().trim().min(2).max(40).default("Regular Season"),
  roundLabel: z.string().trim().max(40).optional().nullable(),
  visibility: z.enum(["private", "public"]).default("private"),
  maxPlayers: z.coerce.number().int().min(2).max(500).default(25),
});

const joinContestSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/),
});

function memberUserId(req: any): string | null {
  return typeof req.user?.id === "string" && req.user.id ? req.user.id : null;
}

function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function uniqueInviteCode(client: any): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = makeInviteCode();
    const existing = await client.query(
      "SELECT 1 FROM getem_contests WHERE invite_code = $1 LIMIT 1",
      [code],
    );
    if (existing.rowCount === 0) return code;
  }
  throw new Error("Unable to allocate unique Get'em invite code");
}

export function registerGetEmRoutes(app: Express): void {
  app.get("/api/getem/summary", async (req: any, res) => {
    try {
      const userId = memberUserId(req);

      const [contestCounts, playerCount, myContests] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'open')::int AS open,
            COUNT(*) FILTER (WHERE status = 'live')::int AS live,
            COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
          FROM getem_contests
        `),
        pool.query(`
          SELECT COUNT(DISTINCT user_id)::int AS players
          FROM getem_contest_members
        `),
        userId
          ? pool.query(
              `
                SELECT
                  c.id,
                  c.name,
                  c.sport,
                  c.season,
                  c.phase,
                  c.round_label,
                  c.visibility,
                  c.invite_code,
                  c.max_players,
                  c.status,
                  m.role,
                  m.total_points,
                  (
                    SELECT COUNT(*)::int
                    FROM getem_contest_members cm
                    WHERE cm.contest_id = c.id
                  ) AS player_count
                FROM getem_contests c
                JOIN getem_contest_members m
                  ON m.contest_id = c.id
                WHERE m.user_id = $1
                ORDER BY c.created_at DESC
                LIMIT 12
              `,
              [userId],
            )
          : Promise.resolve({ rows: [] }),
      ]);

      const row = contestCounts.rows[0] || {};
      return res.json({
        available: true,
        contests: {
          open: Number(row.open || 0),
          live: Number(row.live || 0),
          closed: Number(row.closed || 0),
        },
        players: Number(playerCount.rows[0]?.players || 0),
        myContests: myContests.rows.map((contest: any) => ({
          id: contest.id,
          name: contest.name,
          sport: contest.sport,
          season: contest.season,
          phase: contest.phase,
          roundLabel: contest.round_label,
          visibility: contest.visibility,
          inviteCode: contest.invite_code,
          maxPlayers: Number(contest.max_players),
          status: contest.status,
          role: contest.role,
          totalPoints: Number(contest.total_points || 0),
          playerCount: Number(contest.player_count || 0),
        })),
      });
    } catch (error) {
      console.error("[GETEM] Summary failed:", error);
      return res.status(500).json({ message: "Unable to load Get'em" });
    }
  });

  app.post("/api/getem/contests", isAuthenticated, async (req: any, res) => {
    const userId = memberUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Member login required" });
    }

    const parsed = createContestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid Get'em game settings",
        issues: parsed.error.flatten(),
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inviteCode = await uniqueInviteCode(client);
      const input = parsed.data;

      const contestResult = await client.query(
        `
          INSERT INTO getem_contests (
            name,
            sport,
            season,
            phase,
            round_label,
            visibility,
            invite_code,
            created_by,
            max_players
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *
        `,
        [
          input.name,
          input.sport,
          input.season,
          input.phase,
          input.roundLabel || null,
          input.visibility,
          inviteCode,
          userId,
          input.maxPlayers,
        ],
      );

      const contest = contestResult.rows[0];

      await client.query(
        `
          INSERT INTO getem_contest_members (contest_id, user_id, role)
          VALUES ($1, $2, 'owner')
          ON CONFLICT (contest_id, user_id) DO NOTHING
        `,
        [contest.id, userId],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        id: contest.id,
        name: contest.name,
        sport: contest.sport,
        season: contest.season,
        phase: contest.phase,
        roundLabel: contest.round_label,
        visibility: contest.visibility,
        inviteCode: contest.invite_code,
        maxPlayers: Number(contest.max_players),
        status: contest.status,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[GETEM] Create contest failed:", error);
      return res.status(500).json({ message: "Unable to create Get'em game" });
    } finally {
      client.release();
    }
  });

  app.post("/api/getem/contests/join", isAuthenticated, async (req: any, res) => {
    const userId = memberUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Member login required" });
    }

    const parsed = joinContestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Enter a valid 6-character invite code" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const contestResult = await client.query(
        `
          SELECT *
          FROM getem_contests
          WHERE invite_code = $1
          FOR UPDATE
        `,
        [parsed.data.inviteCode],
      );

      if (contestResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Get'em game not found" });
      }

      const contest = contestResult.rows[0];

      if (contest.status !== "open") {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "This Get'em game is not open for joining" });
      }

      const countResult = await client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM getem_contest_members
          WHERE contest_id = $1
        `,
        [contest.id],
      );

      const playerCount = Number(countResult.rows[0]?.count || 0);
      const alreadyMember = await client.query(
        `
          SELECT role, total_points
          FROM getem_contest_members
          WHERE contest_id = $1 AND user_id = $2
        `,
        [contest.id, userId],
      );

      if (alreadyMember.rowCount === 0 && playerCount >= Number(contest.max_players)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "This Get'em game is full" });
      }

      await client.query(
        `
          INSERT INTO getem_contest_members (contest_id, user_id, role)
          VALUES ($1, $2, 'player')
          ON CONFLICT (contest_id, user_id) DO NOTHING
        `,
        [contest.id, userId],
      );

      await client.query("COMMIT");

      return res.json({
        id: contest.id,
        name: contest.name,
        sport: contest.sport,
        season: contest.season,
        phase: contest.phase,
        inviteCode: contest.invite_code,
        status: contest.status,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[GETEM] Join contest failed:", error);
      return res.status(500).json({ message: "Unable to join Get'em game" });
    } finally {
      client.release();
    }
  });
}
