import {
  strict as assert,
} from "node:assert";

import {
  readFileSync,
} from "node:fs";

const forums =
  readFileSync(
    "client/src/pages/Forums.tsx",
    "utf8",
  );

assert(
  forums.includes(
    "💬 Forum & Announcements",
  ),
);

assert(
  forums.includes(
    "🏆 Teams, Scores & Results",
  ),
);

assert(
  forums.includes(
    'href="/intramurals"',
  ),
);

const intramurals =
  readFileSync(
    "client/src/pages/Intramurals.tsx",
    "utf8",
  );

assert(
  intramurals.includes(
    'href="/forums/other-sports-men"',
  ),
);

assert(
  intramurals.includes(
    "Intramural Forum & Announcements",
  ),
);

console.log(
  "NGF intramural navigation tests: PASS",
);
