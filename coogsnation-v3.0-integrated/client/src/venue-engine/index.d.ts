/**
 * client/src/venue-engine/index.d.ts
 * ---------------------------------------------------------------------------
 * The typed boundary between CoogsNation and the Virtual Venue Engine.
 *
 * The engine internals stay JavaScript, by directive. This file describes ONLY
 * the surface the application is allowed to touch. It is deliberately narrower
 * than what the engine exposes at runtime: anything absent here is internal,
 * and TypeScript will refuse to let application code reach it.
 *
 * That narrowness is the point. A `.d.ts` that mirrored every engine export
 * would document the engine; this one enforces the boundary.
 */

import type {
  VenueUserContext,
  VenueId,
  VenueSeatClaim,
  VenueBridgeEvent,
  VenueBridgeEventName,
} from "@shared/venue";

/* ═══════════════════════════════════════════════════════════════════════
 * ADAPTERS — what the APPLICATION supplies to the engine
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Persistent seat storage. The engine never touches the database; every
 * persistent read or write goes through this adapter, which the application
 * implements against its own `IStorage`.
 */
export interface VenuePersistenceAdapter {
  loadSeatOwnership(venueId: VenueId): Promise<VenueSeatClaim[]>;
  saveSeatClaim(venueId: VenueId, claim: SeatClaimInput): Promise<void>;
  clearSeatClaim(venueId: VenueId, seatPersistentId: string): Promise<void>;
  loadProfile(userId: string): Promise<Record<string, unknown> | null>;
  saveProfile(userId: string, profile: Record<string, unknown>): Promise<void>;
}

export interface SeatClaimInput {
  seatPersistentId: string;
  seatIndex: number;
  section: string;
  row: number;
  seatNumber: number;
  userId: string;
  displayName: string;
}

/** Application-supplied logger. Keeps engine output inside app logging. */
export interface VenueLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * EVENT BRIDGE
 * ═══════════════════════════════════════════════════════════════════════ */

export interface VenueEventBridge {
  /** Subscribe to an application-level venue event. Returns an unsubscribe. */
  on<T = unknown>(
    name: VenueBridgeEventName,
    handler: (event: VenueBridgeEvent<T>) => void,
  ): () => void;
  /** Subscribe to every forwarded event. */
  onAny(handler: (event: VenueBridgeEvent) => void): () => void;
  /** Publish an application event INTO the engine. */
  emit<T = unknown>(name: VenueBridgeEventName, payload: T): void;
  dispose(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SESSION — the only object the application holds
 * ═══════════════════════════════════════════════════════════════════════ */

export interface VenueSessionOptions {
  /** DOM element the engine renders into. The engine never owns the page. */
  container: HTMLElement;
  venueId: VenueId;
  /** Authenticated user context, computed by the application. */
  user: VenueUserContext;
  /**
   * Persistent storage adapter. Omit to use the default CoogsNation API
   * adapter, which is what the application does; supply one only for tests.
   */
  persistence?: VenuePersistenceAdapter;
  logger?: VenueLogger;
  /** Progress during construction, 0..1. */
  onProgress?: (fraction: number, message: string) => void;
}

export interface VenueSessionStats {
  venueId: VenueId;
  label: string;
  seats: number;
  sections: number;
  twinObjects: number;
  cameraPresets: string[];
}

/**
 * A live venue. Created by `createVenueSession`, destroyed by `dispose()`.
 *
 * Everything the application can do to a running venue is on this interface.
 * There is no escape hatch to the renderer, the registry or the module graph —
 * deliberately, so the boundary cannot erode through use.
 */
export interface VenueSession {
  readonly venueId: VenueId;
  readonly stats: VenueSessionStats;
  readonly bridge: VenueEventBridge;

  /** Fly to a named camera preset. False if the venue does not declare it. */
  setCameraView(name: string): boolean;
  /** Camera preset names this venue declares. */
  cameraViews(): string[];

  /** Move the local user to a seat. Resolves false if unavailable. */
  claimSeat(seatIndex: number): Promise<boolean>;
  releaseSeat(): Promise<void>;

  /** Read-only census, e.g. `{ empty, ai, user }`. */
  occupancy(): Record<string, number>;

  /** Suspend rendering without tearing down — used when a tab is hidden. */
  pause(): void;
  resume(): void;

  /** Release GPU resources, listeners and the animation frame loop. */
  dispose(): Promise<void>;
}
