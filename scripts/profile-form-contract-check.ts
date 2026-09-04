import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  localAccountRegistrationSchema,
  userProfileCompletionSchema,
  userProfileUpdateSchema,
} from "../shared/schema";

const profilePath = resolve(process.cwd(), "client/src/pages/AdvancedProfile.tsx");
const source = readFileSync(profilePath, "utf8");
const registeredNames = [...source.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
const allowedTopLevelFields = new Set(Object.keys(userProfileUpdateSchema.shape));

assert.ok(registeredNames.length > 0, "AdvancedProfile must register at least one editable field");

const invalidNames = registeredNames.filter((name) => {
  const topLevelName = name.split(".")[0];
  return !allowedTopLevelFields.has(topLevelName);
});

assert.deepEqual(
  invalidNames,
  [],
  `AdvancedProfile registers fields outside userProfileUpdateSchema: ${invalidNames.join(", ")}`,
);

for (const removedLegacyField of ["displayName", "hometown", "email", "privacy.showEmail", "privacy.showGraduationYear", "privacy.allowMessages"]) {
  assert.equal(
    registeredNames.includes(removedLegacyField),
    false,
    `${removedLegacyField} must not be registered against the strict profile schema`,
  );
}

console.log("Advanced Profile form/schema contract checks passed.");

const profileCompletionPath = resolve(process.cwd(), "client/src/pages/ProfileCompletion.tsx");
const profileCompletionSource = readFileSync(profileCompletionPath, "utf8");

const requiredRegistrationFields = {
  email: "profile-v2-member@example.com",
  handle: "ProfileV2Member",
  firstName: "Alex",
  lastName: "Cougar",
  password: "ProfileV2Pass123!",
  confirmPassword: "ProfileV2Pass123!",
  address: "123 Main St",
  city: "Houston",
  state: "TX",
  zipCode: "77002",
  country: "USA",
  age: 18,
  hasConsentedToDataUse: true,
  hasAcceptedTerms: true,
};

const minimalRegistration =
  localAccountRegistrationSchema.safeParse(
    requiredRegistrationFields,
  );

assert.equal(
  minimalRegistration.success,
  true,
  "Profile v2 registration must succeed with verified email, handle, name, password, age 18+, complete address, Terms, and Privacy consent",
);

if (minimalRegistration.success) {
  assert.equal(
    minimalRegistration.data.dateOfBirth,
    undefined,
    "Date of birth must not be required for membership",
  );

  assert.equal(
    minimalRegistration.data.phoneNumber,
    undefined,
    "Phone number must remain optional for membership",
  );
}

const underAgeRegistration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    age: 17,
  });

assert.equal(
  underAgeRegistration.success,
  false,
  "Membership must reject anyone younger than 18",
);

const age18Registration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    age: 18,
  });

assert.equal(
  age18Registration.success,
  true,
  "Age 18 must satisfy the membership age requirement",
);

const missingHandleRegistration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    handle: "",
  });

assert.equal(
  missingHandleRegistration.success,
  false,
  "CoogsNation handle is required for membership",
);

for (const field of [
  "address",
  "city",
  "state",
  "zipCode",
  "country",
]) {
  const candidate: Record<string, unknown> = {
    ...requiredRegistrationFields,
  };

  candidate[field] = "";

  const result =
    localAccountRegistrationSchema.safeParse(
      candidate,
    );

  assert.equal(
    result.success,
    false,
    `${field} must be required for membership`,
  );
}

const noTermsRegistration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    hasAcceptedTerms: false,
  });

assert.equal(
  noTermsRegistration.success,
  false,
  "Terms of Use acceptance must be required",
);

const noPrivacyRegistration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    hasConsentedToDataUse: false,
  });

assert.equal(
  noPrivacyRegistration.success,
  false,
  "Privacy/data-use acceptance must be required",
);

const optionalPhoneRegistration =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    phoneNumber: "",
  });

assert.equal(
  optionalPhoneRegistration.success,
  true,
  "Phone number must remain optional for membership",
);

const normalSignupWithoutIntramuralAgreement =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    intramuralAgreementAccepted: false,
  });

assert.equal(
  normalSignupWithoutIntramuralAgreement.success,
  true,
  "Intramural agreement must remain optional at the schema level for ordinary membership",
);

const signupWithIntramuralAgreement =
  localAccountRegistrationSchema.safeParse({
    ...requiredRegistrationFields,
    intramuralAgreementAccepted: true,
  });

assert.equal(
  signupWithIntramuralAgreement.success,
  true,
  "Members must be able to accept the Intramural agreement during ordinary registration",
);

/*
 * Intramural-origin enforcement belongs on the server because
 * the browser must not decide whether the agreement is mandatory.
 */
