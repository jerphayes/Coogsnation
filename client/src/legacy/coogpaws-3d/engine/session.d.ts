/**
 * client/src/venue-engine/session.d.ts
 * ---------------------------------------------------------------------------
 * Typed declaration for the engine's entry module.
 *
 * `session.js` is JavaScript, by directive. This file is the only thing the
 * TypeScript application sees of it, which is what makes the boundary real
 * rather than advisory.
 */

import type { VenueId } from "@shared/venue";
import type { VenueSession, VenueSessionOptions } from "./index";

/**
 * Boot a venue into a container element.
 *
 * MUST be reached through a dynamic import so that Three.js and the engine
 * stay out of the application's initial bundle:
 *
 * ```ts
 * const { createVenueSession } = await import("@/venue-engine/session");
 * const session = await createVenueSession({ container, venueId, user, persistence });
 * ```
 */
export function createVenueSession(options: VenueSessionOptions): Promise<VenueSession>;

/** Venues this build can render, read from the engine's own registry. */
export function availableVenues(): Array<{ id: VenueId; label: string; category: string }>;
