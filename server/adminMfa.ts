import crypto from "node:crypto";
import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import type {
  Express,
  RequestHandler,
} from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { pool } from "./db";
import {
  requireAdmin,
  isConfiguredOwner,
} from "./auth";
import { storage } from "./storage";
import { PasswordService } from "./passwordService";
import {
  clientIpOf,
  recordAuthEvent,
  userAgentOf,
} from "./authAudit";

const ISSUER = "CoogsNation NGF";

const STEP_UP_TTL_MS =
  15 * 60 * 1000;

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

authenticator.options = {
  window: 1,
};

const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(1)
    .max(200),
}).strict();

const tokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(6)
    .max(40),
}).strict();

interface Credential {
  user_id: string;
  secret_ciphertext: string;
  secret_iv: string;
  secret_tag: string;
  enabled: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  enrolled_at: Date | null;
}

function encryptionKey(): Buffer {
  const raw =
    process.env
      .MFA_ENCRYPTION_KEY
      ?.trim();

  if (!raw) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is required",
    );
  }

  const key =
    Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      "MFA_ENCRYPTION_KEY must decode to 32 bytes",
    );
  }

  return key;
}

function encryptionConfigured(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

function encryptSecret(
  secret: string,
) {
  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        secret,
        "utf8",
      ),
      cipher.final(),
    ]);

  return {
    ciphertext:
      encrypted.toString("base64"),

    iv:
      iv.toString("base64"),

    tag:
      cipher
        .getAuthTag()
        .toString("base64"),
  };
}

function decryptSecret(
  credential: Credential,
): string {
  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(
        credential.secret_iv,
        "base64",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      credential.secret_tag,
      "base64",
    ),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(
        credential.secret_ciphertext,
        "base64",
      ),
    ),
    decipher.final(),
  ]).toString("utf8");
}

async function credentialFor(
  userId: string,
): Promise<Credential | null> {
  const result =
    await pool.query(
      `
        SELECT
          user_id,
          secret_ciphertext,
          secret_iv,
          secret_tag,
          enabled,
          failed_attempts,
          locked_until,
          enrolled_at
        FROM admin_mfa_credentials
        WHERE user_id = $1
      `,
      [userId],
    );

  return result.rows[0] || null;
}

function verifiedAt(
  req: any,
): number | null {
  const value =
    req.session
      ?.adminMfaVerifiedAt;

  return typeof value === "number"
    ? value
    : null;
}

function isStepUpValid(
  req: any,
): boolean {
  const value = verifiedAt(req);

  return Boolean(
    value &&
    Date.now() - value <
      STEP_UP_TTL_MS,
  );
}

function markVerified(
  req: any,
): void {
  req.session.adminMfaVerifiedAt =
    Date.now();
}

async function confirmPassword(
  userId: string,
  currentPassword: string,
): Promise<void> {
  const user =
    await storage.getUser(userId);

  if (
    !user ||
    user.role !== "admin"
  ) {
    throw new Error(
      "Administrator account could not be verified",
    );
  }

  if (
    !user.isLocalAccount ||
    !user.passwordHash
  ) {
    throw new Error(
      "This administrator requires a local password before MFA enrollment",
    );
  }

  const valid =
    await PasswordService
      .verifyPassword(
        currentPassword,
        user.passwordHash,
      );

  if (!valid) {
    throw new Error(
      "Current password is incorrect",
    );
  }
}

async function securityAudit(
  req: any,
  outcome:
    | "success"
    | "failure"
    | "blocked",
  detail: string,
): Promise<void> {
  await recordAuthEvent({
    eventType:
      "admin_account_action",

    outcome,

    userId:
      req.user?.id || null,

    clientIp:
      clientIpOf(req),

    userAgent:
      userAgentOf(req),

    detail:
      `action=admin_mfa; ${detail}`,
  });
}

async function resetFailures(
  userId: string,
) {
  await pool.query(
    `
      UPDATE admin_mfa_credentials
      SET
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
      WHERE user_id = $1
    `,
    [userId],
  );
}

