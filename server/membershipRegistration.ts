import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { passwordSchema } from "@shared/schema";
import { storage } from "./storage";
import { PasswordService } from "./passwordService";

import {
  EMAIL_VERIFICATION_WINDOW_MS,
  createEmailVerificationToken,
  sendMembershipVerificationEmail,
} from "./emailVerificationService";

import {
  verifyMembershipEmailToken,
} from "./emailVerificationStore";

import { recordMembershipAnalyticsConversion } from "./trafficAnalytics";

import {
  recordAuthEvent,
  clientIpOf,
  userAgentOf,
} from "./authAudit";

const emailRegistrationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),

    confirmEmail: z.string().optional(),

    handle: z
      .string()
      .trim()
      .min(3, "Handle must be at least 3 characters")
      .max(30, "Handle must be 30 characters or fewer")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Handle may contain only letters, numbers and underscores",
      ),

    password: passwordSchema,

    confirmPassword:
      z.string(),

    hasConsentedToDataUse:
      z.literal(true),

    returnTo:
      z.string().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.confirmEmail === undefined || data.email === data.confirmEmail,
    {
      message:
        "Email addresses must match",
      path: [
        "confirmEmail",
      ],
    },
  )
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      message:
        "Passwords must match",
      path: [
        "confirmPassword",
      ],
    },
  );

const verifyEmailSchema =
  z
    .object({
      token:
        z.string()
          .trim()
          .min(1),
    })
    .strict();

const registrationLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    limit: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      message:
        "Too many membership requests. Please try again later.",
    },
  });

const verificationLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 30,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      message:
        "Too many verification attempts. Please try again later.",
    },
  });

