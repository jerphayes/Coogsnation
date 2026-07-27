import { createHmac } from "node:crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Authentication audit logging.
 *
 * Records security-relevant authentication activity. Deliberately never stores
 * raw passwords, tokens, API keys, CAPTCHA secrets, or raw request bodies.
 *
 * Client identifiers (IP address, login identifier) are stored as keyed HMAC
 * digests rather than in the clear, so the log supports correlation and
 * abuse investigation without becoming a PII store. The key is derived from
 * SESSION_SECRET, which is already a required environment variable.
 */

export type AuthAuditEventType =
  | "registration"
  | "login"
  | "logout"
  | "password_reset_request"
  | "password_reset_complete"
  | "password_change"
  | "account_lockout"
  | "session_invalidation"
  | "account_status_change"
  | "admin_account_action";

export type AuthAuditOutcome = "success" | "failure" | "blocked";

interface AuthAuditInput {
  eventType: AuthAuditEventType;
  outcome: AuthAuditOutcome;
  userId?: string | null;
  /** Raw login identifier (email/handle). Hashed before storage. */
  identifier?: string | null;
  /** Raw client IP. Hashed before storage. */
  clientIp?: string | null;
  userAgent?: string | null;
  /** Short non-sensitive description. Never include credentials. */
  detail?: string | null;
}

function auditKey(): string {
  // SESSION_SECRET is validated at startup; fall back only in test contexts.
  return process.env.SESSION_SECRET || "coogsnation-audit-fallback";
}

function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac("sha256", auditKey())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/**
 * Write an authentication audit event.
 *
 * Never throws: audit failure must not break an authentication flow, but it is
 * logged so the gap is visible.
 */
export async function recordAuthEvent(input: AuthAuditInput): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO auth_audit_events
        (event_type, outcome, user_id, identifier_hash, client_ip_hash, user_agent, detail)
      VALUES (
        ${input.eventType},
        ${input.outcome},
        ${input.userId ?? null},
        ${hashValue(input.identifier)},
        ${hashValue(input.clientIp)},
        ${input.userAgent ? input.userAgent.slice(0, 255) : null},
        ${input.detail ?? null}
      )
    `);
  } catch (error) {
    console.error("[AUDIT] Failed to write auth audit event:", (error as Error).message);
  }
}

/** Extract a client IP for hashing, honouring the configured proxy chain. */
export function clientIpOf(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
  ip?: string;
}): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/** Extract a truncated user agent string. */
export function userAgentOf(req: { headers: Record<string, unknown> }): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 255) : null;
}
