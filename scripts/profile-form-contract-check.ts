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
  email: "member@example.com",
  firstName: "Jordan",
  lastName: "Cougar",
  password: "StrongPass1!",
  confirmPassword: "StrongPass1!",
  dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
  hasConsentedToDataUse: true,
};

const minimalRegistration = localAccountRegistrationSchema.safeParse(requiredRegistrationFields);
assert.equal(
  minimalRegistration.success,
  true,
  "Local registration must succeed with only name, email, password, date of birth, and required consent",
);

const blankOptionalRegistration = localAccountRegistrationSchema.safeParse({
  ...requiredRegistrationFields,
  handle: "",
  backupEmail: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  graduationYear: "",
  memberCategory: "",
  country: "",
  socialLinks: {
    twitter: "",
    linkedin: "",
    instagram: "",
    facebook: "",
    website: "",
  },
});
assert.equal(blankOptionalRegistration.success, true, "Blank optional registration fields must not block signup");
if (blankOptionalRegistration.success) {
  assert.equal(blankOptionalRegistration.data.handle, undefined, "Blank handle must normalize to undefined");
  assert.equal(blankOptionalRegistration.data.backupEmail, undefined, "Blank backup email must normalize to undefined");
  assert.equal(blankOptionalRegistration.data.graduationYear, undefined, "Blank graduation year must normalize to undefined");
}

const minimalProfileCompletion = userProfileCompletionSchema.safeParse({
  email: "oauth-member@example.com",
  firstName: "Alex",
  lastName: "Cougar",
  dateOfBirth: new Date("1985-05-15T00:00:00.000Z"),
  hasConsentedToDataUse: true,
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
