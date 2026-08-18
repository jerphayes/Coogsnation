import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => { console.error(`AI regression check failed: ${message}`); process.exit(1); };

const requiredFiles = [
  "server/ai/types.ts",
  "server/ai/config.ts",
  "server/ai/providerFactory.ts",
  "server/ai/providers/openAICompatible.ts",
  "server/ai/providers/anthropic.ts",
  "server/ai/providers/gemini.ts",
  "server/ai/service.ts",
  "server/ai/store.ts",
  "server/publicAI.ts",
  "server/commerce/service.ts",
  "server/commerce/providers/shopify.ts",
  "migrations/0002_universal_ai.sql",
];
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

const config = read("server/ai/config.ts");
for (const provider of ["openai", "anthropic", "deepseek", "xai", "ollama", "custom"]) {
  if (!config.includes(`"${provider}"`)) fail(`primary provider ${provider} not supported`);
}
if (!config.includes('provider: "gemini"') || !config.includes("loadGeminiAIConfig")) fail("native Gemini specialist configuration missing");
if (!config.includes("AI_LEARNING_REQUIRE_APPROVAL")) fail("approval-only learning control missing");
if (!config.includes("AI_GEMINI_API_KEY")) fail("separate Gemini public key configuration missing");
if (config.includes("ADMIN_AI_API_KEY")) fail("public AI config must not read the administrator AI key");

const routes = [
  read("server/routes.ts"),
  read("server/publicAI.ts"),
  read("server/adminDashboard.ts"),
  read("server/commerce/routes.ts"),
].join("\n");
for (const route of ["/api/ask", "/api/moderate-post", "/api/vote", "/api/ai/chat", "/api/ai/v3/chat", "/api/ai/v3/status", "/api/admin/ai/status"]) {
  if (!routes.includes(route)) fail(`route ${route} missing`);
}
if (!routes.includes('io.of("/ai")')) fail("AI streaming namespace missing");
if (/simulated AI response/i.test(routes)) fail("simulated AI response remains");
if (/origin:\s*["']\*["']/.test(routes)) fail("wildcard socket origin remains");

const store = read("server/ai/store.ts");
if (!store.includes("ai_interactions")) fail("PostgreSQL usage auditing missing");
if (!store.includes("ai_knowledge_feedback")) fail("one-vote-per-user learning feedback missing");
if (!store.includes("learningRequireApproval")) fail("approval-only lookup enforcement missing");

const env = read(".env.example");
for (const key of [
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_BASE_URL",
  "AI_DAILY_USER_REQUEST_LIMIT",
  "AI_MONTHLY_BUDGET_USD",
  "AI_STORE_CONVERSATIONS",
  "AI_LEARNING_REQUIRE_APPROVAL",
  "AI_GEMINI_ENABLED",
  "AI_GEMINI_MODEL",
  "AI_GEMINI_API_KEY",
]) {
  if (!env.includes(`${key}=`)) fail(`environment setting ${key} missing`);
}

console.log("Universal AI static regression checks passed.");
