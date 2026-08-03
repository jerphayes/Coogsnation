import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createAdminSafeUser, users } from "@shared/schema";
import { db, pool } from "./db";
import { storage } from "./storage";
import { PasswordService } from "./passwordService";
import { clientIpOf, recordRequiredAuthEvent, userAgentOf } from "./authAudit";
import { isConfiguredOwner, requireAdmin, requireOwner } from "./auth";
import { AIServiceError } from "./ai/types";
import { getAdminAIService, loadAdminAIConfig, type AdminAISnapshot } from "./adminAI";

const accountStatusSchema = z.enum(["active", "suspended", "disabled", "pending"]);
const roleSchema = z.enum(["member", "admin"]);

const securedActionSchema = z.object({
  reason: z.string().trim().min(3, "A reason of at least 3 characters is required").max(500),
  currentPassword: z.string().min(1, "Current password is required").max(200),
}).strict();

const statusActionSchema = securedActionSchema.extend({
  status: accountStatusSchema,
}).strict();

const roleActionSchema = securedActionSchema.extend({
  role: roleSchema,
}).strict();

const adminAIQuestionSchema = z.object({
  question: z.string().trim().min(1).max(3_000),
}).strict();

class AdminActionError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "AdminActionError";
  }
}

function cleanReason(reason: string): string {
  return reason.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

async function confirmAdminPassword(actorId: string, currentPassword: string) {
  const actor = await storage.getUser(actorId);
  if (!actor || actor.role !== "admin") {
    throw new AdminActionError("Administrator account could not be verified", 403);
  }
  if (!actor.isLocalAccount || !actor.passwordHash) {
    throw new AdminActionError(
      "This administrator account cannot confirm sensitive actions with a local password",
      409,
    );
  }
  const valid = await PasswordService.verifyPassword(currentPassword, actor.passwordHash);
  if (!valid) throw new AdminActionError("Current password is incorrect", 403);
  return actor;
}

function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    return String(pkg.version || "unknown");
  } catch {
    return "unknown";
  }
}

export interface AdminAuditEvent {
  id: string;
  occurredAt: string | Date;
  eventType: string;
  outcome: string;
  userId: string | null;
  handle: string | null;
  firstName: string | null;
  lastName: string | null;
  detail: string | null;
}

export async function getAdminAuditEvents(limit = 100, userId?: string): Promise<AdminAuditEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const query = userId
    ? {
        text: `SELECT a.id::text,
                      a.occurred_at AS "occurredAt",
                      a.event_type AS "eventType",
                      a.outcome,
                      a.user_id AS "userId",
                      u.handle,
                      u.first_name AS "firstName",
                      u.last_name AS "lastName",
                      a.detail
               FROM auth_audit_events a
               LEFT JOIN users u ON u.id = a.user_id
               WHERE a.user_id = $1
               ORDER BY a.occurred_at DESC
               LIMIT $2`,
        values: [userId, safeLimit],
      }
    : {
        text: `SELECT a.id::text,
                      a.occurred_at AS "occurredAt",
                      a.event_type AS "eventType",
                      a.outcome,
                      a.user_id AS "userId",
                      u.handle,
                      u.first_name AS "firstName",
                      u.last_name AS "lastName",
                      a.detail
               FROM auth_audit_events a
               LEFT JOIN users u ON u.id = a.user_id
               ORDER BY a.occurred_at DESC
               LIMIT $1`,
        values: [safeLimit],
      };
  const result = await pool.query(query.text, query.values);
  return result.rows;
}

