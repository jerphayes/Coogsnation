import fs from "node:fs";

const backend = fs.readFileSync(
  "server/businessControlPanels.ts",
  "utf8",
);

const frontend = fs.readFileSync(
  "client/src/pages/BusinessControlPanels.tsx",
  "utf8",
);

for (const needle of [
  "async function loadGetEmPanel()",
  "sportsFactsEngine.snapshot()",
  "getem_contests",
  "getem_contest_members",
  "getem_games",
  "getem_picks",
  "loadGetEmPanel()",
]) {
  if (!backend.includes(needle)) {
    throw new Error(`[GETEM CONTROL ROOM] missing backend: ${needle}`);
  }
}

for (const needle of [
  "NGF Get'em core tables",
  "Open contests accepting players",
  "OPEN PICK'EM",
  "READY •",
  "Engine connected • next operations pass",
]) {
  if (!frontend.includes(needle)) {
    throw new Error(`[GETEM CONTROL ROOM] missing frontend: ${needle}`);
  }
}

if (frontend.includes("Pending engine connection")) {
  throw new Error("[GETEM CONTROL ROOM] stale pending text remains");
}

console.log("[GETEM CONTROL ROOM] PASS");
