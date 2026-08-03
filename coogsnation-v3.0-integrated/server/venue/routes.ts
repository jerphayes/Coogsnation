/**
 * server/venue/routes.ts
 * ---------------------------------------------------------------------------
 * Venue API. Follows the existing `server/commerce/routes.ts` pattern rather
 * than growing `server/routes.ts`, which is already 127 KB.
 *
 * Authorization lives entirely here. The engine receives results, never rules.
 *
 * Venue access requires an authenticated user and nothing more — per directive,
 * university membership is NOT hardcoded, so CoogsNation can expand beyond a
 * single institution without an engine change.
 */

import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { buildVenueUserContext } from "./context";
import {
  VENUE_API,
  VENUE_IDS,
  venueIdSchema,
  venueSeatClaimSchema,
  venueSeatReleaseSchema,
  hasVenuePermission,
  type VenueSummary,
} from "@shared/venue";

/** Capacities are measured by the engine at build time; mirrored here for the
 *  venue picker so the list renders without downloading the engine. */
const VENUE_CATALOG: VenueSummary[] = [
  { id: "football", label: "Generic Stadium", category: "football", capacity: 58298 },
  { id: "basketball", label: "Generic Arena", category: "basketball", capacity: 10630 },
  { id: "baseball", label: "Generic Ballpark", category: "baseball", capacity: 4916 },
  { id: "concert", label: "Concert Mode", category: "concert", capacity: 16260 },
];

export function registerVenueRoutes(app: Express, isAuthenticated: RequestHandler): void {
  /** Venue list. Authenticated so the catalogue is not public surface. */
  app.get(VENUE_API.list, isAuthenticated, (_req, res) => {
    res.json({ venues: VENUE_CATALOG });
  });

  /**
   * The engine's permission context. This endpoint is the boundary: the client
   * fetches it and hands the result to the engine. Nothing else about the user
   * crosses over.
   */
  app.get(VENUE_API.context, isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json({ context: buildVenueUserContext(user) });
    } catch (error) {
      console.error("[venue] context build failed:", error);
      res.status(500).json({ message: "Failed to build venue context" });
    }
  });

  /** Existing claims for a venue, so the engine can restore seat ownership. */
  app.get("/api/venues/:venueId/claims", isAuthenticated, async (req, res) => {
    const parsed = venueIdSchema.safeParse(req.params.venueId);
    if (!parsed.success) return res.status(400).json({ message: "Unknown venue" });
    try {
      const claims = await storage.getVenueSeatClaims(parsed.data);
      res.json({ claims });
    } catch (error) {
      console.error("[venue] claim load failed:", error);
      res.status(500).json({ message: "Failed to load seat claims" });
    }
  });

  /** Claim a seat. The server is authoritative; the engine reflects. */
  app.post(VENUE_API.claim, isAuthenticated, async (req, res) => {
    const parsed = venueSeatClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid seat claim", issues: parsed.error.issues });
    }
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const context = buildVenueUserContext(user);
      if (!hasVenuePermission(context, "venue:claim-seat")) {
        return res.status(403).json({ message: "Seat claiming is not available for this account" });
      }

      const claim = await storage.claimVenueSeat({
        ...parsed.data,
        userId: user.id,
        displayName: context.displayName,
      });
      if (!claim) return res.status(409).json({ message: "Seat is already claimed" });
      res.status(201).json({ claim });
    } catch (error) {
      console.error("[venue] seat claim failed:", error);
      res.status(500).json({ message: "Failed to claim seat" });
    }
  });

  /** Release a seat. A user may only release their own. */
  app.post(VENUE_API.release, isAuthenticated, async (req, res) => {
    const parsed = venueSeatReleaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid seat release", issues: parsed.error.issues });
    }
    try {
      const released = await storage.releaseVenueSeat(
        parsed.data.venueId,
        parsed.data.seatPersistentId,
        req.user!.id,
      );
      if (!released) return res.status(404).json({ message: "No matching seat claim" });
      res.json({ released: true });
    } catch (error) {
      console.error("[venue] seat release failed:", error);
      res.status(500).json({ message: "Failed to release seat" });
    }
  });
}

export { VENUE_CATALOG, VENUE_IDS };
