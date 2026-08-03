import fs from "node:fs";
import path from "node:path";

const failures = [];
const requireCheck = (condition, message) => { if (!condition) failures.push(message); };
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
const auth = fs.readFileSync("server/auth.ts", "utf8");
const database = fs.readFileSync("server/db.ts", "utf8");
const files = fs.readFileSync("server/fileStorage.ts", "utf8");
const vite = fs.readFileSync("vite.config.ts", "utf8");

requireCheck(fs.existsSync("server/auth.ts"), "portable authentication module is missing");
requireCheck(fs.existsSync("server/fileStorage.ts"), "portable file storage module is missing");
requireCheck(database.includes('from "pg"') && database.includes("drizzle-orm/node-postgres"), "database layer must use standard PostgreSQL");
requireCheck(auth.includes("/api/auth/providers") && auth.includes("login-local") === false, "authentication provider discovery route is missing");
requireCheck(files.includes("UPLOADS_DIR") && files.includes("path.resolve"), "filesystem storage must use a configurable safe root");
requireCheck(!vite.includes("runtimeErrorOverlay") && !vite.includes("cartographer"), "platform-specific Vite plugins remain");

for (const dependency of [
  "openid-client",
  "@google-cloud/storage",
  "@neondatabase/serverless",
  "@uppy/aws-s3",
  "@uppy/core",
  "@uppy/dashboard",
  "@uppy/react"
]) {
  requireCheck(!(dependency in dependencies), `unused vendor-specific dependency remains: ${dependency}`);
}

for (const legacyFile of ["server/objectStorage.ts", "server/objectAcl.ts", "client/src/components/ObjectUploader.tsx"]) {
  requireCheck(!fs.existsSync(legacyFile), `legacy storage file remains: ${legacyFile}`);
}

for (const requiredFile of ["Dockerfile", "docker-compose.yml", ".env.example", "README.md"]) {
  requireCheck(fs.existsSync(requiredFile), `portable runtime file is missing: ${requiredFile}`);
}

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".html", ".md", ".json"]);
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "attached_assets"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (sourceExtensions.has(path.extname(entry.name))) {
      const text = fs.readFileSync(fullPath, "utf8");
      requireCheck(!text.includes(["127.0.0.1", "1106"].join(":")), `local platform sidecar reference remains in ${fullPath}`);
    }
  }
}
walk(".");

if (failures.length) {
  console.error("Portable foundation checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("Portable foundation checks passed.");
