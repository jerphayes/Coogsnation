import { access, readFile } from "node:fs/promises";

const requiredAssets = [
  "client/public/coogpaws/lounge/rotation/A.png",
  "client/public/coogpaws/lounge/rotation/B.png",
  "client/public/coogpaws/lounge/rotation/C.png",
];

for (const asset of requiredAssets) {
  await access(asset);
}

const [
  background,
  forum,
  coogpaws,
  overlay,
] = await Promise.all([
  readFile(
    "client/src/components/lounge/RotatingLoungeBackground.tsx",
    "utf8",
  ),
  readFile(
    "client/src/pages/ForumTopic.tsx",
    "utf8",
  ),
  readFile(
    "client/src/pages/CoogpawsChat.tsx",
    "utf8",
  ),
  readFile(
    "client/src/components/lounge/LoungeChatOverlay.tsx",
    "utf8",
  ),
]);

function requireText(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(
      `[LOUNGE VISUAL REGRESSION] Missing ${label}`,
    );
  }
}

function rejectText(source, text, label) {
  if (source.includes(text)) {
    throw new Error(
      `[LOUNGE VISUAL REGRESSION] Forbidden ${label}`,
    );
  }
}

/* Assets and fixed room assignments */
requireText(
  background,
  'football: "/coogpaws/lounge/rotation/A.png"',
  "football room mapping",
);

requireText(
  background,
  'basketball: "/coogpaws/lounge/rotation/B.png"',
  "basketball room mapping",
);

requireText(
  background,
  'cougar: "/coogpaws/lounge/rotation/C.png"',
  "cougar room mapping",
);

/* Forum routing */
requireText(
  forum,
  'category?.slug === "football"',
  "football forum selection",
);

requireText(
  forum,
  'category?.slug?.includes("basketball")',
  "basketball forum selection",
);

requireText(
  forum,
  ': "cougar"',
  "default cougar forum selection",
);

/* General Coog Paws room */
requireText(
  coogpaws,
  '<RotatingLoungeBackground variant="cougar" />',
  "Coog Paws cougar room",
);

/* Rotation must stay removed */
rejectText(
  background,
  "loungeRotationTest",
  "rotation diagnostic switch",
);

rejectText(
  background,
  "setInterval(",
  "rotation timer",
);

rejectText(
  background,
  "ROTATION_MS",
  "rotation interval constant",
);

/* Chat window behavior */
requireText(
  overlay,
  "coogsnation-lounge-window-v2",
  "lounge window layout",
);

requireText(
  overlay,
  "INCREASE SCREEN SIZE",
  "increase-screen hover advisory",
);

requireText(
  overlay,
  "DRAG EDGES TO CUSTOMIZE",
  "drag customization advisory",
);

console.log(
  "Lounge visual regression: PASS — football=A, basketball=B, cougar=C, rotation disabled.",
);
