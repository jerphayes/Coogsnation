import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import {
  localAccountRegistrationSchema,
} from "@shared/schema";

import { storage } from "./storage";
import { PasswordService } from "./passwordService";

import {
  EMAIL_VERIFICATION_WINDOW_MS,
  createEmailVerificationToken,
  sendMembershipVerificationEmail,
} from "./emailVerificationService";

import {
  getVerifiedProfileUserByToken,
  verifyMembershipEmailToken,
} from "./emailVerificationStore";

import {
  recordMembershipAnalyticsConversion,
} from "./trafficAnalytics";

import {
  clientIpOf,
  recordAuthEvent,
  userAgentOf,
} from "./authAudit";


const emailStartSchema =
  z
    .object({
      email:
        z
          .string()
          .trim()
          .toLowerCase()
          .email(
            "Enter a valid email address",
          ),

      returnTo:
        z
          .string()
          .optional(),
    })
    .strict();


const verifyEmailSchema =
  z
    .object({
      token:
        z
          .string()
          .trim()
          .min(1),
    })
    .strict();


const completionRequestSchema =
  z
    .object({
      setupToken:
        z
          .string()
          .trim()
          .min(1),

      returnTo:
        z
          .string()
          .optional(),

      profile:
        z.unknown(),
    })
    .strict();


