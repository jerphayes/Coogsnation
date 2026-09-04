import fs from "node:fs";

const read = path =>
  fs.readFileSync(path, "utf8");

const must = (path, marker) => {
  if (!read(path).includes(marker)) {
    throw new Error(
      `${path} missing recovery contract: ${marker}`,
    );
  }
};

const mustNot = (path, marker) => {
  if (read(path).includes(marker)) {
    throw new Error(
      `${path} contains forbidden recovery behavior: ${marker}`,
    );
  }
};

must(
  "server/routes.ts",
  "PASSWORD_RECOVERY_ALLOWED_DURING_LOGIN_LOCK_V1",
);

must(
  "server/routes.ts",
  "PASSWORD_RECOVERY_CANONICAL_IDENTITY_V1",
);

must(
  "server/mfaService.ts",
  "PASSWORD_RECOVERY_CHANNEL_ISOLATION_V1",
);

must(
  "server/mfaService.ts",
  "continuing with email recovery",
);

must(
  "server/mfaService.ts",
  "Send email independently",
);

must(
  "server/routes.ts",
  "storage.clearFailedLoginAttempts(user.id)",
);

mustNot(
  "server/routes.ts",
  "Password reset requested for locked account:",
);

must(
  "client/src/components/SecurePasswordGenerator.tsx",
  "generated-password-save-warning",
);

must(
  "client/src/pages/ResetPassword.tsx",
  "password-manager-update-warning",
);

console.log(
  "PASS: password recovery contract",
);
