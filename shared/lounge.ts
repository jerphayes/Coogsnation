/**
 * shared/lounge.ts
 * ---------------------------------------------------------------------------
 * The contract for immersive LOUNGE ROOMS — real-time social spaces attached
 * to a rendered venue.
 *
 * Imported by BOTH the client and the server, exactly like `shared/venue.ts`.
 * A room is DATA here, never code: adding the Football Lounge is an entry in
 * `LOUNGE_ROOMS`, not a new page, a new namespace, a new hook or a new socket
 * handler. That is the whole point of this file. The previous Coog Paws chat
 * was a bespoke page bound to the root Socket.IO namespace, which meant a
 * second room could only ever be a copy of the first.
 *
 * RELATIONSHIP TO shared/venue.ts
 * -------------------------------
 * `venue.ts` owns rendering and seating. This file owns occupancy and talk.
 * A room POINTS AT a venue by id; the venue knows nothing about chat, and the
 * chat knows nothing about geometry. Either can change without the other.
 */

import { z } from "zod";
import { VENUE_IDS, type VenueId } from "./venue";

/* ═══════════════════════════════════════════════════════════════════════
 * ROOMS
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Access gate for a room. The SERVER enforces these; the client uses them
 * only to explain itself. Never trust a client-side reading of this.
 *
 *   open      — any authenticated CoogsNation member
 *   uh        — authenticated AND verified UH-community email AND full name
 *   moderator — moderators and administrators
 */
export const LOUNGE_ACCESS = ["open", "uh", "moderator"] as const;
export type LoungeAccess = (typeof LOUNGE_ACCESS)[number];

export interface LoungeRoomDefinition {
  id: string;
  label: string;
  description: string;
  /** The venue rendered behind this room. */
  venueId: VenueId;
  access: LoungeAccess;
  /**
   * Live rooms are joinable. A declared-but-disabled room documents the
   * roadmap without exposing a half-built space — the registry is the one
   * place a future lounge gets switched on.
   */
  enabled: boolean;
  /** Simultaneous occupants. The lounge seats eight; the room may hold more. */
  capacity: number;
  /** Recent messages replayed to a member on join. 0 disables replay. */
  historySize: number;
}

export const LOUNGE_ROOMS: Record<string, LoungeRoomDefinition> = {
  coogpaws: {
    id: "coogpaws",
    label: "Coog Paws Lounge",
    description: "The Cougar community lounge, with a live projection in the middle.",
    venueId: "coogpaws",
    /* Open to every authenticated member. Coog Paws is the community's front
     * door, and gating it on a university email address excluded alumni,
     * families and supporters who are exactly who it is for. The "uh" level
     * below remains available for a room deliberately designated as
     * UH-restricted. */
    access: "open",
    enabled: true,
    capacity: 64,
    historySize: 50,
  },

  /* The roadmap, declared rather than duplicated. Each of these becomes live
   * by flipping `enabled` once its venue is authored — no new socket handler,
   * no new page, no new hook. */
  "football-lounge": {
    id: "football-lounge",
    label: "Football Lounge",
    description: "Watch-party lounge for football.",
    venueId: "football",
    access: "open",
    enabled: false,
    capacity: 64,
    historySize: 50,
  },
  "basketball-lounge": {
    id: "basketball-lounge",
    label: "Basketball Lounge",
    description: "Watch-party lounge for basketball.",
    venueId: "basketball",
    access: "open",
    enabled: false,
    capacity: 64,
    historySize: 50,
  },
  "baseball-lounge": {
    id: "baseball-lounge",
    label: "Baseball Lounge",
    description: "Watch-party lounge for baseball.",
    venueId: "baseball",
    access: "open",
    enabled: false,
    capacity: 64,
    historySize: 50,
  },
  /* Reserved for a future UH-restricted room. Declared so the "uh" access
   * level stays exercised by the test suite even though no enabled room uses
   * it — an access level nothing tests is an access level that rots. */
  "uh-verified-lounge": {
    id: "uh-verified-lounge",
    label: "Verified UH Lounge",
    description: "A lounge limited to verified UH community members.",
    venueId: "coogpaws",
    access: "uh",
    enabled: false,
    capacity: 64,
    historySize: 50,
  },
  "moderator-lounge": {
    id: "moderator-lounge",
    label: "Moderator Lounge",
    description: "Private room for moderators and administrators.",
    venueId: "coogpaws",
    access: "moderator",
    enabled: false,
    capacity: 16,
    historySize: 100,
  },
};

