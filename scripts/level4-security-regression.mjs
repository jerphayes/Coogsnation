import {
  readFile,
} from "node:fs/promises";

const [
  auth,
  mfa,
  routes,
  index,
  compose,
  migration,
  gate,
] =
  await Promise.all([
    readFile(
      "server/auth.ts",
      "utf8",
    ),

    readFile(
      "server/adminMfa.ts",
      "utf8",
    ),

    readFile(
      "server/routes.ts",
      "utf8",
    ),

    readFile(
      "server/index.ts",
      "utf8",
    ),

    readFile(
      "docker-compose.prod.yml",
      "utf8",
    ),

    readFile(
      "migrations/0017_level4_admin_mfa.sql",
      "utf8",
    ),

    readFile(
      "client/src/components/admin/AdminMfaGate.tsx",
      "utf8",
    ),
  ]);

function requireText(
  source,
  text,
  label,
) {
  if (!source.includes(text)) {
    throw new Error(
      `[LEVEL4] Missing ${label}`,
    );
  }
}

function rejectText(
  source,
  text,
  label,
) {
  if (source.includes(text)) {
    throw new Error(
      `[LEVEL4] Forbidden ${label}`,
    );
  }
}

requireText(
  auth,
  "OWNER_USER_ID",
  "platform-owner binding",
);

requireText(
  auth,
  "requireOwner",
  "owner-only authorization",
);

requireText(
  mfa,
  "aes-256-gcm",
  "encrypted MFA secret",
);

requireText(
  mfa,
  "PasswordService",
  "password service integration",
);

requireText(
  mfa,
  ".verifyPassword(",
  "password-confirmed MFA enrollment",
);

requireText(
  mfa,
  "authenticator.check",
  "TOTP verification",
);

requireText(
  mfa,
  "admin_mfa_recovery_codes",
  "recovery-code verification",
);

requireText(
  mfa,
  "MAX_FAILURES = 5",
  "MFA lockout",
);

requireText(
  routes,
  'app.use("/api/admin", requireAdminMfa)',
  "server-side Control Room MFA gate",
);

requireText(
  gate,
  "Current administrator password",
  "password enrollment UI",
);

requireText(
  gate,
  "Authenticator or recovery code",
  "MFA challenge UI",
);

requireText(
  index,
  'app.disable("x-powered-by")',
  "Express fingerprint reduction",
);

requireText(
  index,
  "helmet({",
  "security headers",
);

requireText(
  compose,
  '"127.0.0.1:5000:5000"',
  "loopback application port",
);

rejectText(
  compose,
  '- "5000:5000"',
  "public port 5000",
);

requireText(
  migration,
  "admin_mfa_credentials",
  "MFA credential table",
);

requireText(
  migration,
  "admin_mfa_recovery_codes",
  "recovery table",
);

console.log(
  "Level-4 security regression: PASS",
);
