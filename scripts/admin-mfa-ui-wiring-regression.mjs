import fs from "node:fs";

const dashboard = fs.readFileSync(
  "client/src/pages/OwnerAdminDashboard.tsx",
  "utf8",
);

const required = [
  [
    "const mfaStatusQuery",
    "administrator MFA status query declaration",
  ],
  [
    '"/api/security/admin-mfa/status"',
    "administrator MFA status endpoint",
  ],
  [
    "mfaStatusQuery.data?.verified === true",
    "admin API queries locked behind MFA",
  ],
  [
    "if (mfaStatusQuery.isError || !mfaStatusQuery.data)",
    "fail-closed MFA status error handling",
  ],
  [
    "if (!mfaStatusQuery.data.verified)",
    "MFA verification decision",
  ],
  [
    "<AdminMfaGate",
    "rendered administrator MFA gate",
  ],
  [
    "onVerified={async () =>",
    "MFA success callback",
  ],
  [
    "await mfaStatusQuery.refetch();",
    "MFA status refresh after verification",
  ],
  [
    "Administrator MFA unavailable",
    "fail-closed administrator message",
  ],
];

for (const [needle, label] of required) {
  if (!dashboard.includes(needle)) {
    throw new Error(
      `[ADMIN-MFA-UI] Missing ${label}: ${needle}`,
    );
  }
}

console.log(
  "Administrator MFA UI wiring regression: PASS",
);