export function registerMembershipRegistrationRoutes(
  app: Express,
): void {

  // EMAIL_PREFLIGHT_VALIDATION_V1
  app.post("/api/auth/register-email", async (req: any, res, next) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const confirmEmail =
      String(req.body?.confirmEmail || "").trim().toLowerCase();


    // SIGNUP_CONSENT_CONTRACT_V1
    if (
      req.body?.hasConsentedToDataUse === undefined &&
      req.body?.consent !== undefined
    ) {
      req.body.hasConsentedToDataUse = req.body.consent;
    }
    delete req.body.consent;
if (!email || !confirmEmail || email !== confirmEmail) {
      return res.status(400).json({
        code: "EMAIL_MISMATCH",
        message:
          "The email addresses do not match. Please type your email twice.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        code: "EMAIL_INVALID",
        message: "Enter a valid email address and retype it.",
      });
    }

    const at = email.lastIndexOf("@");
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);

    const commonDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "aol.com",
      "mail.com",
      "live.com",
      "msn.com",
      "proton.me",
      "protonmail.com",
      "zoho.com",
    ];

    const editDistance = (a: string, b: string): number => {
      const previous =
        Array.from({ length: b.length + 1 }, (_, index) => index);

      for (let i = 1; i <= a.length; i += 1) {
        const current = [i];

        for (let j = 1; j <= b.length; j += 1) {
          current[j] = Math.min(
            current[j - 1] + 1,
            previous[j] + 1,
            previous[j - 1] +
              (a[i - 1] === b[j - 1] ? 0 : 1),
          );
        }

        previous.splice(0, previous.length, ...current);
      }

      return previous[b.length];
    };

    if (!commonDomains.includes(domain)) {
      let suggestedDomain = "";
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of commonDomains) {
        const distance = editDistance(domain, candidate);
        if (distance < bestDistance) {
          bestDistance = distance;
          suggestedDomain = candidate;
        }
      }

      if (suggestedDomain && bestDistance <= 2) {
        const suggestedEmail = `${local}@${suggestedDomain}`;

        return res.status(400).json({
          code: "EMAIL_DOMAIN_SUSPECT",
          suggestedEmail,
          message:
            `That email domain looks incorrect. Did you mean ${suggestedEmail}? Please retype your email.`,
        });
      }
    }

    try {
      const { resolveMx } = await import("node:dns/promises");
      const mxRecords = await resolveMx(domain);

      if (!mxRecords.length) {
        return res.status(400).json({
          code: "EMAIL_DOMAIN_NO_MX",
          message:
            "That email domain does not appear able to receive mail. Please retype your email.",
        });
      }
    } catch (error: any) {
      const code = String(error?.code || "");

      if (["ENOTFOUND", "ENODATA", "EAI_NONAME"].includes(code)) {
        return res.status(400).json({
          code: "EMAIL_DOMAIN_INVALID",
          message:
            "That email domain does not appear to receive email. Please retype your email.",
        });
      }

      console.warn("[MEMBERSHIP] Temporary MX lookup failure", {
        domain,
        code,
      });
    }

    req.body = {
      ...req.body,
      email,
    };
    delete req.body.confirmEmail;

    return next();
  });

  app.post(
    "/api/auth/register-email",
    registrationLimiter,
    async (req, res) => {
      try {
        const input =
          emailRegistrationSchema
            .parse(
              req.body,
            );

        const existingEmail =
          await storage
            .getUserByEmail(
              input.email,
            );

        if (existingEmail) {
          return res
            .status(409)
            .json({
              message:
                "That email address is already registered.",
            });
        }

        const existingHandle =
          await storage
            .getUserByHandle(
              input.handle,
            );

        if (existingHandle) {
          return res
            .status(409)
            .json({
              message:
                "That CoogsNation handle is already taken.",
            });
        }

        const passwordHash =
          await PasswordService
            .hashPassword(
              input.password,
            );

        const {
          token,
          tokenHash,
        } =
          createEmailVerificationToken();

        const now =
          new Date();

        const expiresAt =
          new Date(
            now.getTime() +
            EMAIL_VERIFICATION_WINDOW_MS,
          );

        const newUser =
          await storage
            .createLocalUser({
              email:
                input.email,

              handle:
                input.handle,

              passwordHash,

              role:
                "member",

              accountStatus:
                "pending",

              isLocalAccount:
                true,

              emailVerifiedAt:
                null,

              emailVerificationTokenHash:
                tokenHash,

              emailVerificationSentAt:
                now,

              scheduledDeletionAt:
                expiresAt,

              hasConsentedToDataUse:
                true,

              hasConsentedToMarketing:
                false,

              consentedAt:
                now,

              isProfileComplete:
                false,
            });

        const host =
          req.get("host") ||
          "coogsnation.com";

        const baseUrl =
          (
            process.env.APP_ORIGIN?.trim() ||
            (
              process.env.NODE_ENV ===
              "production"
                ? `https://${host}`
                : `${req.protocol}://${host}`
            )
          )
            .replace(
              /\/+$/,
              "",
            );

        const emailSent =
          await sendMembershipVerificationEmail({
            email:
              input.email,

            firstName:
              null,

            token,

            baseUrl,
          });

        if (!emailSent) {
          await storage
            .deleteUserProfile(
              newUser.id,
            );

          return res
            .status(503)
            .json({
              message:
                "We could not send the confirmation email. Please try again.",
            });
        }

        await recordMembershipAnalyticsConversion(
          req,
          newUser.id,
          "signup_completed",
        );

        void recordAuthEvent({
          eventType:
            "registration",

          outcome:
            "success",

          userId:
            newUser.id,

          identifier:
            input.email,

          clientIp:
            clientIpOf(
              req as any,
            ),

          userAgent:
            userAgentOf(
              req as any,
            ),

          detail:
            "provider=email; account_status=pending",
        });

        return res
          .status(201)
          .json({
            message:
              "Membership created. Confirm your email to activate it.",

            verificationRequired:
              true,

            email:
              input.email,
          });
      } catch (error) {
        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              message:
                error.errors?.[0]?.message ||
                "Validation error",

              errors:
                error.errors,
            });
        }

        const databaseError =
          error as {
            code?: string;
          };

        if (
          databaseError?.code ===
          "23505"
        ) {
          return res
            .status(409)
            .json({
              message:
                "That email address or handle is already registered.",
            });
        }

        console.error(
          "Email membership registration failed:",
          error,
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to create membership.",
          });
      }
    },
  );
  app.post(
    "/api/auth/verify-email",
    verificationLimiter,
    async (req, res) => {
      try {
        const { token } =
          verifyEmailSchema.parse(req.body);

        const result =
          await verifyMembershipEmailToken(token);

        if (result.status === "activated") {
          const activatedUser = result.email
            ? await storage.getUserByEmail(result.email)
            : null;

          if (activatedUser) {
            await recordMembershipAnalyticsConversion(
              req,
              activatedUser.id,
              "email_verified",
            );
            await recordMembershipAnalyticsConversion(
              req,
              activatedUser.id,
              "member_activated",
            );
          }

          return res.json({
            status: "activated",
            message:
              "Your CoogsNation membership is now active.",
          });
        }

        if (result.status === "expired") {
          return res.status(410).json({
            status: "expired",
            message:
              "This confirmation link has expired. Please register again.",
          });
        }

        return res.status(400).json({
          status: "invalid",
          message:
            "This confirmation link is invalid or has already been used.",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            status: "invalid",
            message:
              "Invalid confirmation request.",
          });
        }

        console.error(
          "Membership email verification failed:",
          error,
        );

        return res.status(500).json({
          status: "error",
          message:
            "Unable to confirm membership.",
        });
      }
    },
  );
}
