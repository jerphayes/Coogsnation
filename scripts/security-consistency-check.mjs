import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const must = (path, text) => {
  if (!read(path).includes(text)) {
    throw new Error(
      `${path} missing security contract: ${text}`,
    );
  }
};

const mustNot = (path, text) => {
  if (read(path).includes(text)) {
    throw new Error(
      `${path} unexpectedly contains: ${text}`,
    );
  }
};

must(
  "client/src/components/SecurePasswordGenerator.tsx",
  "crypto.getRandomValues",
);

must(
  "client/src/components/SecurePasswordGenerator.tsx",
  "characters.length < 16",
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "We strongly suggest that you register for two-factor authentication (2FA).",
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "Enable 2FA with an Authenticator App",
);

mustNot(
  "client/src/pages/JoinEmail.tsx",
  "SecurePasswordGenerator",
);

must(
  "client/src/pages/ProfileCompletion.tsx",
  "SecurePasswordGenerator",
);

must(
  "client/src/pages/ResetPassword.tsx",
  "SecurePasswordGenerator",
);

must(
  "client/src/pages/ResetPassword.tsx",
  "lockedFromLogin",
);

must(
  "client/src/components/LoginComponent.tsx",
  "Account Temporarily Locked",
);

must(
  "client/src/components/LoginComponent.tsx",
  "/reset-password?identifier=",
);

must(
  "server/routes.ts",
  "(updatedUser.mfaAttempts || 0) >= 3",
);

must(
  "server/passwordService.ts",
  "password.length < 9",
);

must(
  "server/storage.ts",
  "MEMBERSHIP_DELETE_MFA_CLEANUP_V1",
);

must(
  "server/storage.ts",
  "DELETE FROM member_mfa_credentials",
);

must(
  "server/storage.ts",
  "DELETE FROM member_mfa_recovery_codes",
);

console.log(
  "PASS: security consistency contract",
);
