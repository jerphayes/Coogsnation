import type { AIConfig } from "../config";
import type { AICompletion, AICompletionRequest, AIProvider } from "../types";
import { AIServiceError } from "../types";
import { estimateMessageTokens, estimateTokens, sanitizeAIText } from "../utils";

async function errorFromResponse(response: Response): Promise<AIServiceError> {
  const body = await response.text().catch(() => "");
  return new AIServiceError(
    `AI provider request failed with status ${response.status}${body ? `: ${body.slice(0, 500)}` : ""}`,
    "PROVIDER_HTTP_ERROR",
    response.status === 429 ? 429 : 503,
    response.status === 429 || response.status >= 500,
  );
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  readonly model: string;

  constructor(private readonly config: AIConfig) {
    this.model = config.model;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey || "",
      "anthropic-version": this.config.anthropicVersion,
    };
  }

  private body(request: AICompletionRequest, stream: boolean) {
    const system = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const messages = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content }));
    return {
      model: this.model,
      system,
      messages,
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature,
      stream,
    };
  }

  async complete(request: AICompletionRequest): Promise<AICompletion> {
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(request, false)),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!response.ok) throw await errorFromResponse(response);
    const data = await response.json() as any;
    const text = sanitizeAIText(
      (data.content || []).filter((item: any) => item.type === "text").map((item: any) => item.text).join(""),
      this.config.maxOutputChars,
    );
    if (!text) throw new AIServiceError("AI provider returned an empty response", "EMPTY_RESPONSE", 503, true);
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: Number(data.usage?.input_tokens || estimateMessageTokens(request.messages)),
        outputTokens: Number(data.usage?.output_tokens || estimateTokens(text)),
      },
    };
  }

  async stream(request: AICompletionRequest, onChunk: (chunk: string) => void | Promise<void>): Promise<AICompletion> {
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(request, true)),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!response.ok) throw await errorFromResponse(response);
    if (!response.body) throw new AIServiceError("AI provider did not provide a response stream", "NO_STREAM", 503, true);

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let inputTokens = estimateMessageTokens(request.messages);
    let outputTokens = 0;

    for await (const rawChunk of response.body as any) {
      buffer += decoder.decode(rawChunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const event = JSON.parse(payload);
          if (event.type === "message_start") {
            inputTokens = Number(event.message?.usage?.input_tokens || inputTokens);
          }
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const chunk = String(event.delta.text || "");
            if (chunk) {
              fullText += chunk;
              await onChunk(chunk);
            }
          }
          if (event.type === "message_delta") {
            outputTokens = Number(event.usage?.output_tokens || outputTokens);
          }
        } catch {
          // Ignore keepalive and non-JSON event lines.
        }
      }
    }

    const text = sanitizeAIText(fullText, this.config.maxOutputChars);
    if (!text) throw new AIServiceError("AI provider returned an empty stream", "EMPTY_RESPONSE", 503, true);
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: { inputTokens, outputTokens: outputTokens || estimateTokens(text) },
    };
  }
}
