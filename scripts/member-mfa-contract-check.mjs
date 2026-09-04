import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const must = (path, text) => {
  if (!read(path).includes(text)) {
    throw new Error(
      `${path} missing required member MFA contract: ${text}`,
    );
  }
};

must(
  "migrations/0020_member_totp_mfa.sql",
  "member_mfa_credentials",
);

must(
  "migrations/0020_member_totp_mfa.sql",
  "member_mfa_recovery_codes",
);

must(
  "server/memberMfa.ts",
  "verifyMemberMfaToken",
);

must(
  "server/routes.ts",
  "MEMBER_MFA_REQUIRED",
);

must(
  "server/routes.ts",
  '"/api/auth/login-mfa"',
);

must(
  "client/src/components/LoginComponent.tsx",
  "MemberMfaLoginChallenge",
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "/api/security/member-mfa/enroll/start",
);

must(
  "client/src/pages/MemberDashboard.tsx",
  "<MemberMfaPanel />",
);

const routes = read("server/routes.ts");

const intercept =
  routes.indexOf("MEMBER_MFA_REQUIRED");

const normalLogin =
  routes.indexOf(
    "// Successful login - clear any failed attempts",
  );

if (
  intercept < 0 ||
  normalLogin < 0 ||
  intercept > normalLogin
) {
  throw new Error(
    "Member MFA must intercept password login before normal Passport login",
  );
}

console.log(
  "PASS: member authenticator 2FA contract",
);