const membershipRegistrationPath =
  resolve(
    process.cwd(),
    "server/membershipRegistration.ts",
  );

const membershipRegistrationSource =
  readFileSync(
    membershipRegistrationPath,
    "utf8",
  );

assert.equal(
  membershipRegistrationSource.includes(
    "lookup.user.registrationReturnTo",
  ),
  true,
  "Intramural requirement must derive from server-persisted signup origin",
);

assert.equal(
  membershipRegistrationSource.includes(
    "INTRAMURAL_AGREEMENT_REQUIRED",
  ),
  true,
  "Intramural-origin membership must have a server-side agreement enforcement path",
);

const minimalProfileCompletion = userProfileCompletionSchema.safeParse({
  email: "oauth-member@example.com",
  firstName: "Alex",
  lastName: "Cougar",
  dateOfBirth: new Date("1985-05-15T00:00:00.000Z"),
  hasConsentedToDataUse: true,
  country: "USA",  
});
assert.equal(
  minimalProfileCompletion.success,
  true,
  "Authenticated profile completion must not require a handle, address, graduation year, or member category",
);

assert.ok(
  profileCompletionSource.includes("Handle (Optional)"),
  "ProfileCompletion must label the handle as optional",
);
assert.ok(
  profileCompletionSource.includes('data-testid="input-avatar-file"'),
  "ProfileCompletion must provide an avatar file selector during signup",
);
assert.equal(
  profileCompletionSource.includes("disabled={profileCompletionMutation.isPending || !handleAvailable}"),
  false,
  "A blank optional handle must not disable the submit button",
);

console.log("Registration and profile-completion optional-field checks passed.");

const memberDashboardPath = resolve(process.cwd(), "client/src/pages/MemberDashboard.tsx");
const memberDashboardSource = readFileSync(memberDashboardPath, "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

assert.equal(
  memberDashboardSource.includes('href="/profile/local"'),
  false,
  "MemberDashboard must not link to the removed /profile/local route",
);
assert.ok(
  memberDashboardSource.includes('href="/profile/edit"'),
  "MemberDashboard Edit Profile action must link to /profile/edit",
);

assert.equal(
  memberDashboardSource.includes('href="/complete-profile"'),
  false,
  "Established members must not be sent back through /complete-profile onboarding",
);

assert.ok(
  appSource.includes('path="/profile" component={MemberDashboard}'),
  "App router must expose MemberDashboard at canonical /profile",
);

assert.ok(
  appSource.includes('path="/profile/edit" component={ProfileCompletion}'),
  "App router must expose ProfileCompletion at /profile/edit for established members",
);

assert.ok(
  appSource.includes('path="/complete-profile"'),
  "App router must preserve /complete-profile for onboarding",
);

const serverRoutesSource = readFileSync(
  resolve(process.cwd(), "server/routes.ts"),
  "utf8",
);

assert.ok(
  profileCompletionSource.includes("PROFILE_ONBOARDING_ONE_TIME_V1"),
  "ProfileCompletion must enforce one-time onboarding semantics",
);

assert.ok(
  profileCompletionSource.includes("PROFILE_ESTABLISHED_EDIT_V1"),
  "ProfileCompletion must preserve established-member edit mode",
);

assert.ok(
  profileCompletionSource.includes("PROFILE_ESTABLISHED_UPDATE_V1") &&
    profileCompletionSource.includes("/api/auth/update-profile") &&
    profileCompletionSource.includes("profileUpdateMutation"),
  "Established-member editor must use the authenticated profile-update path",
);

assert.ok(
  profileCompletionSource.includes("user?.isProfileComplete") &&
    profileCompletionSource.includes('setLocation("/profile")'),
  "Completed members visiting /complete-profile must redirect to /profile",
);

assert.ok(
  serverRoutesSource.includes("PROFILE_ONBOARDING_ONE_TIME_V1") &&
    serverRoutesSource.includes("currentUser.isProfileComplete") &&
    serverRoutesSource.includes("res.status(409)"),
  "Server must reject profile completion for an already-completed member",
);

assert.ok(
  appSource.includes('import { Switch, Route, Redirect } from "wouter";'),
  "App router must import Wouter Redirect for legacy aliases",
);

assert.ok(
  appSource.includes('path="/profile/advanced"') &&
    appSource.includes('<Redirect to="/profile" />'),
  "Legacy /profile/advanced must redirect to canonical /profile",
);

assert.ok(
  appSource.includes('path="/member-dashboard"') &&
    appSource.includes('<Redirect to="/dashboard" />'),
  "Legacy /member-dashboard must redirect to canonical /dashboard",
);

console.log("Member dashboard profile-route checks passed.");
