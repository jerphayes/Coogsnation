import crypto from "node:crypto";
import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { pool } from "./db";
import { isAuthenticated } from "./auth";
import { storage } from "./storage";
import { PasswordService } from "./passwordService";

const ISSUER = "CoogsNation NGF";
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

authenticator.options = {
  window: 1,
};

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
}).strict();

const tokenSchema = z.object({
  token: z.string().trim().min(6).max(40),
}).strict();

const disableSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  token: z.string().trim().min(6).max(40),
}).strict();

type Credential = {
  user_id: string;
  secret_ciphertext: string;
  secret_iv: string;
  secret_tag: string;
  enabled: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  enrolled_at: Date | null;
};

function encryptionKey(): Buffer {
  const raw =
    process.env.MFA_ENCRYPTION_KEY?.trim();

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

function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);

  return {
    ciphertext:
      encrypted.toString("base64"),

    iv:
      iv.toString("base64"),

    tag:
      cipher.getAuthTag().toString("base64"),
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
        FROM member_mfa_credentials
        WHERE user_id = $1
      `,
      [userId],
    );

  return result.rows[0] || null;
}

async function confirmPassword(
  userId: string,
  password: string,
) {
  const user =
    await storage.getUser(userId);

  if (
    !user ||
    !user.isLocalAccount ||
    !user.passwordHash
  ) {
    throw new Error(
      "A local account password is required",
    );
  }

  const valid =
    await PasswordService.verifyPassword(
      password,
      user.passwordHash,
    );

  if (!valid) {
    throw new Error(
      "Current password is incorrect",
    );
  }
}

function locked(
  credential: Credential,
): boolean {
  return Boolean(
    credential.locked_until &&
    credential.locked_until.getTime() >
      Date.now(),
  );
}

async function clearFailures(
  userId: string,
) {
  await pool.query(
    `
      UPDATE member_mfa_credentials
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
) {
  await pool.query(
    `
      UPDATE member_mfa_credentials
      SET
        failed_attempts =
          failed_attempts + 1,

        locked_until =
          CASE
            WHEN failed_attempts + 1 >= $2
            THEN
              now() +
              ($3::text || ' minutes')::interval
            ELSE locked_until
          END,

        updated_at = now()
      WHERE user_id = $1
    `,
    [
      userId,
      MAX_FAILURES,
      LOCK_MINUTES,
    ],
  );
}

function makeRecoveryCode(): string {
  const value =
    crypto
      .randomBytes(9)
      .toString("hex")
      .toUpperCase();

  return (
    value.slice(0, 6) +
    "-" +
    value.slice(6, 12) +
    "-" +
    value.slice(12, 18)
  );
}