async function recordFailure(
  userId: string,
): Promise<boolean> {
  const result =
    await pool.query(
      `
        UPDATE admin_mfa_credentials
        SET
          failed_attempts =
            failed_attempts + 1,

          locked_until =
            CASE
              WHEN failed_attempts + 1 >= $2
              THEN
                now() +
                ($3::text || ' minutes')
                ::interval
              ELSE locked_until
            END,

          updated_at = now()

        WHERE user_id = $1

        RETURNING locked_until
      `,
      [
        userId,
        MAX_FAILURES,
        LOCK_MINUTES,
      ],
    );

  return Boolean(
    result.rows[0]
      ?.locked_until,
  );
}

function recoveryCode(): string {
  const value =
    crypto
      .randomBytes(6)
      .toString("hex")
      .toUpperCase();

  return [
    "CN",
    value.slice(0, 4),
    value.slice(4, 8),
    value.slice(8, 12),
  ].join("-");
}

async function verifyRecovery(
  userId: string,
  token: string,
): Promise<boolean> {
  const normalized =
    token
      .trim()
      .toUpperCase();

  if (
    !normalized.startsWith("CN-")
  ) {
    return false;
  }

  const result =
    await pool.query(
      `
        SELECT
          id,
          code_hash
        FROM admin_mfa_recovery_codes
        WHERE
          user_id = $1
          AND used_at IS NULL
        ORDER BY id
      `,
      [userId],
    );

  for (const row of result.rows) {
    const valid =
      await bcrypt.compare(
        normalized,
        row.code_hash,
      );

    if (!valid) continue;

    const claimed =
      await pool.query(
        `
          UPDATE admin_mfa_recovery_codes
          SET used_at = now()
          WHERE
            id = $1
            AND used_at IS NULL
          RETURNING id
        `,
        [row.id],
      );

    return claimed.rowCount === 1;
  }

  return false;
}

async function verifyMfa(
  userId: string,
  token: string,
): Promise<{
  okay: boolean;
  method?: "totp" | "recovery";
  locked?: boolean;
}> {
  const credential =
    await credentialFor(userId);

  if (
    !credential ||
    !credential.enabled
  ) {
    return {
      okay: false,
    };
  }

  if (
    credential.locked_until &&
    credential.locked_until >
      new Date()
  ) {
    return {
      okay: false,
      locked: true,
    };
  }

  let totpValid = false;

  try {
    totpValid =
      authenticator.check(
        token.trim(),
        decryptSecret(
          credential,
        ),
      );
  } catch {
    totpValid = false;
  }

  if (totpValid) {
    await resetFailures(userId);

    return {
      okay: true,
      method: "totp",
    };
  }

  if (
    await verifyRecovery(
      userId,
      token,
    )
  ) {
    await resetFailures(userId);

    return {
      okay: true,
      method: "recovery",
    };
  }

  return {
    okay: false,
    locked:
      await recordFailure(
        userId,
      ),
  };
}

export const requireAdminMfa:
  RequestHandler =
  (req, res, next) => {
    requireAdmin(
      req,
      res,
      () => {
        void (async () => {
          try {
            const userId =
              req.user?.id;

            if (!userId) {
              res.status(401).json({
                message:
                  "Unauthorized",
              });
              return;
            }

            const credential =
              await credentialFor(
                userId,
              );

            if (
              !credential ||
              !credential.enabled
            ) {
              res.status(428).json({
                message:
                  "Administrator MFA enrollment required",

                code:
                  "ADMIN_MFA_ENROLLMENT_REQUIRED",
              });
              return;
            }

            if (
              !isStepUpValid(req)
            ) {
              res.status(428).json({
                message:
                  "Administrator MFA verification required",

                code:
                  "ADMIN_MFA_REQUIRED",
              });
              return;
            }

            next();
          } catch (error) {
            console.error(
              "[ADMIN MFA] gate failure",
              error,
            );

            res.status(500).json({
              message:
                "Administrator MFA check failed",
            });
          }
        })();
      },
    );
  };

