import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { userProfileUpdateSchema } from "../shared/schema";

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
