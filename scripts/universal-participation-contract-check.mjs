import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const mustContain = (
  path,
  text,
  message,
) => {
  if (!read(path).includes(text)) {
    throw new Error(
      `${message}: ${path}`,
    );
  }
};

const mustNotContain = (
  path,
  text,
  message,
) => {
  if (read(path).includes(text)) {
    throw new Error(
      `${message}: ${path}`,
    );
  }
};

mustContain(
  "client/src/pages/Intramurals.tsx",
  "UniversalParticipationGate",
  "Intramurals must use universal participation gate",
);

mustContain(
  "client/src/pages/GetEmPickEm.tsx",
  "UniversalParticipationGate",
  "PickEm must use universal participation gate",
);

mustContain(
  "client/src/pages/ForumCategory.tsx",
  "UniversalParticipationGate",
  "Forum categories must use universal participation gate",
);

mustContain(
  "client/src/pages/ForumTopic.tsx",
  "ParticipationGateButton",
  "Forum topics must use universal participation gate",
);

mustContain(
  "client/src/pages/Forums.tsx",
  "ParticipationGateButton",
  "Forum root must use universal participation gate",
);

mustContain(
  "client/src/pages/Venue.tsx",
  "UniversalParticipationGate",
  "Venues must use universal participation gate",
);

mustContain(
  "client/src/components/CoogpawsApp.tsx",
  "UniversalParticipationGate",
  "CoogPaws must use universal participation gate",
);

mustContain(
  "client/src/pages/Messages.tsx",
  "UniversalParticipationGate",
  "Messages must use universal participation gate",
);

mustContain(
  "client/src/pages/JoinGate.tsx",
  'returnTo === "/dashboard"',
  "Protected participation must not offer fake Guest continuation",
);

mustNotContain(
  "client/src/pages/GetEmPickEm.tsx",
  'navigate("/login?returnTo=/get-em")',
  "PickEm may not bypass universal participation gate",
);

mustNotContain(
  "client/src/pages/ForumTopic.tsx",
  "Use Guest Mode or sign in to participate.",
  "Guest Mode may not be presented as participation",
);

mustNotContain(
  "client/src/pages/ForumCategory.tsx",
  "Log in to start a topic",
  "Forum topic creation may not use direct login gate",
);

mustNotContain(
  "client/src/pages/Venue.tsx",
  'onClick: () => navigate("/login")',
  "Venue may not use direct login gate",
);

mustNotContain(
  "client/src/components/CoogpawsApp.tsx",
  'href="/login"',
  "CoogPaws may not use direct login gate",
);

mustNotContain(
  "client/src/pages/Messages.tsx",
  "Please Log In",
  "Messages may not use legacy login-only gate",
);

console.log(
  "PASS: universal participation gate contract",
);
