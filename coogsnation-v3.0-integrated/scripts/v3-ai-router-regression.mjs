import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const config = read("server/ai/config.ts");
const service = read("server/ai/service.ts");
const gemini = read("server/ai/providers/gemini.ts");
const openai = read("server/ai/providers/openAICompatible.ts");
const publicRoutes = read("server/publicAI.ts");
const routes = read("server/routes.ts");
const widget = read("client/src/components/ChatWidget.tsx");
const commerce = read("server/commerce/service.ts");
const shopify = read("server/commerce/providers/shopify.ts");
const env = read(".env.example");
const adminAI = read("server/adminAI.ts");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(packageJson.version === "3.0.0", "package.json must report version 3.0.0");
check(packageLock.version === "3.0.0" && packageLock.packages?.[""]?.version === "3.0.0", "package-lock version must be 3.0.0");
check(config.includes("loadAIRouterConfig") && config.includes("loadGeminiAIConfig"), "dual-provider router configuration is missing");
check(config.includes("PRIMARY_PROVIDERS") && !config.includes('case "gemini": return process.env.AI_GEMINI_API_KEY'), "Gemini must remain a separately configured specialist, not an OpenAI-compatible primary provider");
check(config.includes("AI_GEMINI_API_KEY") && !config.includes("process.env.ADMIN_AI_API_KEY"), "Gemini must use a separate public key and never inherit admin credentials");
check(service.includes("selectProvider") && service.includes('selectGemini("gemini_media")'), "automatic media routing is missing");
check(service.includes("media.length ? null") && service.includes("auditPrompt"), "media must not enter learned-answer storage or raw audit content");
check(gemini.includes('"x-goog-api-key"') && gemini.includes(":generateContent") && gemini.includes(":streamGenerateContent?alt=sse"), "native Gemini REST adapter is incomplete");
check(gemini.includes("fileData") && gemini.includes("inlineData"), "Gemini YouTube and inline media parts are missing");
check(!gemini.includes("temperature: request.temperature"), "Gemini 3.5 requests must not send deprecated sampling parameters");
check(openai.includes("max_completion_tokens") && openai.includes("MEDIA_PROVIDER_MISMATCH"), "OpenAI GPT-5 compatibility or media boundary is missing");
check(publicRoutes.includes('app.post(\n    "/api/ai/v3/chat"') && publicRoutes.includes("isAuthenticated") && publicRoutes.includes("aiLimiter"), "v3 public route must require authentication and rate limiting");
check(publicRoutes.includes("mediaSignatureMatches") && publicRoutes.includes("Only public HTTPS YouTube URLs"), "media content and YouTube URL validation are missing");
check(routes.includes("registerPublicAIRoutes") && routes.includes("registerCommerceRoutes"), "v3 routes are not registered");
check(widget.includes("CoogsNation AI v3.0") && widget.includes("/api/ai/v3/chat") && widget.includes("FormData"), "v3 chat UI is not connected to the router");
check(widget.includes("OpenAI conversation") && widget.includes("Gemini multimedia"), "provider routing choices are not visible to members");
check(commerce.includes("contextForAI") && commerce.includes("isShoppingIntent"), "commerce catalog context is not integrated");
check(shopify.includes("X-Shopify-Storefront-Access-Token") && shopify.includes("2026-07") === false, "Shopify provider must use a configured API version and server-side Storefront token");
check(shopify.includes("cartRead: false") && shopify.includes("cartMutation: false") && shopify.includes("checkoutUrl: false"), "unimplemented Shopify cart and checkout capabilities must remain disabled in v3.0");
check(env.includes("SHOPIFY_STOREFRONT_ACCESS_TOKEN=") && env.includes("AI_ROUTER_AUTO_MEDIA=true"), "v3 environment examples are incomplete");
check(adminAI.includes("ADMIN_AI_API_KEY") && !adminAI.includes("AI_GEMINI_API_KEY"), "administrator AI isolation must be preserved");

if (failures.length) {
  console.error("CoogsNation v3.0 AI router regression checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("CoogsNation v3.0 AI router regression checks passed.");
