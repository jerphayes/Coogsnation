import fs from "node:fs";

const auth = fs.readFileSync("server/auth.ts", "utf8");
const dashboard = fs.readFileSync("server/adminDashboard.ts", "utf8");
const adminAI = fs.readFileSync("server/adminAI.ts", "utf8");
const routes = fs.readFileSync("server/routes.ts", "utf8");
const schema = fs.readFileSync("shared/schema.ts", "utf8");
const client = fs.readFileSync("client/src/pages/OwnerAdminDashboard.tsx", "utf8");
const app = fs.readFileSync("client/src/App.tsx", "utf8");
const env = fs.readFileSync(".env.example", "utf8");
const audit = fs.readFileSync("server/authAudit.ts", "utf8");
const bootstrap = fs.readFileSync("scripts/bootstrap-owner.ts", "utf8");
const newsAdmin = fs.readFileSync("client/src/pages/NewsAdmin.tsx", "utf8");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(auth.includes("export const requireOwner"), "owner-only middleware is missing");
check(auth.includes("OWNER_USER_ID") && auth.includes('dbUser.role !== "admin"'), "owner middleware must require both configured ID and database admin role");
check(routes.includes("registerAdminDashboardRoutes(app)"), "administrator dashboard routes are not registered");
check(dashboard.includes('app.patch("/api/admin/users/:id/status", requireAdmin'), "account status route must require administrator access");
check(dashboard.includes('app.patch("/api/admin/users/:id/role", requireOwner'), "role changes must require owner access");
check(dashboard.includes("currentPassword") && dashboard.includes("PasswordService.verifyPassword"), "sensitive administrator actions must require password confirmation");
check(dashboard.includes("sessionVersion: sql`${users.sessionVersion} + 1`"), "status and role changes must revoke existing sessions");
check(dashboard.includes('eventType: "admin_account_action"'), "administrator account changes must be audited");
check(dashboard.includes("db.transaction") && dashboard.includes("recordRequiredAuthEvent"), "sensitive account mutations and audit writes must be atomic");
check(audit.includes("recordRequiredAuthEvent") && audit.includes("executor.execute"), "required audit writer is missing");
check(dashboard.includes("The configured owner cannot be demoted"), "owner demotion protection is missing");
check(dashboard.includes("cannot be suspended or disabled"), "owner suspension protection is missing");
check(adminAI.includes("ADMIN_AI_ENABLED") && adminAI.includes("ADMIN_AI_API_KEY"), "administrator AI must use separate configuration");
check(adminAI.includes("You have no tools") && adminAI.includes("execution_status"), "administrator AI read-only boundary is missing");
check(!adminAI.includes("getAIService("), "administrator AI must not reuse the public AI service singleton");
check(env.includes("OWNER_USER_ID=") && env.includes("ADMIN_AI_ENABLED=false"), "owner/admin AI environment examples are missing");
check(schema.includes("| 'accountStatus'"), "administrator-safe user response must expose account status");
check(!client.includes("passwordHash") && !client.includes("SESSION_SECRET") && !client.includes("API_KEY"), "administrator client must not reference secret fields");
check(app.includes('path="/admin" component={OwnerAdminDashboard}'), "new control room is not mounted at /admin");
check(app.includes('path="/admin-full" component={OwnerAdminDashboard}') && !app.includes("TestAdmin"), "legacy administrator routes must not expose stale dashboards");
check(!routes.includes("/api/admin/unlock-account"), "legacy password-free account unlock route must be removed");
check(!routes.includes("/api/admin/ai/knowledge/:id/approval"), "first-release administrator AI must expose no write endpoint");
check(newsAdmin.includes('user?.role === "admin"') && !newsAdmin.includes("46031129"), "news administration client gate must use the database role");
check(bootstrap.includes("OWNER_USER_ID") && bootstrap.includes("BEGIN") && bootstrap.includes("auth_audit_events"), "safe owner bootstrap command is missing");
check(client.includes("Append-only audit history") && client.includes("Read-only administrator analyst"), "dashboard audit and AI panels are missing");

if (failures.length) {
  console.error("Administrator dashboard regression checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("Administrator dashboard regression checks passed.");
