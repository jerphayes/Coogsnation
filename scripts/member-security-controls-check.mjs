import fs from "node:fs";

const read = path =>
  fs.readFileSync(
    path,
    "utf8",
  );

const must = (
  path,
  marker,
) => {
  if (
    !read(path).includes(
      marker,
    )
  ) {
    throw new Error(
      `${path} missing: ${marker}`,
    );
  }
};

const mustNot = (
  path,
  marker,
) => {
  if (
    read(path).includes(
      marker,
    )
  ) {
    throw new Error(
      `${path} must not contain: ${marker}`,
    );
  }
};

must(
  "client/src/components/MemberMfaPanel.tsx",
  'role="switch"',
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "I understand that turning off two-factor authentication (2FA) increases the risk to my account security",
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "TURN 2FA OFF",
);

must(
  "client/src/components/MemberMfaPanel.tsx",
  "autoStart?: boolean",
);

mustNot(
  "client/src/components/MemberMfaPanel.tsx",
  'placeholder="Current password"',
);

must(
  "client/src/pages/ProfileCompletion.tsx",
  "Set up 2FA as the next security step.",
);

must(
  "client/src/pages/ProfileCompletion.tsx",
  "post-registration-mfa-step",
);

must(
  "client/src/pages/ProfileCompletion.tsx",
  "<MemberMfaPanel",
);

must(
  "server/memberMfa.ts",
  "member_mfa_recovery_codes",
);

must(
  "server/memberMfa.ts",
  'member.role === "admin"',
);

must(
  "server/routes.ts",
  "2 attempts remaining before your account is temporarily locked",
);

must(
  "server/routes.ts",
  "1 attempt remaining before your account is temporarily locked",
);

must(
  "client/src/components/LoginComponent.tsx",
  "Security Warning",
);

must(
  "client/src/components/LoginComponent.tsx",
  "login-attempt-warning",
);

console.log(
  "PASS: member security controls contract",
);
