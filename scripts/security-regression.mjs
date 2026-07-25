import fs from "node:fs";

const routes = fs.readFileSync("server/routes.ts", "utf8");
const index = fs.readFileSync("server/index.ts", "utf8");
const auth = fs.readFileSync("server/replitAuth.ts", "utf8");
const gitignore = fs.readFileSync(".gitignore", "utf8");
const schema = fs.readFileSync("shared/schema.ts", "utf8");
const advancedProfile = fs.readFileSync("client/src/pages/AdvancedProfile.tsx", "utf8");

const failures = [];
const requireCheck = (condition, message) => { if (!condition) failures.push(message); };

requireCheck(!routes.includes("app.post('/api/upload-avatar'"), "legacy unauthenticated avatar route still exists");
requireCheck(!routes.includes("claims.sub") && !routes.includes("claims?.sub"), "legacy req.user claims access remains in routes");
requireCheck((index.match(/app\.use\(session/g) || []).length === 0, "index.ts must not register session middleware");
requireCheck((auth.match(/app\.use\(sessionMiddleware\)/g) || []).length === 1, "exactly one authoritative session middleware expected");
requireCheck(!routes.includes('origin: "*"'), "Socket.IO wildcard origin remains");
requireCheck((routes.match(/app\.get\("\/objects\/:objectPath\(\*\)"/g) || []).length === 1, "object route must be registered once");
requireCheck(gitignore.includes(".env") && gitignore.includes("*.pem") && gitignore.includes("*.key"), "secret-file patterns missing from .gitignore");
requireCheck(index.includes('process.on("unhandledRejection"') && index.includes('process.on("uncaughtException"'), "fatal process handlers missing");
requireCheck(!schema.includes("userProfileUpdateSchema = createInsertSchema(users)"), "profile updates must use an explicit allowlist");
const profileSchemaStart = schema.indexOf("export const userProfileUpdateSchema");
const profileSchemaEnd = schema.indexOf("// Local account registration schema", profileSchemaStart);
const profileSchemaBlock = schema.slice(profileSchemaStart, profileSchemaEnd);
for (const forbiddenField of [
  "role:", "passwordHash:", "emailVerificationTokenHash:", "mfaToken:",
  "failedLoginAttempts:", "lockedUntil:", "isLocalAccount:",
  "emailVerifiedAt:", "isProfileComplete:",
]) {
  requireCheck(!profileSchemaBlock.includes(forbiddenField), `profile allowlist exposes ${forbiddenField}`);
}
requireCheck(schema.includes("export const userProfileUpdateSchema = z.object(") && schema.includes("}).strict();"), "strict profile allowlist missing");
requireCheck(schema.includes("export function createSelfUser") && schema.includes("export function createAdminSafeUser"), "context-specific safe-user allowlists missing");
requireCheck(!routes.includes("res.json(updatedUser);"), "raw user record is returned by a route");
requireCheck(!advancedProfile.includes("/api/upload-avatar"), "client still calls deleted insecure avatar endpoint");
requireCheck(advancedProfile.includes("/api/auth/upload-avatar"), "client is not using the secure avatar endpoint");


if (failures.length) {
  console.error("Security regression checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("Security regression checks passed.");