export function registerAdminMfaRoutes(
  app: Express,
): void {
  const limiter =
    rateLimit({
      windowMs:
        5 * 60 * 1000,

      limit: 20,

      standardHeaders: true,
      legacyHeaders: false,

      message: {
        message:
          "Too many MFA attempts. Try again later.",
      },
    });

  app.get(
    "/api/security/admin-mfa/status",
    requireAdmin,
    async (req: any, res) => {
      try {
        const credential =
          await credentialFor(
            req.user.id,
          );

        const current =
          verifiedAt(req);

        const verified =
          Boolean(
            credential?.enabled &&
            isStepUpValid(req),
          );

        res.json({
          configured:
            encryptionConfigured(),

          enabled:
            Boolean(
              credential?.enabled,
            ),

          verified,

          requiresStepUp:
            !verified,

          isOwner:
            isConfiguredOwner(
              req.user.id,
            ),

          verifiedUntil:
            verified &&
            current
              ? new Date(
                  current +
                    STEP_UP_TTL_MS,
                ).toISOString()
              : null,

          lockedUntil:
            credential
              ?.locked_until ??
            null,
        });
      } catch (error) {
        console.error(
          "[ADMIN MFA] status failure",
          error,
        );

        res.status(500).json({
          message:
            "Unable to load MFA status",
        });
      }
    },
  );

  app.post(
    "/api/security/admin-mfa/enroll/start",
    requireAdmin,
    limiter,
    async (req: any, res) => {
      try {
        const {
          currentPassword,
        } =
          passwordSchema.parse(
            req.body,
          );

        await confirmPassword(
          req.user.id,
          currentPassword,
        );

        const existing =
          await credentialFor(
            req.user.id,
          );

        if (existing?.enabled) {
          return res
            .status(409)
            .json({
              message:
                "MFA is already enrolled",
            });
        }

        const user =
          await storage.getUser(
            req.user.id,
          );

        const account =
          user?.email ||
          user?.handle ||
          req.user.id;

        const secret =
          authenticator
            .generateSecret();

        const encrypted =
          encryptSecret(secret);

        await pool.query(
          `
            INSERT INTO admin_mfa_credentials (
              user_id,
              secret_ciphertext,
              secret_iv,
              secret_tag,
              enabled,
              failed_attempts,
              locked_until,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              false,
              0,
              NULL,
              now()
            )

            ON CONFLICT (user_id)
            DO UPDATE SET
              secret_ciphertext =
                EXCLUDED.secret_ciphertext,
              secret_iv =
                EXCLUDED.secret_iv,
              secret_tag =
                EXCLUDED.secret_tag,
              enabled = false,
              failed_attempts = 0,
              locked_until = NULL,
              updated_at = now()
          `,
          [
            req.user.id,
            encrypted.ciphertext,
            encrypted.iv,
            encrypted.tag,
          ],
        );

        await pool.query(
          `
            DELETE FROM
              admin_mfa_recovery_codes
            WHERE user_id = $1
          `,
          [req.user.id],
        );

        const uri =
          authenticator.keyuri(
            String(account),
            ISSUER,
            secret,
          );

        const qrDataUrl =
          await QRCode.toDataURL(
            uri,
            {
              width: 320,
              margin: 2,
              errorCorrectionLevel:
                "M",
            },
          );

        await securityAudit(
          req,
          "success",
          "event=enrollment_started",
        );

        return res.json({
          qrDataUrl,
          manualSecret: secret,
          issuer: ISSUER,
          account:
            String(account),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to start MFA enrollment";

        await securityAudit(
          req,
          "failure",
          "event=enrollment_start_failed",
        );

        return res
          .status(
            error instanceof
            z.ZodError
              ? 400
              : message.includes(
                    "password",
                  )
                ? 403
                : 500,
          )
          .json({
            message,
          });
      }
    },
  );

  app.post(
    "/api/security/admin-mfa/enroll/confirm",
    requireAdmin,
    limiter,
    async (req: any, res) => {
      try {
        const { token } =
          tokenSchema.parse(
            req.body,
          );

        const credential =
          await credentialFor(
            req.user.id,
          );

        if (
          !credential ||
          credential.enabled
        ) {
          return res
            .status(409)
            .json({
              message:
                "No pending MFA enrollment",
            });
        }

        const valid =
          authenticator.check(
            token,
            decryptSecret(
              credential,
            ),
          );

        if (!valid) {
          await recordFailure(
            req.user.id,
          );

          await securityAudit(
            req,
            "failure",
            "event=enrollment_confirmation_failed",
          );

          return res
            .status(400)
            .json({
              message:
                "Authenticator code is invalid",
            });
        }

        const recoveryCodes =
          Array.from(
            { length: 10 },
            recoveryCode,
          );

        const hashes =
          await Promise.all(
            recoveryCodes.map(
              (code) =>
                bcrypt.hash(
                  code,
                  12,
                ),
            ),
          );

        const client =
          await pool.connect();

        try {
          await client.query(
            "BEGIN",
          );

          await client.query(
            `
              UPDATE
                admin_mfa_credentials
              SET
                enabled = true,
                failed_attempts = 0,
                locked_until = NULL,
                enrolled_at = now(),
                updated_at = now()
              WHERE user_id = $1
            `,
            [req.user.id],
          );

          await client.query(
            `
              DELETE FROM
                admin_mfa_recovery_codes
              WHERE user_id = $1
            `,
            [req.user.id],
          );

          for (
            const hash of hashes
          ) {
            await client.query(
              `
                INSERT INTO
                  admin_mfa_recovery_codes (
                    user_id,
                    code_hash
                  )
                VALUES ($1, $2)
              `,
              [
                req.user.id,
                hash,
              ],
            );
          }

          await client.query(
            "COMMIT",
          );
        } catch (error) {
          await client.query(
            "ROLLBACK",
          );

          throw error;
        } finally {
          client.release();
        }

        markVerified(req);

        await securityAudit(
          req,
          "success",
          "event=enrollment_completed",
        );

        return res.json({
          verified: true,
          recoveryCodes,
        });
      } catch (error) {
        console.error(
          "[ADMIN MFA] enrollment confirmation failure",
          error,
        );

        return res
          .status(
            error instanceof
            z.ZodError
              ? 400
              : 500,
          )
          .json({
            message:
              error instanceof
              z.ZodError
                ? "Invalid MFA code"
                : "Unable to confirm MFA enrollment",
          });
      }
    },
  );

  app.post(
    "/api/security/admin-mfa/verify",
    requireAdmin,
    limiter,
    async (req: any, res) => {
      try {
        const { token } =
          tokenSchema.parse(
            req.body,
          );

        const result =
          await verifyMfa(
            req.user.id,
            token,
          );

        if (!result.okay) {
          await securityAudit(
            req,
            result.locked
              ? "blocked"
              : "failure",
            result.locked
              ? "event=verification_locked"
              : "event=verification_failed",
          );

          return res
            .status(
              result.locked
                ? 429
                : 400,
            )
            .json({
              message:
                result.locked
                  ? "MFA temporarily locked after repeated failures"
                  : "Invalid authenticator or recovery code",
            });
        }

        markVerified(req);

        await securityAudit(
          req,
          "success",
          `event=verification_success; method=${result.method}`,
        );

        return res.json({
          verified: true,
          method:
            result.method,

          verifiedUntil:
            new Date(
              Date.now() +
                STEP_UP_TTL_MS,
            ).toISOString(),
        });
      } catch (error) {
        return res
          .status(
            error instanceof
            z.ZodError
              ? 400
              : 500,
          )
          .json({
            message:
              error instanceof
              z.ZodError
                ? "Invalid MFA code"
                : "Unable to verify MFA",
          });
      }
    },
  );
}
