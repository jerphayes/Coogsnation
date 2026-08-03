import type { AIProviderPreference, PrimaryAIProviderName } from "./types";

export interface AIConfig {
  enabled: boolean;
  provider: PrimaryAIProviderName;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  maxInputChars: number;
  maxOutputChars: number;
  maxOutputTokens: number;
  temperature: number;
  systemPrompt: string;
  dailyUserRequestLimit: number;
  dailyUserTokenLimit: number;
  monthlyBudgetUsd: number;
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  maxConcurrentPerUser: number;
  socketRequestsPerMinute: number;
  storeConversations: boolean;
  learningEnabled: boolean;
  learningMinScore: number;
  learningRequireApproval: boolean;
  moderationMode: "provider" | "llm" | "disabled";
  moderationModel?: string;
  anthropicVersion: string;
}

export interface GeminiAIConfig {
  enabled: boolean;
  provider: "gemini";
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  maxOutputChars: number;
  maxOutputTokens: number;
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  youtubeEnabled: boolean;
  uploadsEnabled: boolean;
  maxMediaBytes: number;
  allowedMediaMimeTypes: string[];
  systemPrompt: string;
}

export interface AIRouterConfig {
  defaultProvider: Exclude<AIProviderPreference, "auto">;
  allowUserChoice: boolean;
  autoRouteMedia: boolean;
  gemini: GeminiAIConfig;
}

const PRIMARY_PROVIDERS = new Set<PrimaryAIProviderName>([
  "openai",
  "anthropic",
  "deepseek",
  "xai",
  "ollama",
  "custom",
]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function defaultBaseUrl(provider: PrimaryAIProviderName): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com";
    case "deepseek":
      return "https://api.deepseek.com/v1";
    case "xai":
      return "https://api.x.ai/v1";
    case "ollama":
      return "http://localhost:11434/v1";
    case "custom":
      return "";
  }
}

function providerApiKey(provider: PrimaryAIProviderName): string | undefined {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  switch (provider) {
    case "openai": return process.env.OPENAI_API_KEY;
    case "anthropic": return process.env.ANTHROPIC_API_KEY;
    case "deepseek": return process.env.DEEPSEEK_API_KEY;
    case "xai": return process.env.XAI_API_KEY;
    case "ollama": return undefined;
    case "custom": return process.env.CUSTOM_AI_API_KEY;
  }
}

export function loadAIConfig(): AIConfig {
  const rawProvider = (process.env.AI_PROVIDER || "openai").toLowerCase() as PrimaryAIProviderName;
  if (!PRIMARY_PROVIDERS.has(rawProvider)) {
    throw new Error(`Unsupported AI_PROVIDER: ${rawProvider}`);
  }

  const enabled = parseBoolean(process.env.AI_ENABLED, false);
  const model = (process.env.AI_MODEL || "").trim();
  const baseUrl = normalizeBaseUrl(process.env.AI_BASE_URL || defaultBaseUrl(rawProvider));
  const apiKey = providerApiKey(rawProvider);

  if (enabled) {
    if (!model) throw new Error("AI_MODEL must be set when AI_ENABLED=true");
    if (!baseUrl) throw new Error("AI_BASE_URL must be set for the selected AI provider");
    if (rawProvider !== "ollama" && !apiKey) {
      throw new Error(`An API key must be configured for AI_PROVIDER=${rawProvider}`);
    }
  }

  const moderationModeRaw = (process.env.AI_MODERATION_MODE || "llm").toLowerCase();
  const moderationMode = ["provider", "llm", "disabled"].includes(moderationModeRaw)
    ? moderationModeRaw as AIConfig["moderationMode"]
    : "llm";

  return {
    enabled,
    provider: rawProvider,
    model,
    baseUrl,
    apiKey,
    timeoutMs: parseNumber(process.env.AI_TIMEOUT_MS, 30_000, 1_000),
    maxInputChars: parseNumber(process.env.AI_MAX_INPUT_CHARS, 4_000, 100),
    maxOutputChars: parseNumber(process.env.AI_MAX_OUTPUT_CHARS, 20_000, 1_000),
    maxOutputTokens: parseNumber(process.env.AI_MAX_OUTPUT_TOKENS, 800, 1),
    temperature: Math.min(parseNumber(process.env.AI_TEMPERATURE, 0.3, 0), 2),
    systemPrompt: process.env.AI_SYSTEM_PROMPT?.trim() ||
      "You are the CoogsNation public AI Assistant. Help authenticated community members with CoogsNation features, University of Houston community topics, product discovery, and general questions. You are not an administrator and cannot access private administrative data. Be accurate, concise, respectful, and transparent when uncertain. Never claim to have performed an action you did not perform.",
    dailyUserRequestLimit: parseNumber(process.env.AI_DAILY_USER_REQUEST_LIMIT, 50, 1),
    dailyUserTokenLimit: parseNumber(process.env.AI_DAILY_USER_TOKEN_LIMIT, 100_000, 1),
    monthlyBudgetUsd: parseNumber(process.env.AI_MONTHLY_BUDGET_USD, 0, 0),
    inputCostPerMillionTokens: parseNumber(process.env.AI_INPUT_COST_PER_MILLION_TOKENS, 0, 0),
    outputCostPerMillionTokens: parseNumber(process.env.AI_OUTPUT_COST_PER_MILLION_TOKENS, 0, 0),
    maxConcurrentPerUser: parseNumber(process.env.AI_MAX_CONCURRENT_PER_USER, 1, 1),
    socketRequestsPerMinute: parseNumber(process.env.AI_SOCKET_REQUESTS_PER_MINUTE, 10, 1),
    storeConversations: parseBoolean(process.env.AI_STORE_CONVERSATIONS, false),
    learningEnabled: parseBoolean(process.env.AI_LEARNING_ENABLED, true),
    learningMinScore: parseNumber(process.env.AI_LEARNING_MIN_SCORE, 2, 1),
    learningRequireApproval: parseBoolean(process.env.AI_LEARNING_REQUIRE_APPROVAL, true),
    moderationMode,
    moderationModel: process.env.AI_MODERATION_MODEL?.trim() || undefined,
    anthropicVersion: process.env.ANTHROPIC_VERSION?.trim() || "2023-06-01",
  };
}

