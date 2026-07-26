import type { AIProviderName } from "./types";

export interface AIConfig {
  enabled: boolean;
  provider: AIProviderName;
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

const PROVIDERS = new Set<AIProviderName>([
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

function defaultBaseUrl(provider: AIProviderName): string {
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

function providerApiKey(provider: AIProviderName): string | undefined {
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
  const rawProvider = (process.env.AI_PROVIDER || "openai").toLowerCase() as AIProviderName;
  if (!PROVIDERS.has(rawProvider)) {
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
      "You are the CoogsNation AI Assistant. Help authenticated community members with CoogsNation features, University of Houston community topics, and general questions. Be accurate, concise, respectful, and transparent when uncertain. Never claim to have performed an action you did not perform.",
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

export function getPublicAIConfig(config: AIConfig) {
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
  };
}
