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
 *
 * WHY THE ACCESS GATE MOVED, AND WHAT THAT FIXES
 * ----------------------------------------------
 * The root namespace applies its UH-community check as CONNECT MIDDLEWARE:
 *
 *     io.of("/").use(requireUHSocketUser)
 *
 * A middleware refusal fails the Socket.IO HANDSHAKE. The browser never gets a
 * `connect` event — it gets `connect_error`, which the old page did not
 * listen for. So a member without a UH-domain address, or without a first and
 * last name on file, sat on "Connecting…" indefinitely with no error anywhere
 * in the UI. The chat was not broken; it was refusing them silently.
 *
 * Here the split is deliberate:
 *
 *   handshake middleware  → AUTHENTICATION only. Are you a signed-in member?
 *   join-time check       → AUTHORISATION. May you enter THIS room?
 *
 * That is not a weakening. The same UH verification runs, with the same
 * conditions, enforced on the same server, and a member who fails it still
 * cannot enter or speak. What changes is that the refusal now arrives on a
 * live socket as a typed `lounge:error` the interface can render, instead of
 * being indistinguishable from a network stall. It is also strictly more
 * capable: rooms with different access levels can coexist in one namespace,
 * which a single connect-time gate cannot express.
 *
 * Authentication failures still fail the handshake, as they must — an
 * unauthenticated socket has no business being connected at all.
 */

import type { Server as SocketIOServer, Namespace, Socket } from "socket.io";
import { randomUUID } from "crypto";
import {
  LOUNGE_NAMESPACE,
  LOUNGE_EVENTS,
  loungeJoinSchema,
  loungeMessageSchema,
  getLoungeRoom,
  type LoungeRoomDefinition,
  type LoungeOccupant,
  type LoungeChatMessage,
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

  lounge.use(requireSocketUser as any);

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

    socket.on(LOUNGE_EVENTS.join, (raw: unknown) => {
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

      if (state.history.length) {
        socket.emit(LOUNGE_EVENTS.history, { roomId, messages: state.history.slice() });
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

    socket.on(LOUNGE_EVENTS.message, (raw: unknown) => {
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

      lounge.to(roomId).emit(LOUNGE_EVENTS.chat, payload);
      remember(roomId, payload);
    });

    /* ── leave / disconnect ────────────────────────────────────────── */

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
