import type { AIConfig } from "../config";
import type { AICompletion, AICompletionRequest, AIModerationResult, AIProvider } from "../types";
import { AIServiceError } from "../types";
import { estimateMessageTokens, estimateTokens, sanitizeAIText } from "../utils";

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function errorFromResponse(response: Response): Promise<AIServiceError> {
  const body = await response.text().catch(() => "");
  const safeDetail = body.slice(0, 500).replace(/[\r\n]+/g, " ");
  return new AIServiceError(
    `AI provider request failed with status ${response.status}${safeDetail ? `: ${safeDetail}` : ""}`,
    "PROVIDER_HTTP_ERROR",
    response.status === 429 ? 429 : 503,
    response.status === 429 || response.status >= 500,
  );
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: AIConfig["provider"];
  readonly model: string;

  constructor(private readonly config: AIConfig) {
    this.name = config.provider;
    this.model = config.model;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
    return headers;
  }

  async complete(request: AICompletionRequest): Promise<AICompletion> {
    if (request.media?.length) {
      throw new AIServiceError("Multimedia requests must be routed to Gemini", "MEDIA_PROVIDER_MISMATCH", 400, false);
    }
    const response = await fetch(endpoint(this.config.baseUrl, "chat/completions"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        [this.name === "openai" && this.model.startsWith("gpt-5") ? "max_completion_tokens" : "max_tokens"]: request.maxOutputTokens,
        ...(this.name === "openai" && this.model.startsWith("gpt-5")
          ? {}
          : { temperature: request.temperature }),
        ...(this.name === "openai" && this.model.startsWith("gpt-5")
          ? { reasoning_effort: "minimal" }
          : {}),
        stream: false,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) throw await errorFromResponse(response);
    const data = await response.json() as any;
    const text = sanitizeAIText(String(data.choices?.[0]?.message?.content || ""), this.config.maxOutputChars);
    if (!text) throw new AIServiceError("AI provider returned an empty response", "EMPTY_RESPONSE", 503, true);

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: Number(data.usage?.prompt_tokens || estimateMessageTokens(request.messages)),
        outputTokens: Number(data.usage?.completion_tokens || estimateTokens(text)),
      },
    };
  }

  async stream(request: AICompletionRequest, onChunk: (chunk: string) => void | Promise<void>): Promise<AICompletion> {
    if (request.media?.length) {
      throw new AIServiceError("Multimedia requests must be routed to Gemini", "MEDIA_PROVIDER_MISMATCH", 400, false);
    }
    const response = await fetch(endpoint(this.config.baseUrl, "chat/completions"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        [this.name === "openai" && this.model.startsWith("gpt-5") ? "max_completion_tokens" : "max_tokens"]: request.maxOutputTokens,
        ...(this.name === "openai" && this.model.startsWith("gpt-5")
          ? {}
          : { temperature: request.temperature }),
        ...(this.name === "openai" && this.model.startsWith("gpt-5")
          ? { reasoning_effort: "minimal" }
          : {}),
        stream: true,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) throw await errorFromResponse(response);
    if (!response.body) throw new AIServiceError("AI provider did not provide a response stream", "NO_STREAM", 503, true);

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    for await (const rawChunk of response.body as any) {
      buffer += decoder.decode(rawChunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload);
          const chunk = String(event.choices?.[0]?.delta?.content || "");
          if (!chunk) continue;
          fullText += chunk;
          await onChunk(chunk);
        } catch {
          // Ignore non-JSON keepalive/event lines from compatible providers.
        }
      }
    }

    const text = sanitizeAIText(fullText, this.config.maxOutputChars);
    if (!text) throw new AIServiceError("AI provider returned an empty stream", "EMPTY_RESPONSE", 503, true);
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: estimateMessageTokens(request.messages),
        outputTokens: estimateTokens(text),
      },
    };
  }

  async moderate(text: string): Promise<AIModerationResult> {
    const response = await fetch(endpoint(this.config.baseUrl, "moderations"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.moderationModel || "omni-moderation-latest",
        input: text,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) throw await errorFromResponse(response);
    const data = await response.json() as any;
    const result = data.results?.[0];
    if (!result) throw new AIServiceError("Moderation provider returned an invalid response", "INVALID_MODERATION", 503, true);
    const categories = Object.entries(result.categories || {})
      .filter(([, flagged]) => Boolean(flagged))
      .map(([category]) => category);
    return {
      allowed: !result.flagged,
      categories,
      reason: result.flagged ? "Content matched a restricted safety category" : undefined,
      provider: this.name,
      model: this.config.moderationModel || "omni-moderation-latest",
      usage: { inputTokens: estimateTokens(text), outputTokens: 0 },
    };
  }
}
