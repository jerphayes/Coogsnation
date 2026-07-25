import assert from "node:assert/strict";
import {
  userProfileUpdateSchema,
  createSafeUser,
  createSelfUser,
  createAdminSafeUser,
  type User,
} from "../shared/schema";

function expectRejected(payload: unknown, field: string): void {
  const result = userProfileUpdateSchema.safeParse(payload);
  assert.equal(result.success, false, `${field} must be rejected by the strict profile schema`);
}

// Mass-assignment regression: account/security fields must never be accepted
// by self-service profile updates.
for (const field of [
  "role",
  "passwordHash",
  "emailVerificationTokenHash",
  "mfaToken",
  "failedLoginAttempts",
  "lockedUntil",
  "isLocalAccount",
  "emailVerifiedAt",
  "isProfileComplete",
]) {
  expectRejected({ aboutMe: "safe", [field]: field === "role" ? "admin" : "attacker-value" }, field);
}

const allowed = userProfileUpdateSchema.parse({
  firstName: "Shasta",
  aboutMe: "Proud Coog",
  city: "Houston",
  optInOffers: false,
});
assert.deepEqual(allowed, {
  firstName: "Shasta",
  aboutMe: "Proud Coog",
  city: "Houston",
  optInOffers: false,
});

// Functional regression: this mirrors every editable field currently registered
// by AdvancedProfile.tsx. The complete form payload must pass the same strict
// schema used by the server.
const advancedProfileFormPayload = {
  nickname: "Shasta",
  fanType: "Graduate",
  bio: "Proud Coog",
  interest: "Technology",
  city: "Houston",
  suggestionBox: "More alumni events",
  aboutMe: "University of Houston community member",
  interests: "Sports, technology, and community",
  affiliation: "Graduate" as const,
  graduationYear: 1980,
  majorOrDepartment: "Technology",
  socialLinks: {
    twitter: "",
    linkedin: "",
    instagram: "",
    facebook: "",
    website: "https://coogsnation.com",
  },
  addressLine1: "",
  country: "USA",
  optInOffers: false,
};
assert.deepEqual(
  userProfileUpdateSchema.parse(advancedProfileFormPayload),
  advancedProfileFormPayload,
  "Advanced Profile form payload must satisfy the strict server schema",
);

for (const legacyField of ["displayName", "hometown", "email", "privacy"]) {
  expectRejected({ ...advancedProfileFormPayload, [legacyField]: undefined }, legacyField);
}

const sample = {
  id: "user-1",
  email: "member@example.com",
  firstName: "Shasta",
  lastName: "Coog",
  profileImageUrl: "/avatar.jpg",
  role: "member",
  username: "shasta",
  handle: "shasta",
  nickname: null,
  title: null,
  bio: "Proud Coog",
  address: "123 Secret Street",
  city: "Houston",
  state: "TX",
  zipCode: "77004",
  location: "Houston",
  dateOfBirth: new Date("1990-01-01"),
  fanType: "Graduate",
  interest: "Football",
  suggestionBox: "private note",
  aboutMe: "Proud Coog",
  interests: "Sports",
  affiliation: "Graduate",
  defaultAvatarChoice: 1,
  graduationYear: 2012,
  majorOrDepartment: "Engineering",
  socialLinks: { website: "https://example.com" },
  addressLine1: "123 Secret Street",
  country: "USA",
  optInOffers: false,
  memberCategory: "Alum",
  backupEmail: "backup@example.com",
  passwordHash: "bcrypt-hash",
  isLocalAccount: true,
  emailVerifiedAt: new Date(),
  emailVerificationTokenHash: "verification-hash",
  emailVerificationSentAt: new Date(),
  verificationResendCount: 1,
  verificationLastResentAt: new Date(),
  scheduledDeletionAt: null,
  failedLoginAttempts: 2,
  lockedUntil: null,
  lastFailedAttempt: new Date(),
  mfaToken: "mfa-hash",
  mfaTokenExpiry: new Date(),
  mfaAttempts: 1,
  mfaLockedUntil: null,
  mfaLastAttemptAt: new Date(),
  phoneNumber: "+1-555-0100",
  hasConsentedToDataUse: true,
  hasConsentedToMarketing: false,
  consentedAt: new Date(),
  isProfileComplete: true,
  profileCompletedAt: new Date(),
  favoriteTeam: "Houston Cougars",
  commentsAndSuggestions: "private comment",
  favoriteSports: "football",
  otherSportComment: null,
  postCount: 5,
  threadCount: 2,
  achievementLevel: "Rookie",
  lastAchievementDate: null,
  reputation: 10,
  isOnline: false,
  lastActiveAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const forbiddenEverywhere = [
  "passwordHash",
  "backupEmail",
  "emailVerificationTokenHash",
  "emailVerificationSentAt",
  "verificationResendCount",
  "verificationLastResentAt",
  "mfaToken",
  "mfaTokenExpiry",
];

const publicUser = createSafeUser(sample) as Record<string, unknown>;
for (const field of [
  ...forbiddenEverywhere,
  "email",
  "role",
  "address",
  "addressLine1",
  "zipCode",
  "dateOfBirth",
  "phoneNumber",
  "failedLoginAttempts",
  "lockedUntil",
  "lastFailedAttempt",
]) {
  assert.equal(field in publicUser, false, `public user response leaked ${field}`);
}

const selfUser = createSelfUser(sample) as Record<string, unknown>;
for (const field of [...forbiddenEverywhere, "failedLoginAttempts", "lockedUntil", "lastFailedAttempt", "mfaAttempts", "mfaLockedUntil", "mfaLastAttemptAt"]) {
  assert.equal(field in selfUser, false, `self user response leaked ${field}`);
}
assert.equal(selfUser.email, sample.email);
assert.equal(selfUser.role, "member");

const adminUser = createAdminSafeUser(sample) as Record<string, unknown>;
for (const field of [...forbiddenEverywhere, "address", "addressLine1", "zipCode", "dateOfBirth", "phoneNumber", "suggestionBox", "commentsAndSuggestions"]) {
  assert.equal(field in adminUser, false, `admin user response leaked ${field}`);
}
assert.equal(adminUser.email, sample.email);
assert.equal(adminUser.role, "member");
assert.equal(adminUser.failedLoginAttempts, 2);

console.log("Schema and user-response security checks passed.");
