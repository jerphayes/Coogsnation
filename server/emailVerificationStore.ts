import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "@shared/schema";

import {
  EMAIL_VERIFICATION_WINDOW_MS,
  hashEmailVerificationToken,
} from "./emailVerificationService";

export type EmailVerificationResult =
  | { status: "activated"; email: string | null }
  | { status: "expired" }
  | { status: "invalid" };

export async function verifyMembershipEmailToken(
  rawToken: string,
): Promise<EmailVerificationResult> {

  const token =
    rawToken.trim();

  if (!token) {
    return { status: "invalid" };
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
          tokenHash
        )
      )
      .limit(1);

  const user =
    matches[0];

  if (!user) {
    return { status: "invalid" };
  }

  const now =
    new Date();

  const sentAt =
    user.emailVerificationSentAt;

  const scheduledDeletionAt =
    user.scheduledDeletionAt;

  const expiredByDeadline =
    scheduledDeletionAt
      ? scheduledDeletionAt.getTime() <= now.getTime()
      : false;

  const expiredBySentTime =
    sentAt
      ? (
          sentAt.getTime() +
          EMAIL_VERIFICATION_WINDOW_MS
        ) <= now.getTime()
      : true;

  if (
    expiredByDeadline ||
    expiredBySentTime
  ) {
    await db
      .update(users)
      .set({
        accountStatus: "expired",
        emailVerificationTokenHash: null,
        updatedAt: now,
      })
      .where(
        eq(users.id, user.id)
      );

    return {
      status: "expired",
    };
  }

  await db
    .update(users)
    .set({
      accountStatus: "active",
      emailVerifiedAt: now,

      // One-time token is destroyed immediately.
      emailVerificationTokenHash: null,

      // Membership no longer faces pending deletion.
      scheduledDeletionAt: null,

      updatedAt: now,
    })
    .where(
      eq(users.id, user.id)
    );

  return {
    status: "activated",
    email: user.email,
  };
}
