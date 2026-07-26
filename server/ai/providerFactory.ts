import type { AIConfig } from "./config";
import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAICompatibleProvider } from "./providers/openAICompatible";

export function createAIProvider(config: AIConfig): AIProvider {
  if (config.provider === "anthropic") return new AnthropicProvider(config);
  return new OpenAICompatibleProvider(config);
}