export function loadGeminiAIConfig(): GeminiAIConfig {
  const enabled = parseBoolean(process.env.AI_GEMINI_ENABLED, false);
  const model = (process.env.AI_GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
  const baseUrl = normalizeBaseUrl(
    process.env.AI_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  );
  const apiKey = process.env.AI_GEMINI_API_KEY?.trim()
    || process.env.GEMINI_API_KEY?.trim()
    || process.env.GOOGLE_API_KEY?.trim()
    || undefined;

  if (enabled) {
    if (!model) throw new Error("AI_GEMINI_MODEL must be set when AI_GEMINI_ENABLED=true");
    if (!baseUrl) throw new Error("AI_GEMINI_BASE_URL must be set when AI_GEMINI_ENABLED=true");
    if (!apiKey) throw new Error("AI_GEMINI_API_KEY must be configured when AI_GEMINI_ENABLED=true");
  }

  const allowedMediaMimeTypes = (process.env.AI_GEMINI_ALLOWED_MEDIA_MIME_TYPES
    || "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,application/pdf")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return {
    enabled,
    provider: "gemini",
    model,
    baseUrl,
    apiKey,
    timeoutMs: parseNumber(process.env.AI_GEMINI_TIMEOUT_MS, 90_000, 1_000),
    maxOutputChars: parseNumber(process.env.AI_GEMINI_MAX_OUTPUT_CHARS, 30_000, 1_000),
    maxOutputTokens: parseNumber(process.env.AI_GEMINI_MAX_OUTPUT_TOKENS, 1_200, 1),
    inputCostPerMillionTokens: parseNumber(process.env.AI_GEMINI_INPUT_COST_PER_MILLION_TOKENS, 0.30, 0),
    outputCostPerMillionTokens: parseNumber(process.env.AI_GEMINI_OUTPUT_COST_PER_MILLION_TOKENS, 2.50, 0),
    youtubeEnabled: parseBoolean(process.env.AI_GEMINI_YOUTUBE_ENABLED, true),
    uploadsEnabled: parseBoolean(process.env.AI_GEMINI_UPLOADS_ENABLED, true),
    maxMediaBytes: parseNumber(process.env.AI_GEMINI_MAX_MEDIA_BYTES, 25 * 1024 * 1024, 1),
    allowedMediaMimeTypes,
    systemPrompt: process.env.AI_GEMINI_SYSTEM_PROMPT?.trim() ||
      "You are the CoogsNation multimedia specialist. Analyze only the image, audio, video, PDF, or public YouTube material supplied with the member's request. Describe what is supported by the media, cite timestamps when useful, distinguish observation from inference, and say when evidence is insufficient. Never access or claim access to administrator systems, private user data, credentials, or payment information.",
  };
}

export function loadAIRouterConfig(): AIRouterConfig {
  const configuredDefault = (process.env.AI_ROUTER_DEFAULT || "primary").toLowerCase();
  return {
    defaultProvider: configuredDefault === "gemini" ? "gemini" : "primary",
    allowUserChoice: parseBoolean(process.env.AI_ROUTER_ALLOW_USER_CHOICE, true),
    autoRouteMedia: parseBoolean(process.env.AI_ROUTER_AUTO_MEDIA, true),
    gemini: loadGeminiAIConfig(),
  };
}

export function getPublicAIConfig(config: AIConfig, router = loadAIRouterConfig()) {
  return {
    enabled: config.enabled,
    provider: config.enabled ? config.provider : null,
    model: config.enabled ? config.model : null,
    streaming: true,
    maxInputChars: config.maxInputChars,
    storeConversations: config.storeConversations,
    learningEnabled: config.learningEnabled,
    learningRequireApproval: config.learningRequireApproval,
    moderationEnabled: config.moderationMode !== "disabled",
    routing: {
      defaultProvider: router.defaultProvider,
      allowUserChoice: router.allowUserChoice,
      autoRouteMedia: router.autoRouteMedia,
      gemini: {
        enabled: router.gemini.enabled,
        model: router.gemini.enabled ? router.gemini.model : null,
        youtubeEnabled: router.gemini.enabled && router.gemini.youtubeEnabled,
        uploadsEnabled: router.gemini.enabled && router.gemini.uploadsEnabled,
        maxMediaBytes: router.gemini.maxMediaBytes,
        allowedMediaMimeTypes: router.gemini.allowedMediaMimeTypes,
      },
    },
  };
}