async function useRecoveryCode(
  userId: string,
  token: string,
): Promise<boolean> {
  const result =
    await pool.query(
      `
        SELECT id, code_hash
        FROM member_mfa_recovery_codes
        WHERE
          user_id = $1
          AND used_at IS NULL
        ORDER BY id
      `,
      [userId],
    );

  const normalized =
    token.trim().toUpperCase();

  for (const row of result.rows) {
    if (
      !await bcrypt.compare(
        normalized,
        row.code_hash,
      )
    ) {
      continue;
    }

    const claimed =
      await pool.query(
        `
          UPDATE member_mfa_recovery_codes
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

export async function memberMfaEnabled(
  userId: string,
): Promise<boolean> {
  const credential =
    await credentialFor(userId);

  return Boolean(
    credential?.enabled,
  );
}

export async function verifyMemberMfaToken(
  userId: string,
  token: string,
): Promise<{
  okay: boolean;
  locked?: boolean;
  method?: "totp" | "recovery";
}> {
  const credential =
    await credentialFor(userId);

  if (
    !credential ||
    !credential.enabled
  ) {
    return { okay: false };
  }

  if (locked(credential)) {
    return {
      okay: false,
      locked: true,
    };
  }

  const value = token.trim();

  const totpOkay =
    /^\d{6}$/.test(value) &&
    authenticator.check(
      value,
      decryptSecret(credential),
    );

  if (totpOkay) {
    await clearFailures(userId);

    return {
      okay: true,
      method: "totp",
    };
  }

  if (
    await useRecoveryCode(
      userId,
      value,
    )
  ) {
    await clearFailures(userId);

    return {
      okay: true,
      method: "recovery",
    };
  }

  await recordFailure(userId);

  const updated =
    await credentialFor(userId);

  return {
    okay: false,
    locked:
      Boolean(
        updated &&
        locked(updated),
      ),
  };
}

export function registerMemberMfaRoutes(
  app: Express,
) {
  const limiter =
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    });

  app.get(
    "/api/security/member-mfa/status",
    isAuthenticated,
    async (req: any, res) => {
      const credential =
        await credentialFor(
          req.user.id,
        );

      const recovery =
        credential?.enabled
          ? await pool.query(
              `
                SELECT COUNT(*)::int AS count
                FROM member_mfa_recovery_codes
                WHERE
                  user_id = $1
                  AND used_at IS NULL
              `,
              [req.user.id],
            )
          : null;

      return res.json({
        configured:
          encryptionConfigured(),

        enabled:
          Boolean(
            credential?.enabled,
          ),

        enrolledAt:
          credential?.enrolled_at ||
          null,

        recoveryCodesRemaining:
          Number(
            recovery?.rows?.[0]?.count ||
            0,
          ),
      });
    },
  );

  app.post(
    "/api/security/member-mfa/enroll/start",
    isAuthenticated,
    limiter,
    async (req: any, res) => {
      try {
        const member =
          await storage.getUser(
            req.user.id,
          );

        if (
          !member ||
          member.role === "admin" ||
          (member.accountStatus ?? "active") !== "active"
        ) {
          return res.status(403).json({
            message:
              "Member two-factor authentication is not available for this account.",
          });
        }

        const existing =
          await credentialFor(
            req.user.id,
          );

        if (existing?.enabled) {
          return res.status(409).json({
            message:
              "2FA is already enabled",
          });
        }

        const user =
          await storage.getUser(
            req.user.id,
          );

        const secret =
          authenticator.generateSecret();

        const encrypted =
          encryptSecret(secret);

        await pool.query(
          `
            INSERT INTO member_mfa_credentials (
              user_id,
              secret_ciphertext,
              secret_iv,
              secret_tag
            )
            VALUES ($1, $2, $3, $4)
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
              enrolled_at = NULL,
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
              member_mfa_recovery_codes
            WHERE user_id = $1
          `,
          [req.user.id],
        );

        const account =
          String(
            user?.email ||
            user?.handle ||
            req.user.id,
          );

        const uri =
          authenticator.keyuri(
            account,
            ISSUER,
            secret,
          );

        return res.json({
          qrDataUrl:
            await QRCode.toDataURL(uri),

          manualSecret: secret,
          issuer: ISSUER,
          account,
        });
      } catch (error) {
        return res.status(400).json({
          message:
            error instanceof Error
              ? error.message
              : "Unable to start 2FA",
        });
      }
    },
  );

  app.post(
    "/api/security/member-mfa/enroll/confirm",
    isAuthenticated,
    limiter,
    async (req: any, res) => {
      try {
        const { token } =
          tokenSchema.parse(req.body);

        const credential =
          await credentialFor(
            req.user.id,
          );

        if (
          !credential ||
          credential.enabled
        ) {
          return res.status(409).json({
            message:
              "No pending 2FA enrollment",
          });
        }

        if (
          !authenticator.check(
            token,
            decryptSecret(credential),
          )
        ) {
          await recordFailure(
            req.user.id,
          );

          return res.status(400).json({
            message:
              "Authenticator code is invalid",
          });
        }

        const recoveryCodes =
          Array.from(
            { length: 10 },
            makeRecoveryCode,
          );

        const hashes =
          await Promise.all(
            recoveryCodes.map(
              code =>
                bcrypt.hash(code, 12),
            ),
          );

        const client =
          await pool.connect();

        try {
          await client.query("BEGIN");

          await client.query(
            `
              UPDATE member_mfa_credentials
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
                member_mfa_recovery_codes
              WHERE user_id = $1
            `,
            [req.user.id],
          );

          for (const hash of hashes) {
            await client.query(
              `
                INSERT INTO
                  member_mfa_recovery_codes (
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

          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }

        return res.json({
          enabled: true,
          recoveryCodes,
        });
      } catch (error) {
        return res.status(400).json({
          message:
            error instanceof Error
              ? error.message
              : "Unable to enable 2FA",
        });
      }
    },
  );

  app.post(
    "/api/security/member-mfa/disable",
    isAuthenticated,
    limiter,
    async (req: any, res) => {
      try {
        const member =
          await storage.getUser(
            req.user.id,
          );

        if (
          !member ||
          member.role === "admin" ||
          (member.accountStatus ?? "active") !== "active"
        ) {
          return res.status(403).json({
            message:
              "Member two-factor authentication is not available for this account.",
          });
        }

        const client =
          await pool.connect();

        try {
          await client.query(
            "BEGIN",
          );

          await client.query(
            `
              DELETE FROM
                member_mfa_recovery_codes
              WHERE user_id = $1
            `,
            [req.user.id],
          );

          await client.query(
            `
              DELETE FROM
                member_mfa_credentials
              WHERE user_id = $1
            `,
            [req.user.id],
          );

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

        return res.json({
          enabled: false,
        });
      } catch (error) {
        return res.status(400).json({
          message:
            error instanceof Error
              ? error.message
              : "Unable to disable 2FA",
        });
      }
    },
  );
}
