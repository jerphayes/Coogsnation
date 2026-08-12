import { spawnSync } from "node:child_process";
const commands = [
  ["npm", ["exec", "tsx", "--", "tests/ngf-sports/core.test.ts"]],
  ["npm", ["exec", "tsx", "--", "tests/ngf-sports/parser.test.ts"]],
];
for (const [cmd,args] of commands) {
  const result = spawnSync(cmd, args, { stdio:"inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("[NGF SPORTS] All module checks passed");
