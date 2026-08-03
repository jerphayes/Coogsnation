/**
 * server/venue/context.ts
 * ---------------------------------------------------------------------------
 * Maps an authenticated CoogsNation user into the narrow permission context
 * the Virtual Venue Engine is allowed to see.
 *
 * This is the ONLY place that translation happens, and it is the reason the
 * engine performs no authorization: every decision is made here, on the
 * server, from the application's own user record. The engine receives the
 * result as fact.
 *
 * Per directive this adds NO database columns. Roles are derived from
 * information CoogsNation already stores — `users.role`, the configured owner,
 * profile completeness, and email domain — so the taxonomy can grow beyond one
 * university without a schema change or an engine change.
 */

import type { User } from "@shared/schema";
import {
  type VenueUserContext,
  type VenueRole,
  type VenuePermission,
  type VenuePermissionLevel,
  venueUserContextSchema,
} from "@shared/venue";
import { isConfiguredOwner } from "../auth";

/**
 * Domains that indicate current university affiliation.
 *
 * Deliberately server-side and deliberately soft: this decides whether someone
 * is labelled `student` rather than `alumni`. It is NOT an access gate — venue
 * access requires authentication only, so that CoogsNation can expand past a
 * single university without touching the engine.
 */
const UNIVERSITY_EMAIL_DOMAINS = [
  "@uh.edu",
  "@cougarnet.uh.edu",
  "@central.uh.edu",
  "@uhcl.edu",
  "@uhd.edu",
  "@uhv.edu",
] as const;

function hasUniversityEmail(user: User): boolean {
  const email = String(user.email || "").toLowerCase();
  return UNIVERSITY_EMAIL_DOMAINS.some((domain) => email.endsWith(domain));
}

function deriveRoles(user: User): VenueRole[] {
  const roles = new Set<VenueRole>();
  const appRole = String(user.role || "").toLowerCase();

  if (isConfiguredOwner(user.id) || appRole === "owner" || appRole === "admin") {
    roles.add("administrator");
    roles.add("moderator");
  } else if (appRole === "moderator") {
    roles.add("moderator");
  }

  // Affiliation. A member with a university address is treated as a current
  // student; every other authenticated member is alumni/community. When
  // CoogsNation introduces a real membership record, this is the single
  // function that changes.
  if (hasUniversityEmail(user)) roles.add("student");
  else roles.add("alumni");

  if (roles.size === 0) roles.add("guest");
  return [...roles];
}

function derivePermissionLevel(roles: VenueRole[]): VenuePermissionLevel {
  if (roles.includes("administrator")) return "administrator";
  if (roles.includes("moderator")) return "moderator";
  if (roles.includes("premium")) return "premium";
  if (roles.includes("guest")) return "guest";
  return "member";
}

function derivePermissions(roles: VenueRole[], level: VenuePermissionLevel): VenuePermission[] {
  const permissions = new Set<VenuePermission>(["venue:enter"]);

  if (level !== "guest") permissions.add("venue:claim-seat");
  if (level === "premium" || level === "moderator" || level === "administrator") {
    permissions.add("venue:premium-cameras");
  }
  if (level === "moderator" || level === "administrator") {
    permissions.add("venue:moderate");
  }
  if (level === "administrator") {
    permissions.add("venue:director-control");
  }
  return [...permissions];
}

/** Display name, falling back through the fields CoogsNation actually has. */
function deriveDisplayName(user: User): string {
  const handle = String(user.handle || "").trim();
  if (handle) return handle;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return "Member";
}

/**
 * Build the engine's permission context.
 *
 * The output is validated against the shared schema before it leaves this
 * function: if a future edit ever tried to hand the engine a field it is not
 * authorised to see, it fails here rather than silently widening the boundary.
 */
export function buildVenueUserContext(user: User): VenueUserContext {
  const roles = deriveRoles(user);
  const permissionLevel = derivePermissionLevel(roles);

  return venueUserContextSchema.parse({
    userId: user.id,
    displayName: deriveDisplayName(user),
    avatarId: user.profileImageUrl ? String(user.profileImageUrl) : null,
    authenticated: true,
    permissionLevel,
    roles,
    permissions: derivePermissions(roles, permissionLevel),
  });
}
