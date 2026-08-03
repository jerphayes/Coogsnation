/**
 * shared/venue.ts
 * ---------------------------------------------------------------------------
 * The official contract between CoogsNation and the Virtual Venue Engine.
 *
 * Imported by BOTH the client and the server, exactly like `shared/schema.ts`.
 * Nothing else may define these shapes — if a type is needed on both sides of
 * the boundary, it belongs here.
 *
 * Division of responsibility, per directive:
 *
 *   CoogsNation owns  users, authentication, authorization, profiles,
 *                     membership, permissions, commerce, content,
 *                     notifications, persistent storage.
 *
 *   The engine owns   venue rendering, venue simulation, cameras, seat
 *                     runtime state, avatar placement, the digital twin,
 *                     the AI Director.
 *
 * The engine performs NO authorization decisions. It receives a permission
 * context that the application has already computed, and renders accordingly.
 */

import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════════════
 * PERMISSION CONTEXT
 *
 * The complete set of user information the engine is permitted to see.
 * Deliberately small: no email, no profile, no membership record, no
 * credentials. The engine cannot leak what it never receives.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Coarse capability tier. The application derives this from its own user
 * record; the engine uses it only for presentation decisions such as whether
 * to offer a premium camera preset.
 */
export const VENUE_PERMISSION_LEVELS = [
  "guest",
  "member",
  "premium",
  "moderator",
  "administrator",
] as const;
export type VenuePermissionLevel = (typeof VENUE_PERMISSION_LEVELS)[number];

/**
 * Descriptive affiliations. Additive by design — a new role here must never
 * require an engine change, which is why the engine only ever tests
 * `roles.includes(...)` for presentation and never for access.
 */
export const VENUE_ROLES = [
  "guest",
  "student",
  "alumni",
  "booster",
  "premium",
  "moderator",
  "administrator",
] as const;
export type VenueRole = (typeof VENUE_ROLES)[number];

/**
 * Granular capabilities the application grants for this session.
 * The application decides these. The engine treats them as facts.
 */
export const VENUE_PERMISSIONS = [
  "venue:enter",
  "venue:claim-seat",
  "venue:premium-cameras",
  "venue:director-control",
  "venue:moderate",
] as const;
export type VenuePermission = (typeof VENUE_PERMISSIONS)[number];

export const venueUserContextSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  avatarId: z.string().nullable(),
  authenticated: z.boolean(),
  permissionLevel: z.enum(VENUE_PERMISSION_LEVELS),
  roles: z.array(z.enum(VENUE_ROLES)),
  permissions: z.array(z.enum(VENUE_PERMISSIONS)),
});

/** Exactly the seven fields the directive authorises the engine to consume. */
export type VenueUserContext = z.infer<typeof venueUserContextSchema>;

/** Convenience predicate. Presentation only — never an access decision. */
export function hasVenuePermission(
  context: VenueUserContext | null | undefined,
  permission: VenuePermission,
): boolean {
  return !!context?.permissions?.includes(permission);
}

/* ═══════════════════════════════════════════════════════════════════════
 * VENUES
 * ═══════════════════════════════════════════════════════════════════════ */

export const VENUE_IDS = ["football", "basketball", "baseball", "concert"] as const;
export type VenueId = (typeof VENUE_IDS)[number];

export const venueIdSchema = z.enum(VENUE_IDS);

export function isVenueId(value: unknown): value is VenueId {
  return typeof value === "string" && (VENUE_IDS as readonly string[]).includes(value);
}

export interface VenueSummary {
  id: VenueId;
  label: string;
  category: string;
  /** Seats produced by the geometry. Measured, never hard-coded. */
  capacity: number;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SEAT CLAIMS
 *
 * The engine owns RUNTIME seat state. The application owns the PERSISTENT
 * record. These types describe the persistent side and the API that carries
 * it; the engine reaches them only through an adapter.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Engine-derived stable seat identity, e.g.
 *   `seat:basketball:club:202:3:14`
 * Derived from venue structure rather than randomly assigned, so a seat keeps
 * its history across rebuilds. See docs/venue-engine/OBJECT-MODEL.md.
 */
export const seatPersistentIdSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^seat:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:\d+:\d+$/, "invalid seat persistent id");

export const venueSeatClaimSchema = z.object({
  venueId: venueIdSchema,
  seatPersistentId: seatPersistentIdSchema,
  /** Engine-local index. A hint for fast re-seating; never trusted as identity. */
  seatIndex: z.number().int().nonnegative().max(1_000_000),
  section: z.string().max(32),
  row: z.number().int().positive().max(1000),
  seatNumber: z.number().int().positive().max(1000),
});

export type VenueSeatClaimRequest = z.infer<typeof venueSeatClaimSchema>;

export interface VenueSeatClaim extends VenueSeatClaimRequest {
  id: string;
  userId: string;
  displayName: string;
  claimedAt: string;
}

export const venueSeatReleaseSchema = z.object({
  venueId: venueIdSchema,
  seatPersistentId: seatPersistentIdSchema,
});

/* ═══════════════════════════════════════════════════════════════════════
 * EVENT BRIDGE
 *
 * Application-level events only. Frame updates, render events and internal
 * engine traffic never cross this boundary — they stay inside the engine's
 * own EventBus, which remains untouched.
 * ═══════════════════════════════════════════════════════════════════════ */

export const VENUE_BRIDGE_EVENTS = [
  "venue:entered",
  "venue:exited",
  "venue:seat-claimed",
  "venue:seat-released",
  "venue:avatar-entered",
  "venue:avatar-exited",
  "venue:purchase-completed",
  "venue:director-notification",
  "venue:error",
] as const;
export type VenueBridgeEventName = (typeof VENUE_BRIDGE_EVENTS)[number];

export interface VenueBridgeEvent<T = unknown> {
  name: VenueBridgeEventName;
  venueId: VenueId;
  userId: string | null;
  at: number;
  payload: T;
}

export interface VenueEnteredPayload { venueId: VenueId; capacity: number; sections: number; }
export interface VenueExitedPayload { venueId: VenueId; durationMs: number; }
export interface VenueSeatEventPayload {
  seatPersistentId: string;
  seatIndex: number;
  section: string;
  row: number;
  seatNumber: number;
}
export interface VenueAvatarEventPayload { userId: string; displayName: string; seatIndex: number | null; }
export interface VenueDirectorNotificationPayload { channel: string; action: string; reason?: string; }
export interface VenueErrorPayload { scope: string; message: string; fatal: boolean; }

/* ═══════════════════════════════════════════════════════════════════════
 * API ROUTES
 * Named once so client and server cannot drift.
 * ═══════════════════════════════════════════════════════════════════════ */

export const VENUE_API = {
  context: "/api/venues/context",
  list: "/api/venues",
  claims: (venueId: string) => `/api/venues/${venueId}/claims`,
  claim: "/api/venues/claim",
  release: "/api/venues/release",
} as const;