export async function buildAdminOverview() {
  const [platform, statusRows, securityRows] = await Promise.all([
    storage.getAdminStats(),
    pool.query(
      `SELECT account_status AS status, COUNT(*)::int AS count
       FROM users
       GROUP BY account_status`,
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'login' AND outcome IN ('failure', 'blocked')
                           AND occurred_at >= now() - interval '24 hours')::int AS auth_failures_24h,
         COUNT(*) FILTER (WHERE event_type = 'admin_account_action'
                           AND occurred_at >= now() - interval '24 hours')::int AS admin_actions_24h
       FROM auth_audit_events`,
    ),
  ]);

  const accountStatus = { active: 0, suspended: 0, disabled: 0, pending: 0 };
  for (const row of statusRows.rows) {
    if (row.status in accountStatus) {
      accountStatus[row.status as keyof typeof accountStatus] = Number(row.count || 0);
    }
  }

  return {
    version: packageVersion(),
    generatedAt: new Date().toISOString(),
    ...platform,
    accountStatus,
    authFailures24h: Number(securityRows.rows[0]?.auth_failures_24h || 0),
    adminActions24h: Number(securityRows.rows[0]?.admin_actions_24h || 0),
  };
}

export async function buildSystemStatus() {
  let database: "operational" | "unavailable" = "operational";
  try {
    await pool.query("SELECT 1");
  } catch {
    database = "unavailable";
  }

  let adminAI: Record<string, unknown>;
  try {
    const config = loadAdminAIConfig();
    adminAI = {
      configured: config.enabled && Boolean(config.model) && (config.provider === "ollama" || Boolean(config.apiKey)),
      enabled: config.enabled,
      provider: config.enabled ? config.provider : null,
      model: config.enabled ? config.model : null,
      readOnly: true,
    };
  } catch (error) {
    adminAI = {
      configured: false,
      enabled: false,
      readOnly: true,
      error: (error as Error).message,
    };
  }

  return {
    version: packageVersion(),
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    generatedAt: new Date().toISOString(),
    services: {
      database,
      email: {
        configured: Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL),
      },
      recaptcha: {
        configured: Boolean(process.env.RECAPTCHA_SECRET_KEY),
        developmentBypass: process.env.NODE_ENV !== "production" && process.env.RECAPTCHA_DEV_BYPASS === "true",
      },
      publicAI: {
        enabled: process.env.AI_ENABLED === "true",
        provider: process.env.AI_ENABLED === "true" ? process.env.AI_PROVIDER || null : null,
        model: process.env.AI_ENABLED === "true" ? process.env.AI_MODEL || null : null,
      },
      adminAI,
      fileStorage: {
        mode: "application-managed",
      },
    },
    security: {
      ownerConfigured: Boolean(process.env.OWNER_USER_ID?.trim()),
      appendOnlyAudit: true,
      sensitiveValuesExposed: false,
      administratorActionsRequirePassword: true,
    },
  };
}

export async function buildAdminAISnapshot(): Promise<AdminAISnapshot> {
  const [overview, system, audit] = await Promise.all([
    buildAdminOverview(),
    buildSystemStatus(),
    getAdminAuditEvents(20),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    overview,
    system,
    recentAudit: audit.map((event) => ({
      occurredAt: event.occurredAt,
      eventType: event.eventType,
      outcome: event.outcome,
      userId: event.userId,
      handle: event.handle,
      detail: event.detail,
    })),
  };
}

function sendAdminError(res: any, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Invalid administrator request", details: error.errors });
  }
  if (error instanceof AdminActionError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (error instanceof AIServiceError) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      retryable: error.retryable,
    });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

export function registerAdminDashboardRoutes(app: Express): void {
  const adminAILimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many administrator AI requests. Please try again shortly." },
  });

  app.get("/api/admin/access", requireAdmin, async (req: any, res) => {
    try {
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"));
      return res.json({
        ownerConfigured: Boolean(process.env.OWNER_USER_ID?.trim()),
        isOwner: isConfiguredOwner(req.user.id),
        administrators: admins.map(createAdminSafeUser),
      });
    } catch (error) {
      return sendAdminError(res, error, "Failed to load administrator access");
    }
  });

  app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
    try {
      return res.json(await buildAdminOverview());
    } catch (error) {
      return sendAdminError(res, error, "Failed to load administrator overview");
    }
  });

  app.get("/api/admin/audit", requireAdmin, async (req, res) => {
    try {
      const limit = z.coerce.number().int().min(1).max(250).default(100).parse(req.query.limit ?? 100);
      const userId = typeof req.query.userId === "string" && req.query.userId.trim()
        ? req.query.userId.trim()
        : undefined;
      return res.json(await getAdminAuditEvents(limit, userId));
    } catch (error) {
      return sendAdminError(res, error, "Failed to load audit history");
    }
  });

  app.get("/api/admin/system-status", requireAdmin, async (_req, res) => {
    try {
      return res.json(await buildSystemStatus());
    } catch (error) {
      return sendAdminError(res, error, "Failed to load system status");
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const recentAudit = await getAdminAuditEvents(25, user.id);
      return res.json({
        user: createAdminSafeUser(user),
        recentAudit,
      });
    } catch (error) {
      return sendAdminError(res, error, "Failed to load user administration record");
    }
  });

  app.patch("/api/admin/users/:id/status", requireAdmin, async (req: any, res) => {
    try {
      const input = statusActionSchema.parse(req.body);
      const actor = await confirmAdminPassword(req.user.id, input.currentPassword);
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });

      if (isConfiguredOwner(target.id) && input.status !== "active") {
        throw new AdminActionError("The configured owner account cannot be suspended or disabled", 400);
      }
      if (target.id === actor.id && input.status !== "active") {
        throw new AdminActionError("You cannot suspend or disable your own administrator account", 400);
      }
      if ((target.accountStatus || "active") === input.status) {
        throw new AdminActionError(`Account is already ${input.status}`, 400);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(users)
          .set({
            accountStatus: input.status,
            sessionVersion: sql`${users.sessionVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, target.id))
          .returning();
        if (!row) throw new AdminActionError("Account status update did not return a user", 500);

        await recordRequiredAuthEvent({
          eventType: "admin_account_action",
          outcome: "success",
          userId: target.id,
          identifier: target.email || target.handle,
          clientIp: clientIpOf(req),
          userAgent: userAgentOf(req),
          detail: `actor=${actor.id}; action=account_status_change; from=${target.accountStatus || "active"}; to=${input.status}; reason=${cleanReason(input.reason)}`,
        }, tx);
        return row;
      });

      return res.json({
        message: `Account status changed to ${input.status}`,
        user: createAdminSafeUser(updated),
      });
    } catch (error) {
      return sendAdminError(res, error, "Failed to change account status");
    }
  });

  app.post("/api/admin/users/:id/unlock", requireAdmin, async (req: any, res) => {
    try {
      const input = securedActionSchema.parse(req.body);
      const actor = await confirmAdminPassword(req.user.id, input.currentPassword);
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (!target.lockedUntil || target.lockedUntil <= new Date()) {
        throw new AdminActionError("Account is not currently locked", 400);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastFailedAttempt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, target.id))
          .returning();
        if (!row) throw new AdminActionError("Account unlock did not return a user", 500);

        await recordRequiredAuthEvent({
          eventType: "admin_account_action",
          outcome: "success",
          userId: target.id,
          identifier: target.email || target.handle,
          clientIp: clientIpOf(req),
          userAgent: userAgentOf(req),
          detail: `actor=${actor.id}; action=account_unlock; reason=${cleanReason(input.reason)}`,
        }, tx);
        return row;
      });

      return res.json({
        message: "Account unlocked",
        user: createAdminSafeUser(updated),
      });
    } catch (error) {
      return sendAdminError(res, error, "Failed to unlock account");
    }
  });

  app.patch("/api/admin/users/:id/role", requireOwner, async (req: any, res) => {
    try {
      const input = roleActionSchema.parse(req.body);
      const actor = await confirmAdminPassword(req.user.id, input.currentPassword);
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });

      if (isConfiguredOwner(target.id) && input.role !== "admin") {
        throw new AdminActionError("The configured owner cannot be demoted", 400);
      }
      if (target.role === input.role) {
        throw new AdminActionError(`User already has the ${input.role} role`, 400);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(users)
          .set({
            role: input.role,
            sessionVersion: sql`${users.sessionVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, target.id))
          .returning();
        if (!row) throw new AdminActionError("Role update did not return a user", 500);

        await recordRequiredAuthEvent({
          eventType: "admin_account_action",
          outcome: "success",
          userId: target.id,
          identifier: target.email || target.handle,
          clientIp: clientIpOf(req),
          userAgent: userAgentOf(req),
          detail: `actor=${actor.id}; action=role_change; from=${target.role}; to=${input.role}; reason=${cleanReason(input.reason)}`,
        }, tx);
        return row;
      });

      return res.json({
        message: `Role changed to ${input.role}`,
        user: createAdminSafeUser(updated),
      });
    } catch (error) {
      return sendAdminError(res, error, "Failed to change administrator access");
    }
  });

  app.get("/api/admin/ai/status", requireAdmin, async (_req, res) => {
    try {
      return res.json(await getAdminAIService().status());
    } catch (error) {
      return sendAdminError(res, error, "Unable to load administrator AI status");
    }
  });

  app.post("/api/admin/ai", requireAdmin, adminAILimiter, async (req: any, res) => {
    try {
      const input = adminAIQuestionSchema.parse(req.body);
      const snapshot = await buildAdminAISnapshot();
      const answer = await getAdminAIService().ask(req.user.id, input.question, snapshot);
      return res.json(answer);
    } catch (error) {
      return sendAdminError(res, error, "Administrator AI request failed");
    }
  });
}
