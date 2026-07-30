export type PrimaryAIProviderName = "openai" | "anthropic" | "deepseek" | "xai" | "ollama" | "custom";
export type AIProviderName = PrimaryAIProviderName | "gemini";

export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export type AIProviderPreference = "auto" | "primary" | "gemini";

export interface AIInlineMedia {
  kind: "inline";
  mimeType: string;
  data: string;
  name?: string;
  sizeBytes?: number;
}

export interface AIYouTubeMedia {
  kind: "youtube";
  url: string;
}

export type AIMediaInput = AIInlineMedia | AIYouTubeMedia;

export interface AICompletionRequest {
  messages: AIMessage[];
  maxOutputTokens: number;
  temperature: number;
  media?: AIMediaInput[];
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AICompletion {
  text: string;
  usage: AIUsage;
  provider: AIProviderName;
  model: string;
}

export interface AIModerationResult {
  allowed: boolean;
  categories: string[];
  reason?: string;
  provider: AIProviderName;
  model: string;
  usage: AIUsage;
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly model: string;
  complete(request: AICompletionRequest): Promise<AICompletion>;
  stream(request: AICompletionRequest, onChunk: (chunk: string) => void | Promise<void>): Promise<AICompletion>;
  moderate?(text: string): Promise<AIModerationResult>;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 503,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}