export function getLoungeRoom(roomId: string): LoungeRoomDefinition | null {
  return Object.prototype.hasOwnProperty.call(LOUNGE_ROOMS, roomId)
    ? LOUNGE_ROOMS[roomId]
    : null;
}

export function listLoungeRooms(): LoungeRoomDefinition[] {
  return Object.values(LOUNGE_ROOMS).filter((room) => room.enabled);
}

export const loungeRoomIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "invalid room id");

/* ═══════════════════════════════════════════════════════════════════════
 * CONNECTION STATE
 *
 * Four states, reported honestly. There is deliberately no "assume connected"
 * value: the previous page rendered "Connecting…" forever because a rejected
 * handshake produced no state at all, and the cure for that is a state
 * machine that has somewhere to put a refusal.
 * ═══════════════════════════════════════════════════════════════════════ */

export const LOUNGE_CONNECTION_STATES = [
  "connecting",
  "connected",
  "disconnected",
  "error",
] as const;
export type LoungeConnectionState = (typeof LOUNGE_CONNECTION_STATES)[number];

/* ═══════════════════════════════════════════════════════════════════════
 * WIRE EVENTS
 *
 * Named once so client and server cannot drift, exactly as VENUE_API does.
 * ═══════════════════════════════════════════════════════════════════════ */

export const LOUNGE_NAMESPACE = "/lounge";

export const LOUNGE_EVENTS = {
  /** client → server */
  join: "lounge:join",
  leave: "lounge:leave",
  message: "lounge:message",
  /** server → client */
  joined: "lounge:joined",
  history: "lounge:history",
  chat: "lounge:chat",
  presence: "lounge:presence",
  userJoined: "lounge:user-joined",
  userLeft: "lounge:user-left",
  error: "lounge:error",
} as const;

/* ── payload schemas ─────────────────────────────────────────────────── */

export const loungeJoinSchema = z.object({ roomId: loungeRoomIdSchema }).strict();

export const loungeMessageSchema = z
  .object({
    roomId: loungeRoomIdSchema,
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export type LoungeJoinRequest = z.infer<typeof loungeJoinSchema>;
export type LoungeMessageRequest = z.infer<typeof loungeMessageSchema>;

/* ── server → client shapes ──────────────────────────────────────────── */

export interface LoungeOccupant {
  userId: string;
  displayName: string;
  /** Seat index in the rendered venue, when the member has claimed one. */
  seatIndex: number | null;
}

export interface LoungeChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  sentAt: string;
  /** System notices (join/leave) carry no author and render differently. */
  system?: boolean;
}

export interface LoungeJoinedPayload {
  roomId: string;
  label: string;
  venueId: VenueId;
  you: LoungeOccupant;
  occupants: LoungeOccupant[];
}

export interface LoungePresencePayload {
  roomId: string;
  occupants: LoungeOccupant[];
}

export interface LoungeMembershipPayload {
  roomId: string;
  occupant: LoungeOccupant;
}

/**
 * A refusal the member can act on.
 *
 * `code` exists so the client can distinguish "you personally cannot enter
 * this room" from "the room is full" from "you are sending too fast" without
 * parsing prose. A generic error string is what made the original bug
 * invisible.
 */
export const LOUNGE_ERROR_CODES = [
  "UNAUTHENTICATED",
  "UH_VERIFICATION_REQUIRED",
  "PROFILE_INCOMPLETE",
  "MODERATOR_ONLY",
  "UNKNOWN_ROOM",
  "ROOM_DISABLED",
  "ROOM_FULL",
  "RATE_LIMITED",
  "INVALID_MESSAGE",
  "NOT_IN_ROOM",
] as const;
export type LoungeErrorCode = (typeof LOUNGE_ERROR_CODES)[number];

export interface LoungeErrorPayload {
  code: LoungeErrorCode;
  message: string;
  roomId?: string;
  /** True when retrying without changing anything could succeed. */
  retryable: boolean;
}

/** Guard used on the client when narrowing an unknown venue id from a room. */
export function isKnownVenueId(value: unknown): value is VenueId {
  return typeof value === "string" && (VENUE_IDS as readonly string[]).includes(value);
}
