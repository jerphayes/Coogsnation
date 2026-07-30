import type { AIConfig, GeminiAIConfig } from "./config";
import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { OpenAICompatibleProvider } from "./providers/openAICompatible";

export function createAIProvider(config: AIConfig | GeminiAIConfig): AIProvider {
  if (config.provider === "anthropic") return new AnthropicProvider(config as AIConfig);
  if (config.provider === "gemini") return new GeminiProvider(config as GeminiAIConfig);
  return new OpenAICompatibleProvider(config as AIConfig);
}