const setupContextSchema =
  z
    .object({
      setupToken:
        z
          .string()
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


const PROFILE_TERMS_VERSION =
  "2026-09-02-v1";

const PROFILE_PRIVACY_VERSION =
  "2026-09-02-v1";

const INTRAMURAL_AGREEMENT_VERSION =
  "2026-09-02-v1";


function safeReturnTo(
  value:unknown,
):string {
  const candidate =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    candidate.startsWith("/") &&
    !candidate.startsWith("//")
  ) {
    return candidate;
  }

  return "/dashboard";
}


function appBaseUrl(
  req:any,
):string {
  const host =
    req.get("host") ||
    "coogsnation.com";

  return (
    process.env.APP_ORIGIN?.trim() ||
    (
      process.env.NODE_ENV ===
      "production"
        ? `https://${host}`
        : `${req.protocol}://${host}`
    )
  ).replace(
    /\/+$/,
    "",
  );
}


async function validateEmailDomain(
  email:string,
):Promise<
  | null
  | {
      status:number;
      code:string;
      message:string;
      suggestedEmail?:string;
    }
> {
  const at =
    email.lastIndexOf("@");

  const local =
    email.slice(
      0,
      at,
    );

  const domain =
    email.slice(
      at + 1,
    );

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

  const editDistance = (
    a:string,
    b:string,
  ):number => {
    const previous =
      Array.from(
        {
          length:
            b.length + 1,
        },
        (
          _,
          index,
        ) => index,
      );

    for (
      let i = 1;
      i <= a.length;
      i += 1
    ) {
      const current =
        [i];

      for (
        let j = 1;
        j <= b.length;
        j += 1
      ) {
        current[j] =
          Math.min(
            current[j - 1] + 1,
            previous[j] + 1,
            previous[j - 1] +
              (
                a[i - 1] ===
                b[j - 1]
                  ? 0
                  : 1
              ),
          );
      }

      previous.splice(
        0,
        previous.length,
        ...current,
      );
    }

    return previous[b.length];
  };

  if (
    !commonDomains.includes(
      domain,
    )
  ) {
    let suggestedDomain =
      "";

    let bestDistance =
      Number.POSITIVE_INFINITY;

    for (
      const candidate
      of commonDomains
    ) {
      const distance =
        editDistance(
          domain,
          candidate,
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        suggestedDomain =
          candidate;
      }
    }

    if (
      suggestedDomain &&
      bestDistance <= 2
    ) {
      const suggestedEmail =
        `${local}@${suggestedDomain}`;

      return {
        status: 400,
        code:
          "EMAIL_DOMAIN_SUSPECT",
        suggestedEmail,
        message:
          `That email domain looks incorrect. Did you mean ${suggestedEmail}?`,
      };
    }
  }

  try {
    const {
      resolveMx,
    } =
      await import(
        "node:dns/promises"
      );

    const mxRecords =
      await resolveMx(
        domain,
      );

    if (!mxRecords.length) {
      return {
        status: 400,
        code:
          "EMAIL_DOMAIN_NO_MX",
        message:
          "That email domain does not appear able to receive mail.",
      };
    }
  } catch (error:any) {
    const code =
      String(
        error?.code ||
        "",
      );

    if (
      [
        "ENOTFOUND",
        "ENODATA",
        "EAI_NONAME",
      ].includes(
        code,
      )
    ) {
      return {
        status: 400,
        code:
          "EMAIL_DOMAIN_INVALID",
        message:
          "That email domain does not appear able to receive mail.",
      };
    }

    console.warn(
      "[MEMBERSHIP] Temporary MX lookup failure",
      {
        domain,
        code,
      },
    );
  }

  return null;
}


async function establishLocalSession(
  req:any,
  userId:string,
  sessionVersion:number | null | undefined,
):Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      req.session.regenerate(
        (
          error:any,
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );

  req.session.sessionVersion =
    sessionVersion || 0;

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      req.logIn(
        {
          id:
            userId,

          provider:
            "local",
        },
        (
          error:any,
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      req.session.save(
        (
          error:any,
        ) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );
}


export function registerMembershipRegistrationRoutes(
  app:Express,
):void {
  /*
   * UNIVERSAL MEMBERSHIP ENTRY
   *
   * EMAIL ONLY.
   *
   * No handle, password, profile or consent is
   * accepted before email ownership is verified.
   */
  app.post(
    "/api/auth/register-email",
    registrationLimiter,
    async (
      req:any,
      res,
    ) => {
      try {
        const input =
          emailStartSchema.parse(
            req.body,
          );

        const domainProblem =
          await validateEmailDomain(
            input.email,
          );

        if (domainProblem) {
          return res
            .status(
              domainProblem.status,
            )
            .json(
              domainProblem,
            );
        }

        const returnTo =
          safeReturnTo(
            input.returnTo,
          );

        const existing =
          await storage
            .getUserByEmail(
              input.email,
            );

        if (
          existing &&
          ![
            "pending",
            "profile_pending",
            "expired",
          ].includes(
            existing.accountStatus,
          )
        ) {
          return res
            .status(409)
            .json({
              code:
                "ACCOUNT_EXISTS",

              message:
                "That email address already has a CoogsNation account. Sign in to continue.",
            });
        }

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

        let userId =
          existing?.id ||
          "";

        if (existing) {
          const restarted =
            await storage
              .updateUserProfile(
                existing.id,
                {
                  /*
                   * Restart incomplete membership cleanly.
                   * Nothing beyond email may survive as an
                   * unverified registration credential.
                   */
                  handle:
                    null,

                  username:
                    null,

                  passwordHash:
                    null,

                  accountStatus:
                    "pending",

                  emailVerifiedAt:
                    null,

                  emailVerificationTokenHash:
                    tokenHash,

                  emailVerificationSentAt:
                    now,

                  scheduledDeletionAt:
                    expiresAt,

                  registrationReturnTo:
                    returnTo,

                  hasConsentedToDataUse:
                    false,

                  hasConsentedToMarketing:
                    false,

                  consentedAt:
                    null,

                  isProfileComplete:
                    false,

                  profileCompletedAt:
                    null,

                  verificationResendCount:
                    (
                      existing
                        .verificationResendCount ||
                      0
                    ) + 1,

                  verificationLastResentAt:
                    now,
                },
              );

          userId =
            restarted.id;
        } else {
          const created =
            await storage
              .createLocalUser({
                email:
                  input.email,

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

                  registrationReturnTo:
                    returnTo,

                hasConsentedToDataUse:
                  false,

                hasConsentedToMarketing:
                  false,

                consentedAt:
                  null,

                isProfileComplete:
                  false,
              });

          userId =
            created.id;
        }

        const emailSent =
          await sendMembershipVerificationEmail({
            email:
              input.email,

            firstName:
              null,

            token,

            baseUrl:
              appBaseUrl(req),

            returnTo,
          });

        if (!emailSent) {
          return res
            .status(503)
            .json({
              message:
                "We could not send the verification email. Please try again.",
            });
        }

        void recordAuthEvent({
          eventType:
            "registration",

          outcome:
            "success",

          userId,

          identifier:
            input.email,

          clientIp:
            clientIpOf(req),

          userAgent:
            userAgentOf(req),

          detail:
            "provider=email; account_status=pending; stage=email_verification",
        });

        return res
          .status(201)
          .json({
            status:
              "verification_required",

            message:
              "CHECK YOUR EMAIL IMMEDIATELY",

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
                "Invalid membership request.",

              errors:
                error.errors,
            });
        }

        const databaseError =
          error as {
            code?:string;
          };

        if (
          databaseError?.code ===
          "23505"
        ) {
          return res
            .status(409)
            .json({
              message:
                "That email address is already registered.",
            });
        }

        console.error(
          "Email membership start failed:",
          error,
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to start membership.",
          });
      }
    },
  );


  /*
   * EMAIL VERIFICATION
   *
   * Successful verification changes the account
   * to profile_pending. It does NOT activate it.
   */
  app.post(
    "/api/auth/verify-email",
    verificationLimiter,
    async (
      req:any,
      res,
    ) => {
      try {
        const {
          token,
        } =
          verifyEmailSchema.parse(
            req.body,
          );

        const result =
          await verifyMembershipEmailToken(
            token,
          );

        if (
          result.status ===
          "verified"
        ) {
          if (
            result.newlyVerified
          ) {
            await recordMembershipAnalyticsConversion(
              req,
              result.userId,
              "email_verified",
            );
          }

          return res.json({
            status:
              "verified",

            message:
              "Email verified. Complete your CoogsNation profile to continue.",
          });
        }

        if (
          result.status ===
          "expired"
        ) {
          return res
            .status(410)
            .json({
              status:
                "expired",

              message:
                "This verification link has expired. Request a new link to continue.",
            });
        }

        return res
          .status(400)
          .json({
            status:
              "invalid",

            message:
              "This verification link is invalid or has already been completed.",
          });
      } catch (error) {
        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              status:
                "invalid",

              message:
                "Invalid verification request.",
            });
        }

        console.error(
          "Membership email verification failed:",
          error,
        );

        return res
          .status(500)
          .json({
            status:
              "error",

            message:
              "Unable to verify email.",
          });
      }
    },
  );


  /*
   * VERIFIED PROFILE CONTEXT
   *
   * Allows the post-email profile screen to display
   * the verified email without trusting an email value
   * supplied by the browser.
   */
  app.get(
    "/api/auth/email-registration-context",
    verificationLimiter,
    async (
      req,
      res,
    ) => {
      try {
        const input =
          setupContextSchema.parse({
            setupToken:
              req.query.setupToken,
          });

        const result =
          await getVerifiedProfileUserByToken(
            input.setupToken,
          );

        if (
          result.status ===
          "expired"
        ) {
          return res
            .status(410)
            .json({
              status:
                "expired",

              message:
                "This verification link has expired. Request a new link to continue.",
            });
        }

        if (
          result.status !==
          "ready"
        ) {
          return res
            .status(400)
            .json({
              status:
                "invalid",

              message:
                "This registration link is invalid.",
            });
        }

        return res.json({
          status:
            "profile_pending",

          email:
            result.user.email,
        });
      } catch (
        error
      ) {
        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              status:
                "invalid",

              message:
                "Invalid registration request.",
            });
        }

        console.error(
          "Membership profile context failed:",
          error,
        );

        return res
          .status(500)
          .json({
            status:
              "error",

            message:
              "Unable to load membership registration.",
          });
      }
    },
  );


  /*
   * FINAL MEMBERSHIP ACTIVATION
   *
   * This is the ONLY email-registration step that
   * activates the member account.
   */
  app.post(
    "/api/auth/complete-email-registration",
    registrationLimiter,
    async (
      req:any,
      res,
    ) => {
      try {
        const request =
          completionRequestSchema.parse(
            req.body,
          );

        const lookup =
          await getVerifiedProfileUserByToken(
            request.setupToken,
          );

        if (
          lookup.status ===
          "expired"
        ) {
          return res
            .status(410)
            .json({
              status:
                "expired",

              message:
                "This verification link has expired. Request a new link to continue.",
            });
        }

        if (
          lookup.status !==
          "ready"
        ) {
          return res
            .status(400)
            .json({
              status:
                "invalid",

              message:
                "This registration link is invalid.",
            });
        }

        if (
          !lookup.user.email
        ) {
          return res
            .status(400)
            .json({
              status:
                "invalid",

              message:
                "Verified email is unavailable.",
            });
        }

        /*
         * Browser-supplied email is never authoritative.
         * Force the already verified email into validation.
         */
        const profile =
          localAccountRegistrationSchema.parse({
            ...(
              request.profile as
              Record<string,unknown>
            ),

            email:
              lookup.user.email,
          });

        /*
         * PARTICIPATION_ORIGIN_V1
         *
         * Future registrations use the server-persisted original
         * participation destination. Browser returnTo is only a
         * compatibility fallback for pending registrations created
         * before this field existed.
         */
        const storedReturnTo =
          lookup.user.registrationReturnTo;

        const trustedReturnTo =
          typeof storedReturnTo === "string" &&
          storedReturnTo.startsWith("/") &&
          !storedReturnTo.startsWith("//")
            ? storedReturnTo
            : safeReturnTo(
                request.returnTo,
              );

        const requiresIntramuralAgreement =
          trustedReturnTo.startsWith(
            "/intramurals",
          );

        if (
          requiresIntramuralAgreement &&
          profile.intramuralAgreementAccepted !==
            true
        ) {
          return res
            .status(400)
            .json({
              code:
                "INTRAMURAL_AGREEMENT_REQUIRED",

              title:
                "Intramural Agreement Required",

              message:
                "You entered membership through Intramurals. Accept the Intramural Sports & Activities Participation Agreement to complete your membership.",
            });
        }

        if (
          profile.handle
        ) {
          const existingHandle =
            await storage
              .getUserByHandle(
                profile.handle,
              );

          if (
            existingHandle &&
            existingHandle.id !==
              lookup.user.id
          ) {
            return res
              .status(409)
              .json({
                message:
                  "That CoogsNation handle is already taken.",
              });
          }
        }

        const passwordHash =
          await PasswordService
            .hashPassword(
              profile.password,
            );

        const now =
          new Date();

        const updatedUser =
          await storage
            .updateUserProfile(
              lookup.user.id,
              {
                email:
                  lookup.user.email,

                handle:
                  profile.handle ||
                  null,

                firstName:
                  profile.firstName,

                lastName:
                  profile.lastName,

                nickname:
                  profile.nickname ||
                  null,

                passwordHash,

                backupEmail:
                  profile.backupEmail ||
                  null,

                address:
                  profile.address ||
                  null,

                city:
                  profile.city ||
                  null,

                state:
                  profile.state ||
                  null,

                zipCode:
                  profile.zipCode ||
                  null,

                age:
                  profile.age,

                phoneNumber:
                  profile.phoneNumber?.trim() ||
                  null,

                dateOfBirth:
                  profile.dateOfBirth ||
                  null,

                graduationYear:
                  profile.graduationYear ||
                  null,

                fanType:
                  profile.fanType ||
                  null,

                interest:
                  profile.interest ||
                  null,

                suggestionBox:
                  profile.suggestionBox ||
                  null,

                memberCategory:
                  profile.memberCategory ||
                  null,

                commentsAndSuggestions:
                  profile.commentsAndSuggestions ||
                  null,

                favoriteSports:
                  profile.favoriteSports
                    ? JSON.stringify(
                        profile.favoriteSports,
                      )
                    : null,

                otherSportComment:
                  profile.otherSportComment ||
                  null,

                aboutMe:
                  profile.aboutMe ||
                  null,

                interests:
                  profile.interests ||
                  null,

                affiliation:
                  profile.affiliation ||
                  null,

                defaultAvatarChoice:
                  profile.defaultAvatarChoice ||
                  null,

                majorOrDepartment:
                  profile.majorOrDepartment ||
                  null,

                socialLinks:
                  profile.socialLinks ||
                  null,

                addressLine1:
                  profile.addressLine1 ||
                  null,

                country:
                  profile.country ||
                  null,

                optInOffers:
                  profile.optInOffers ||
                  false,

                termsVersion:
                  PROFILE_TERMS_VERSION,

                termsAcceptedAt:
                  now,

                privacyVersion:
                  PROFILE_PRIVACY_VERSION,

                privacyAcceptedAt:
                  now,

                intramuralAgreementVersion:
                  profile.intramuralAgreementAccepted
                    ? INTRAMURAL_AGREEMENT_VERSION
                    : null,

                intramuralAgreementAcceptedAt:
                  profile.intramuralAgreementAccepted
                    ? now
                    : null,

                hasConsentedToDataUse:
                  true,

                hasConsentedToMarketing:
                  profile.hasConsentedToMarketing ||
                  false,

                consentedAt:
                  now,

                isProfileComplete:
                  true,

                profileCompletedAt:
                  now,

                isLocalAccount:
                  true,

                accountStatus:
                  "active",

                /*
                 * Setup credential is one-time.
                 */
                emailVerificationTokenHash:
                  null,

                emailVerificationSentAt:
                  null,

                scheduledDeletionAt:
                  null,
              },
            );

        await recordMembershipAnalyticsConversion(
          req,
          updatedUser.id,
          "signup_completed",
        );

        await recordMembershipAnalyticsConversion(
          req,
          updatedUser.id,
          "member_activated",
        );

        await establishLocalSession(
          req,
          updatedUser.id,
          updatedUser.sessionVersion,
        );

        void recordAuthEvent({
          eventType:
            "registration",

          outcome:
            "success",

          userId:
            updatedUser.id,

          identifier:
            updatedUser.email ||
            undefined,

          clientIp:
            clientIpOf(req),

          userAgent:
            userAgentOf(req),

          detail:
            "provider=email; account_status=active; stage=profile_complete",
        });

        return res.json({
          status:
            "active",

          message:
            "Welcome to CoogsNation.",

          returnTo:
            trustedReturnTo,
        });
      } catch (error:any) {
        if (
          error instanceof
          z.ZodError
        ) {
          return res
            .status(400)
            .json({
              message:
                error.errors?.[0]?.message ||
                "Invalid profile information.",

              errors:
                error.errors,
            });
        }

        if (
          error?.code ===
          "23505"
        ) {
          return res
            .status(409)
            .json({
              message:
                "That CoogsNation handle or email is already in use.",
            });
        }

        console.error(
          "Email membership completion failed:",
          error,
        );

        return res
          .status(500)
          .json({
            message:
              "Unable to complete membership.",
          });
      }
    },
  );
}
