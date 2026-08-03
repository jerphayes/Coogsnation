import type { GeminiAIConfig } from "../config";
import type { AICompletion, AICompletionRequest, AIProvider, AIMediaInput } from "../types";
import { AIServiceError } from "../types";
import { estimateMessageTokens, estimateTokens, sanitizeAIText } from "../utils";

function endpoint(config: GeminiAIConfig, operation: "generateContent" | "streamGenerateContent"): string {
  const model = encodeURIComponent(config.model);
  const suffix = operation === "streamGenerateContent" ? ":streamGenerateContent?alt=sse" : ":generateContent";
  return `${config.baseUrl.replace(/\/+$/, "")}/models/${model}${suffix}`;
}

async function errorFromResponse(response: Response): Promise<AIServiceError> {
  const body = await response.text().catch(() => "");
  let detail = body.slice(0, 700).replace(/[\r\n]+/g, " ");
  try {
    const parsed = JSON.parse(body);
    detail = String(parsed?.error?.message || detail).slice(0, 700).replace(/[\r\n]+/g, " ");
  } catch {
    // Keep the sanitized text response.
  }
  return new AIServiceError(
    `Gemini request failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    "GEMINI_HTTP_ERROR",
    response.status === 400 ? 400 : response.status === 429 ? 429 : 503,
    response.status === 429 || response.status >= 500,
  );
}

function mediaPart(media: AIMediaInput): Record<string, unknown> {
  if (media.kind === "youtube") {
    return { fileData: { fileUri: media.url } };
  }
  return {
    inlineData: {
      mimeType: media.mimeType,
      data: media.data,
    },
  };
}

function requestBody(request: AICompletionRequest) {
  const system = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  if (!contents.length || contents.at(-1)?.role !== "user") {
    contents.push({ role: "user", parts: [{ text: "Please answer the request." }] });
  }

  if (request.media?.length) {
    const last = contents[contents.length - 1];
    last.parts.push(...request.media.map(mediaPart));
  }

  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: request.maxOutputTokens,
    },
  };
}

function textFromResponse(data: any): string {
  return (data?.candidates || [])
    .flatMap((candidate: any) => candidate?.content?.parts || [])
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("");
}

function blockedReason(data: any): string | undefined {
  const promptReason = data?.promptFeedback?.blockReason;
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (promptReason) return `Prompt blocked by Gemini safety controls: ${promptReason}`;
  if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
    return `Gemini stopped the response: ${finishReason}`;
  }
  return undefined;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  readonly model: string;

  constructor(private readonly config: GeminiAIConfig) {
    this.model = config.model;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": this.config.apiKey || "",
    };
  }

  async complete(request: AICompletionRequest): Promise<AICompletion> {
    const response = await fetch(endpoint(this.config, "generateContent"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(requestBody(request)),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) throw await errorFromResponse(response);
    const data = await response.json() as any;
    const text = sanitizeAIText(textFromResponse(data), this.config.maxOutputChars);
    if (!text) {
      const reason = blockedReason(data);
      throw new AIServiceError(reason || "Gemini returned an empty response", "GEMINI_EMPTY_RESPONSE", 503, false);
    }

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens: Number(data?.usageMetadata?.promptTokenCount || estimateMessageTokens(request.messages)),
        outputTokens: Number(data?.usageMetadata?.candidatesTokenCount || estimateTokens(text)),
      },
    };
  }

  async stream(request: AICompletionRequest, onChunk: (chunk: string) => void | Promise<void>): Promise<AICompletion> {
    const response = await fetch(endpoint(this.config, "streamGenerateContent"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(requestBody(request)),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) throw await errorFromResponse(response);
    if (!response.body) throw new AIServiceError("Gemini did not provide a response stream", "GEMINI_NO_STREAM", 503, true);

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let inputTokens = estimateMessageTokens(request.messages);
    let outputTokens = 0;

    const consumeLine = async (line: string): Promise<void> => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payload = trimmed.slice(5).trim();
      if (!payload) return;
      try {
        const event = JSON.parse(payload);
        const chunk = textFromResponse(event);
        if (chunk) {
          fullText += chunk;
          await onChunk(chunk);
        }
        inputTokens = Number(event?.usageMetadata?.promptTokenCount || inputTokens);
        outputTokens = Number(event?.usageMetadata?.candidatesTokenCount || outputTokens);
      } catch {
        // Ignore keepalive and malformed non-content event lines.
      }
    };

    for await (const rawChunk of response.body as any) {
      buffer += decoder.decode(rawChunk, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) await consumeLine(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) await consumeLine(buffer);

    const text = sanitizeAIText(fullText, this.config.maxOutputChars);
    if (!text) throw new AIServiceError("Gemini returned an empty stream", "GEMINI_EMPTY_RESPONSE", 503, true);
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        inputTokens,
        outputTokens: outputTokens || estimateTokens(text),
      },
    };
  }
}
