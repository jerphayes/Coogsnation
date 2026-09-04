import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "@shared/schema";

import {
  EMAIL_VERIFICATION_WINDOW_MS,
  hashEmailVerificationToken,
} from "./emailVerificationService";

type UserRow =
  typeof users.$inferSelect;

export type EmailVerificationResult =
  | {
      status: "verified";
      userId: string;
      email: string | null;
      newlyVerified: boolean;
    }
  | { status: "expired" }
  | { status: "invalid" };

export type VerifiedProfileLookup =
  | {
      status: "ready";
      user: UserRow;
    }
  | { status: "expired" }
  | { status: "invalid" };


async function findUserByRawToken(
  rawToken:string,
):Promise<UserRow | null> {
  const token =
    rawToken.trim();

  if (!token) {
    return null;
  }

  const tokenHash =
    hashEmailVerificationToken(token);

  const matches =
    await db
      .select()
      .from(users)
      .where(
        eq(
          users.emailVerificationTokenHash,
          tokenHash,
        ),
      )
      .limit(1);

  return matches[0] || null;
}


function tokenHasExpired(
  user:UserRow,
  now:Date,
):boolean {
  if (
    user.scheduledDeletionAt &&
    user.scheduledDeletionAt.getTime() <=
      now.getTime()
  ) {
    return true;
  }

  if (!user.emailVerificationSentAt) {
    return true;
  }

  return (
    user.emailVerificationSentAt.getTime() +
      EMAIL_VERIFICATION_WINDOW_MS
  ) <= now.getTime();
}


async function expireUser(
  userId:string,
  now:Date,
):Promise<void> {
  await db
    .update(users)
    .set({
      accountStatus: "expired",
      emailVerificationTokenHash: null,
      updatedAt: now,
    })
    .where(
      eq(users.id, userId),
    );
}


export async function verifyMembershipEmailToken(
  rawToken:string,
):Promise<EmailVerificationResult> {
  const user =
    await findUserByRawToken(rawToken);

  if (!user) {
    return {
      status: "invalid",
    };
  }

  const now =
    new Date();

  if (tokenHasExpired(user, now)) {
    await expireUser(
      user.id,
      now,
    );

    return {
      status: "expired",
    };
  }

  /*
   * Verification proves ownership of the email address.
   * It does NOT activate CoogsNation membership.
   *
   * Keep the hashed token temporarily so the same secure
   * emailed credential can authorize profile completion.
   */
  if (
    user.accountStatus ===
      "profile_pending" &&
    user.emailVerifiedAt
  ) {
    return {
      status: "verified",
      userId: user.id,
      email: user.email,
      newlyVerified: false,
    };
  }

  if (
    user.accountStatus !==
    "pending"
  ) {
    return {
      status: "invalid",
    };
  }

  const completionDeadline =
    new Date(
      now.getTime() +
      EMAIL_VERIFICATION_WINDOW_MS,
    );

  await db
    .update(users)
    .set({
      accountStatus:
        "profile_pending",

      emailVerifiedAt:
        now,

      /*
       * Restart the private completion-security window
       * from successful verification.
       */
      emailVerificationSentAt:
        now,

      scheduledDeletionAt:
        completionDeadline,

      updatedAt:
        now,
    })
    .where(
      eq(users.id, user.id),
    );

  return {
    status: "verified",
    userId: user.id,
    email: user.email,
    newlyVerified: true,
  };
}


export async function getVerifiedProfileUserByToken(
  rawToken:string,
):Promise<VerifiedProfileLookup> {
  const user =
    await findUserByRawToken(rawToken);

  if (!user) {
    return {
      status: "invalid",
    };
  }

  const now =
    new Date();

  if (tokenHasExpired(user, now)) {
    await expireUser(
      user.id,
      now,
    );

    return {
      status: "expired",
    };
  }

  if (
    user.accountStatus !==
      "profile_pending" ||
    !user.emailVerifiedAt
  ) {
    return {
      status: "invalid",
    };
  }

  return {
    status: "ready",
    user,
  };
}
