import fs from "node:fs";

const checks = [
  ["client/src/App.tsx", 'path="/get-em"'],
  ["client/src/App.tsx", 'GetEmPickEm'],
  ["client/src/components/Header.tsx", 'href="/get-em"'],
  ["client/src/pages/GetEmPickEm.tsx", "Create Game"],
  ["client/src/pages/GetEmPickEm.tsx", "Join Existing"],
  ["client/src/pages/GetEmPickEm.tsx", "/api/getem/contests"],
  ["client/src/pages/GetEmPickEm.tsx", "/api/sports/ticker"],
  ["server/routes.ts", "registerGetEmRoutes"],
  ["server/getem/routes.ts", '/api/getem/contests'],
  ["server/getem/routes.ts", '/api/getem/contests/join'],
  ["migrations/0018_getem_core.sql", "getem_contests"],
  ["migrations/0018_getem_core.sql", "getem_rank_history"],
];

for (const [file, needle] of checks) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(needle)) {
    throw new Error(`[GETEM REGRESSION] ${file} missing ${needle}`);
  }
}

console.log("[GETEM REGRESSION] PASS");
