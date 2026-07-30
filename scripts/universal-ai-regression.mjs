import fs from "node:fs";

const routes = [
  fs.readFileSync("server/routes.ts", "utf8"),
  fs.readFileSync("server/publicAI.ts", "utf8"),
].join("\n");
const schema = fs.readFileSync("shared/schema.ts", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const envExample = fs.readFileSync(".env.example", "utf8");
const config = fs.readFileSync("server/ai/config.ts", "utf8");
const gemini = fs.readFileSync("server/ai/providers/gemini.ts", "utf8");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!routes.includes("learningDB"), "SQLite learningDB must not remain in routes");
assert(!routes.includes("simulated AI response"), "Simulated AI response must not remain");
assert(!routes.includes("VITE_AI_ENABLED"), "Server must not trust VITE_AI_ENABLED");
assert(routes.includes("getAIService"), "Routes must use the universal AI service");
assert(routes.includes("aiService.stream"), "Socket AI must use real provider streaming");
assert(routes.includes("aiService.assertSocketRate"), "AI socket rate limiting must be enabled");
assert(routes.includes("/api/ai/v3/chat"), "v3 routed public AI endpoint is missing");
assert(schema.includes("ai_knowledge"), "PostgreSQL AI knowledge table is required");
assert(schema.includes("ai_interactions"), "PostgreSQL AI usage/audit table is required");
assert(!packageJson.dependencies.sqlite, "sqlite dependency must be removed");
assert(!packageJson.dependencies.sqlite3, "sqlite3 dependency must be removed");
assert(envExample.includes("AI_PROVIDER="), "Universal provider setting is missing");
assert(envExample.includes("AI_MONTHLY_BUDGET_USD="), "Monthly AI budget setting is missing");
assert(envExample.includes("AI_STORE_CONVERSATIONS=false"), "Private-by-default conversation storage is missing");
assert(config.includes("AI_GEMINI_API_KEY"), "separate Gemini configuration is missing");
assert(gemini.includes("x-goog-api-key"), "Gemini key must remain server-side");

if (failures.length) {
  console.error("Universal AI regression checks failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Universal AI static regression checks passed.");
