/**
 * Authentication regression checks (static).
 *
 * These assert properties of the source that the previously-existing security
 * suites did not cover. They are static checks: they prove the code is shaped
 * correctly, NOT that the runtime behaves correctly against a live database.
 * Live PostgreSQL verification is documented separately and remains required.
 */

import { readFileSync, existsSync } from "node:fs";

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

const routes = readFileSync("server/routes.ts", "utf8");
const auth = readFileSync("server/auth.ts", "utf8");
const storage = readFileSync("server/storage.ts", "utf8");
const migration = readFileSync("migrations/0003_auth_and_ai_isolation.sql", "utf8");

// --- No client-side fake authentication may return -------------------------

const demoAuthFiles = [
  "client/src/pages/JoinPage.tsx",
  "client/src/pages/Signup.tsx",
  "client/src/pages/LoginLocal.tsx",
  "client/src/pages/LocalProfile.tsx",
  "client/src/pages/SessionTest.tsx",
];
for (const file of demoAuthFiles) {
  check(!existsSync(file), `removed demo-auth page reappeared: ${file}`);
}

// --- Session fixation and revocation ---------------------------------------

check(
  routes.includes("req.session.regenerate"),
  "local login must regenerate the session id (session fixation defence)",
);
check(
  auth.includes("req.session.regenerate"),
  "OAuth login must regenerate the session id (session fixation defence)",
);
check(
  routes.includes("sessionVersion"),
  "login must record the account session version into the session",
);
check(
  auth.includes("evaluateSessionState"),
  "authenticated requests must evaluate account status and session version",
);
check(
  (auth.match(/evaluateSessionState\(/g) || []).length >= 3,
  "both isAuthenticated and requireAdmin must enforce session state",
);

// --- Account status enforcement --------------------------------------------

check(
  routes.includes("accountStatus") && routes.includes("not active"),
  "login must reject accounts whose status is not active",
);

// --- Logout ----------------------------------------------------------------

check(
  auth.includes('app.post("/api/logout"'),
  "logout must be exposed as POST",
);
check(
  auth.includes("req.session.destroy"),
  "logout must destroy the server session",
);
check(
  auth.includes("clearCookie"),
  "logout must clear the session cookie",
);

// --- Identifier normalization ----------------------------------------------

check(
  storage.includes("lower(") && storage.includes("getUserByEmail"),
  "email lookup must be case-insensitive",
);
check(
  storage.includes("getUserByHandle") && /lower\(.*handle/s.test(storage),
  "handle lookup must be case-insensitive",
);
check(
  migration.includes("idx_users_email_lower_unique"),
  "migration must add a case-insensitive unique index on email",
);
check(
  migration.includes("idx_users_handle_lower_unique"),
  "migration must add a case-insensitive unique index on handle",
);

// --- Audit logging ----------------------------------------------------------

check(existsSync("server/authAudit.ts"), "auth audit service must exist");
const audit = existsSync("server/authAudit.ts")
  ? readFileSync("server/authAudit.ts", "utf8")
  : "";
check(
  audit.includes("createHmac"),
  "audit must hash client identifiers rather than store them in the clear",
);
check(
  !/\b(passwordHash|apiKey|accessToken|refreshToken|rawPassword)\b/.test(
    audit.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ""),
  ),
  "audit service must not reference secret material",
);
check(
  routes.includes("recordAuthEvent"),
  "login paths must write audit events",
);
check(
  auth.includes("recordAuthEvent"),
  "logout must write an audit event",
);

// --- Append-only enforcement must be real ----------------------------------

check(
  migration.includes("coogsnation_reject_mutation"),
  "audit tables described as append-only must be enforced by a trigger",
);
check(
  migration.includes("BEFORE UPDATE OR DELETE ON auth_audit_events"),
  "auth_audit_events must reject UPDATE and DELETE at the database level",
);

// --- Server-side authorization on protected mutations ----------------------

const protectedPosts = [
  "/api/forums/topics",
  "/api/forums/posts",
];
for (const route of protectedPosts) {
  const pattern = new RegExp(
    `app\\.post\\(\\s*['"]${route.replace(/\//g, "\\/")}['"]\\s*,\\s*isAuthenticated`,
  );
  check(pattern.test(routes), `${route} must require isAuthenticated server-side`);
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Authentication regression checks FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Authentication regression checks passed.");
