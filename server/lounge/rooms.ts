/**
 * server/lounge/rooms.ts
 * ---------------------------------------------------------------------------
 * Real-time occupancy and chat for immersive lounge rooms.
 *
 * ONE namespace serves EVERY room. A room is a Socket.IO room inside it, keyed
 * by the id in `shared/lounge.ts`. Adding the Football Lounge therefore adds
 * no code here at all — which is the requirement, and the reason this is not
 * a copy of the root-namespace chat handler with a different string in it.
 *
 * ACCESS MODEL
 * ------------
 * The root Socket.IO namespace is disabled in `server/routes.ts`. The dedicated
 * lounge namespace authenticates the signed-in session during the handshake,
 * then this module applies room-specific authorization when a member joins.
 * Authorization failures are returned as typed `lounge:error` events so the UI
 * can explain the refusal instead of presenting an indefinite connection state.
 */

import type { Server as SocketIOServer, Namespace, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { pool } from "../db";
import {
  LOUNGE_NAMESPACE,
  LOUNGE_EVENTS,
  loungeJoinSchema,
  loungeMessageSchema,
  loungePawSchema,
  loungeBlockSchema,
  loungeReportSchema,
  getLoungeRoom,
  type LoungeRoomDefinition,
  type LoungeOccupant,
  type LoungeChatMessage,
  type LoungePawUpdate,
  type LoungeErrorCode,
} from "@shared/lounge";

/* ═══════════════════════════════════════════════════════════════════════
 * IN-MEMORY ROOM STATE
 *
 * Presence is inherently ephemeral — it describes who is connected right now,
 * and a restart genuinely ends that. Recent history is kept in the same place
 * DELIBERATELY and is documented as non-durable: persisting it would need a
 * schema migration, and inventing one silently is worse than a bounded buffer
 * that says what it is. See the known-issues note in the build report.
 * ═══════════════════════════════════════════════════════════════════════ */

interface RoomState {
  /** userId → occupant. A member with two tabs is ONE occupant. */
  occupants: Map<string, LoungeOccupant>;
  /** userId → set of socket ids, so the second tab closing is not a "left". */
  sockets: Map<string, Set<string>>;
  history: LoungeChatMessage[];
}

const rooms = new Map<string, RoomState>();

function stateFor(roomId: string): RoomState {
  let state = rooms.get(roomId);
  if (!state) {
    state = { occupants: new Map(), sockets: new Map(), history: [] };
    rooms.set(roomId, state);
  }
  return state;
}


/* ═══════════════════════════════════════════════════════════════════════
 * DURABLE CHAT + COOG PAWS
 * ═══════════════════════════════════════════════════════════════════════ */

const PERSISTED_HISTORY_LIMIT = 100;

async function loadPersistentLoungeHistory(
  roomId: string,
  userId: string,
): Promise<LoungeChatMessage[]> {
  const result = await pool.query(
    `
      SELECT
        m.id,
        m.room_id,
        m.user_id,
        m.display_name,
        m.message,
        m.sent_at,
        m.system,
        (SELECT COUNT(*)::int
           FROM lounge_message_paws p
          WHERE p.message_id = m.id) AS paw_count,
        EXISTS (
          SELECT 1
            FROM lounge_message_paws p
           WHERE p.message_id = m.id
             AND p.user_id = $2
        ) AS pawed_by_me
      FROM lounge_chat_messages m
      WHERE m.room_id = $1
      ORDER BY m.sent_at DESC
      LIMIT $3
    `,
    [roomId, userId, PERSISTED_HISTORY_LIMIT],
  );

  return result.rows.reverse().map((row) => ({
    id: String(row.id),
    roomId: String(row.room_id),
    userId: String(row.user_id),
    displayName: String(row.display_name),
    message: String(row.message),
    sentAt:
      row.sent_at instanceof Date
        ? row.sent_at.toISOString()
        : new Date(row.sent_at).toISOString(),
    pawCount: Number(row.paw_count ?? 0),
    pawedByMe: Boolean(row.pawed_by_me),
    system: Boolean(row.system),
  }));
}

async function persistLoungeMessage(message: LoungeChatMessage): Promise<void> {
  await pool.query(
    `
      INSERT INTO lounge_chat_messages
        (id, room_id, user_id, display_name, message, sent_at, system)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      message.id,
      message.roomId,
      message.userId,
      message.displayName,
      message.message,
      message.sentAt,
      Boolean(message.system),
    ],
  );
}

async function togglePersistentPaw(
  roomId: string,
  messageId: string,
  userId: string,
): Promise<{ pawed: boolean; pawCount: number } | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const messageResult = await client.query(
      `
        SELECT id
          FROM lounge_chat_messages
         WHERE id = $1
           AND room_id = $2
         FOR UPDATE
      `,
      [messageId, roomId],
    );

    if (!messageResult.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    const existing = await client.query(
      `
        SELECT 1
          FROM lounge_message_paws
         WHERE message_id = $1
           AND user_id = $2
      `,
      [messageId, userId],
    );

    let pawed: boolean;

    if (existing.rowCount) {
      await client.query(
        `DELETE FROM lounge_message_paws
          WHERE message_id = $1
            AND user_id = $2`,
        [messageId, userId],
      );
      pawed = false;
    } else {
      await client.query(
        `INSERT INTO lounge_message_paws (message_id, user_id)
         VALUES ($1, $2)`,
        [messageId, userId],
      );
      pawed = true;
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS paw_count
         FROM lounge_message_paws
        WHERE message_id = $1`,
      [messageId],
    );

    await client.query("COMMIT");

    return {
      pawed,
      pawCount: Number(countResult.rows[0]?.paw_count ?? 0),
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * RATE LIMITING — per user, not per socket, so extra tabs buy no quota.
 * ═══════════════════════════════════════════════════════════════════════ */

const windows = new Map<string, { startedAt: number; count: number }>();
const MESSAGES_PER_MINUTE = 30;

function withinRate(userId: string): boolean {
  const now = Date.now();
  const current = windows.get(userId);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MESSAGES_PER_MINUTE) return false;
  current.count += 1;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
 * ACCESS
 * ═══════════════════════════════════════════════════════════════════════ */

const UH_DOMAINS = [
  "@uh.edu",
  "@cougarnet.uh.edu",
  "@central.uh.edu",
  "@uhcl.edu",
  "@uhd.edu",
  "@uhv.edu",
];

export interface LoungeAccessResult {
  allowed: boolean;
  code?: LoungeErrorCode;
  message?: string;
}

/**
 * Exactly the checks the root namespace performed, applied per room and
 * reported specifically rather than as a generic refusal.
 *
 * Exported so it can be unit-tested without a live socket — the previous gate
 * was untestable because it only existed inside middleware.
 */
export function evaluateLoungeAccess(
  room: LoungeRoomDefinition,
  user: { email?: string | null; firstName?: string | null; lastName?: string | null;
          username?: string | null; handle?: string | null;
          isAdmin?: boolean | null; isModerator?: boolean | null; role?: string | null },
): LoungeAccessResult {
  if (!room.enabled) {
    return { allowed: false, code: "ROOM_DISABLED", message: `${room.label} is not open yet.` };
  }

  if (room.access === "moderator") {
    const role = String(user.role || "").toLowerCase();
    const privileged = user.isAdmin === true || user.isModerator === true
      || role === "admin" || role === "administrator" || role === "moderator" || role === "owner";
    if (!privileged) {
      return { allowed: false, code: "MODERATOR_ONLY", message: "This room is limited to moderators." };
    }
  }

  if (room.access === "uh") {
    const email = String(user.email || "").toLowerCase();
    if (!UH_DOMAINS.some((domain) => email.endsWith(domain))) {
      return {
        allowed: false,
        code: "UH_VERIFICATION_REQUIRED",
        message:
          "This lounge is limited to verified UH community members. Add a university email address to your account to join.",
      };
    }
    if (!user.firstName || !user.lastName) {
      return {
        allowed: false,
        code: "PROFILE_INCOMPLETE",
        message: "Add your first and last name to your profile to join this lounge.",
      };
    }
  }

  return { allowed: true };
}

/* ═══════════════════════════════════════════════════════════════════════
 * NAMESPACE
 * ═══════════════════════════════════════════════════════════════════════ */

export interface LoungeNamespaceOptions {
  io: SocketIOServer;
  /** Handshake AUTHENTICATION middleware — signed-in members only. */
  requireSocketUser: (socket: any, next: (error?: Error) => void) => void | Promise<void>;
}

export function registerLoungeNamespace(options: LoungeNamespaceOptions): Namespace {
  const { io, requireSocketUser } = options;
  const lounge = io.of(LOUNGE_NAMESPACE);

  // TEMPORARY PRODUCTION TEST MODE:
  // Allow anonymous Coog Paws testers directly into /lounge without
  // depending on the normal login/session path.
  lounge.use(((socket: any, next: any) => {
    if (process.env.DEV_GUEST_FULL_ACCESS === "true") {
      socket.data.userId = `guest-${socket.id}`;
      socket.data.user = {
        firstName: "Guest",
        lastName: "Tester",
        username: "Guest",
        handle: "Guest",
        role: "member",
        isAdmin: false,
        isModerator: false,
      };
      return next();
    }

    return requireSocketUser(socket, next);
  }) as any);

  lounge.on("connection", (socket: Socket) => {
    /** Rooms this SOCKET has joined. A socket may occupy more than one. */
    const joined = new Set<string>();

    const fail = (code: LoungeErrorCode, message: string, roomId?: string, retryable = false) => {
      socket.emit(LOUNGE_EVENTS.error, { code, message, roomId, retryable });
    };

    const occupantsOf = (roomId: string): LoungeOccupant[] =>
      Array.from(stateFor(roomId).occupants.values());

    const broadcastPresence = (roomId: string) => {
      lounge.to(roomId).emit(LOUNGE_EVENTS.presence, {
        roomId,
        occupants: occupantsOf(roomId),
      });
    };

    const systemNotice = (roomId: string, message: string): LoungeChatMessage => ({
      id: randomUUID(),
      roomId,
      userId: "system",
      displayName: "Lounge",
      message,
      sentAt: new Date().toISOString(),
      system: true,
    });

    const remember = (roomId: string, message: LoungeChatMessage) => {
      const room = getLoungeRoom(roomId);
      if (!room || room.historySize <= 0) return;
      const state = stateFor(roomId);
      state.history.push(message);
      if (state.history.length > room.historySize) {
        state.history.splice(0, state.history.length - room.historySize);
      }
    };

    /* ── join ──────────────────────────────────────────────────────── */

    socket.on(LOUNGE_EVENTS.join, async (raw: unknown) => {
      const parsed = loungeJoinSchema.safeParse(raw);
      if (!parsed.success) return fail("UNKNOWN_ROOM", "That room does not exist.");

      const { roomId } = parsed.data;
      const room = getLoungeRoom(roomId);
      if (!room) return fail("UNKNOWN_ROOM", "That room does not exist.", roomId);

      const user = socket.data.user;
      const userId = String(socket.data.userId);

      const access = evaluateLoungeAccess(room, user || {});
      if (!access.allowed) {
        return fail(access.code!, access.message!, roomId);
      }

      const state = stateFor(roomId);
      const alreadyHere = state.occupants.has(userId);
      if (!alreadyHere && state.occupants.size >= room.capacity) {
        return fail("ROOM_FULL", `${room.label} is full right now.`, roomId, true);
      }

      /* Best available name, in descending order of how the member would
       * want to be addressed. Every step is optional — a member with a blank
       * profile and no handle still gets a usable name rather than being
       * refused or rendered as an empty string. */
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
      const displayName = fullName || user?.username || user?.handle || "Cougar";

      const occupant: LoungeOccupant = { userId, displayName, seatIndex: null };
      state.occupants.set(userId, occupant);

      let socketIds = state.sockets.get(userId);
      if (!socketIds) {
        socketIds = new Set();
        state.sockets.set(userId, socketIds);
      }
      socketIds.add(socket.id);

      socket.join(roomId);
      joined.add(roomId);

      socket.emit(LOUNGE_EVENTS.joined, {
        roomId,
        label: room.label,
        venueId: room.venueId,
        you: occupant,
        occupants: occupantsOf(roomId),
      });

      try {
        const persistentHistory = await loadPersistentLoungeHistory(roomId, userId);
        if (persistentHistory.length) {
          socket.emit(LOUNGE_EVENTS.history, { roomId, messages: persistentHistory });
        } else if (state.history.length) {
          socket.emit(LOUNGE_EVENTS.history, { roomId, messages: state.history.slice() });
        }
      } catch (error) {
        console.error("[lounge] persistent history unavailable", error);
        if (state.history.length) {
          socket.emit(LOUNGE_EVENTS.history, { roomId, messages: state.history.slice() });
        }
      }

      /* Announce only a member's FIRST socket. Opening a second tab is not an
       * arrival, and the old handler announced every socket unconditionally. */
      if (!alreadyHere) {
        const notice = systemNotice(roomId, `${displayName} joined the lounge.`);
        socket.to(roomId).emit(LOUNGE_EVENTS.userJoined, { roomId, occupant });
        socket.to(roomId).emit(LOUNGE_EVENTS.chat, notice);
        remember(roomId, notice);
      }

      broadcastPresence(roomId);
    });

    /* ── message ───────────────────────────────────────────────────── */

    socket.on(LOUNGE_EVENTS.message, async (raw: unknown) => {
      const parsed = loungeMessageSchema.safeParse(raw);
      if (!parsed.success) {
        return fail("INVALID_MESSAGE", "That message could not be sent.");
      }

      const { roomId, message } = parsed.data;
      if (!joined.has(roomId)) {
        return fail("NOT_IN_ROOM", "Join the lounge before sending a message.", roomId);
      }

      const room = getLoungeRoom(roomId);
      if (!room) return fail("UNKNOWN_ROOM", "That room does not exist.", roomId);

      /* Re-check access on every message. Membership can be revoked while a
       * socket is open, and a join-time check alone would not notice. */
      const access = evaluateLoungeAccess(room, socket.data.user || {});
      if (!access.allowed) return fail(access.code!, access.message!, roomId);

      const userId = String(socket.data.userId);
      if (!withinRate(userId)) {
        return fail("RATE_LIMITED", "You are sending messages too quickly.", roomId, true);
      }

      const occupant = stateFor(roomId).occupants.get(userId);
      const payload: LoungeChatMessage = {
        id: randomUUID(),
        roomId,
        userId,
        displayName: occupant?.displayName || "Cougar",
        message,
        sentAt: new Date().toISOString(),
      };

      payload.pawCount = 0;
      payload.pawedByMe = false;

      try {
        await persistLoungeMessage(payload);
      } catch (error) {
        console.error("[lounge] message persistence failed", error);
        return fail(
          "INVALID_MESSAGE",
          "The Lounge could not save that message. Try again.",
          roomId,
          true,
        );
      }

      lounge.to(roomId).emit(LOUNGE_EVENTS.chat, payload);
      remember(roomId, payload);
    });

    /* ── Coog Paw vote ─────────────────────────────────────────────── */

    socket.on(LOUNGE_EVENTS.paw, async (raw: unknown) => {
      const parsed = loungePawSchema.safeParse(raw);
      if (!parsed.success) {
        return fail("INVALID_MESSAGE", "That Coog Paw could not be recorded.");
      }

      const { roomId, messageId } = parsed.data;
      if (!joined.has(roomId)) {
        return fail("NOT_IN_ROOM", "Join the lounge before giving a Coog Paw.", roomId);
      }

      const room = getLoungeRoom(roomId);
      if (!room) return fail("UNKNOWN_ROOM", "That room does not exist.", roomId);

      const access = evaluateLoungeAccess(room, socket.data.user || {});
      if (!access.allowed) return fail(access.code!, access.message!, roomId);

      const userId = String(socket.data.userId);

      try {
        const ownerResult = await pool.query(
          `
            SELECT user_id
            FROM lounge_chat_messages
            WHERE id = $1
              AND room_id = $2
            LIMIT 1
          `,
          [messageId, roomId],
        );

        if (ownerResult.rowCount !== 1) {
          return fail(
            "INVALID_MESSAGE",
            "That message is no longer available for voting.",
            roomId,
          );
        }

        if (String(ownerResult.rows[0].user_id) === userId) {
          return fail(
            "INVALID_MESSAGE",
            "You cannot give a Coog Paw to your own post.",
            roomId,
          );
        }

        const result = await togglePersistentPaw(roomId, messageId, userId);
        if (!result) {
          return fail(
            "INVALID_MESSAGE",
            "That message is no longer available for voting.",
            roomId,
          );
        }

        const update: LoungePawUpdate = {
          roomId,
          messageId,
          pawCount: result.pawCount,
          actorUserId: userId,
          pawed: result.pawed,
        };

        lounge.to(roomId).emit(LOUNGE_EVENTS.pawUpdated, update);
      } catch (error) {
        console.error("[lounge] Coog Paw persistence failed", error);
        return fail(
          "INVALID_MESSAGE",
          "That Coog Paw could not be saved. Try again.",
          roomId,
          true,
        );
      }
    });

    /* ── leave / disconnect ────────────────────────────────────────── */

    socket.on(LOUNGE_EVENTS.blocksRequest, async (raw: unknown) => {
      const parsed = loungeJoinSchema.safeParse(raw);
      if (!parsed.success) return fail("INVALID_MESSAGE", "Block list request was invalid.");
      const { roomId } = parsed.data;
      if (!joined.has(roomId)) return fail("NOT_IN_ROOM", "Join the lounge first.", roomId);
      try {
        const result = await pool.query(
          `SELECT blocked_user_id FROM lounge_blocks WHERE blocker_user_id = $1`,
          [String(socket.data.userId)],
        );
        socket.emit(LOUNGE_EVENTS.blocks, {
          roomId,
          blockedUserIds: result.rows.map((row) => String(row.blocked_user_id)),
        });
      } catch (error) {
        console.error("[lounge] block list failed", error);
      }
    });

    socket.on(LOUNGE_EVENTS.block, async (raw: unknown) => {
      const parsed = loungeBlockSchema.safeParse(raw);
      if (!parsed.success) return fail("INVALID_MESSAGE", "That block request was invalid.");

      const { roomId, blockedUserId } = parsed.data;
      if (!joined.has(roomId)) return fail("NOT_IN_ROOM", "Join the lounge first.", roomId);

      const userId = String(socket.data.userId);
      if (blockedUserId === userId) {
        return fail("INVALID_MESSAGE", "You cannot block yourself.", roomId);
      }

      try {
        const existing = await pool.query(
          `SELECT 1 FROM lounge_blocks
           WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
          [userId, blockedUserId],
        );

        let blocked = true;

        if (existing.rowCount) {
          await pool.query(
            `DELETE FROM lounge_blocks
             WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
            [userId, blockedUserId],
          );
          blocked = false;
        } else {
          await pool.query(
            `INSERT INTO lounge_blocks (blocker_user_id, blocked_user_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, blockedUserId],
          );
        }

        socket.emit(LOUNGE_EVENTS.blockUpdated, {
          roomId,
          blockedUserId,
          blocked,
        });
      } catch (error) {
        console.error("[lounge] block persistence failed", error);
        return fail("INVALID_MESSAGE", "Block could not be saved.", roomId, true);
      }
    });

    socket.on(LOUNGE_EVENTS.report, async (raw: unknown) => {
      const parsed = loungeReportSchema.safeParse(raw);
      if (!parsed.success) return fail("INVALID_MESSAGE", "That report was invalid.");
      const { roomId, messageId, reportedUserId, reason, details } = parsed.data;
      if (!joined.has(roomId)) return fail("NOT_IN_ROOM", "Join the lounge first.", roomId);
      const reporterUserId = String(socket.data.userId);
      if (reporterUserId === reportedUserId) return fail("INVALID_MESSAGE", "You cannot report your own post.", roomId);
      try {
        const mr = await pool.query(
          "SELECT user_id FROM lounge_chat_messages WHERE id = $1 AND room_id = $2 LIMIT 1",
          [messageId, roomId],
        );
        if (mr.rowCount !== 1 || String(mr.rows[0].user_id) !== reportedUserId)
          return fail("INVALID_MESSAGE", "That message is no longer available.", roomId);
        const reportId = randomUUID();
        await pool.query(
          "INSERT INTO lounge_reports (id, room_id, message_id, reporter_user_id, reported_user_id, reason, details) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [reportId, roomId, messageId, reporterUserId, reportedUserId, reason, details],
        );
        socket.emit(LOUNGE_EVENTS.reportSaved, { roomId, messageId, reportId });
      } catch (error) {
        console.error("[lounge] report persistence failed", error);
        return fail("INVALID_MESSAGE", "Report could not be saved.", roomId, true);
      }
    });

    const departRoom = (roomId: string) => {
      const state = rooms.get(roomId);
      if (!state) return;
      const userId = String(socket.data.userId);

      const socketIds = state.sockets.get(userId);
      socketIds?.delete(socket.id);

      socket.leave(roomId);
      joined.delete(roomId);

      /* Still present on another tab — presence is unchanged. */
      if (socketIds && socketIds.size > 0) return;

      const occupant = state.occupants.get(userId);
      state.sockets.delete(userId);
      state.occupants.delete(userId);

      if (occupant) {
        const notice = systemNotice(roomId, `${occupant.displayName} left the lounge.`);
        lounge.to(roomId).emit(LOUNGE_EVENTS.userLeft, { roomId, occupant });
        lounge.to(roomId).emit(LOUNGE_EVENTS.chat, notice);
        remember(roomId, notice);
      }
      broadcastPresence(roomId);
    };

    socket.on(LOUNGE_EVENTS.leave, (raw: unknown) => {
      const parsed = loungeJoinSchema.safeParse(raw);
      if (parsed.success) departRoom(parsed.data.roomId);
    });

    socket.on("disconnect", () => {
      for (const roomId of Array.from(joined)) departRoom(roomId);
    });
  });

  return lounge;
}

/** Test seam — presence is process-local, so suites need a way to reset it. */
export function __resetLoungeStateForTests(): void {
  rooms.clear();
  windows.clear();
}

export default registerLoungeNamespace;
