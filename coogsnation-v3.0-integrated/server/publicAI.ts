import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { aiV3ChatRequestSchema } from "@shared/schema";
import type { UniversalAIService } from "./ai/service";
import { AIServiceError, type AIMediaInput } from "./ai/types";

type Middleware = (req: any, res: any, next: any) => unknown;

interface RegisterPublicAIRoutesOptions {
  aiService: UniversalAIService;
  isAuthenticated: Middleware;
  aiLimiter: Middleware;
}

function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "youtu.be"
      || host === "youtube.com"
      || host.endsWith(".youtube.com")
      || host === "youtube-nocookie.com"
      || host.endsWith(".youtube-nocookie.com");
  } catch {
    return false;
  }
}

function hasPrefix(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function mediaSignatureMatches(buffer: Buffer, mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  if (mime === "image/jpeg") return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  if (mime === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "video/mp4" || mime === "video/quicktime") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (mime === "video/webm") return hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  if (mime === "audio/wav") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
  if (mime === "audio/mpeg") {
    return buffer.subarray(0, 3).toString("ascii") === "ID3"
      || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  }
  return false;
}

function sendAIError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Invalid AI request", errors: error.errors });
  }
  if (error instanceof AIServiceError) {
    return res.status(error.statusCode).json({ message: error.message, code: error.code });
  }
  console.error("Public AI v3 request failed:", error);
  return res.status(503).json({ message: "AI service unavailable", code: "AI_SERVICE_ERROR" });
}

export function registerPublicAIRoutes(app: Express, options: RegisterPublicAIRoutesOptions): void {
  const { aiService, isAuthenticated, aiLimiter } = options;
  const maxBytes = aiService.routerConfig.gemini.maxMediaBytes;
  const allowedMimeTypes = new Set(aiService.routerConfig.gemini.allowedMediaMimeTypes);

  const mediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 8 },
    fileFilter: (_req, file, callback) => {
      const mime = String(file.mimetype || "").toLowerCase();
      if (!allowedMimeTypes.has(mime)) {
        callback(new Error(`Unsupported media type: ${mime || "unknown"}`));
        return;
      }
      callback(null, true);
    },
  }).single("media");

  const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    mediaUpload(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Media file exceeds the configured size limit", code: "MEDIA_TOO_LARGE" });
      }
      return res.status(400).json({ message: error.message || "Invalid media upload", code: "INVALID_MEDIA" });
    });
  };

  app.get("/api/ai/v3/status", (_req, res) => {
    res.json({ success: true, ai: aiService.publicStatus() });
  });

  app.post(
    "/api/ai/v3/chat",
    isAuthenticated,
    aiLimiter,
    uploadMiddleware,
    async (req: any, res) => {
      try {
        const validated = aiV3ChatRequestSchema.parse({
          message: req.body?.message,
          conversationId: req.body?.conversationId || undefined,
          providerPreference: req.body?.providerPreference || "auto",
          youtubeUrl: req.body?.youtubeUrl || undefined,
        });

        const media: AIMediaInput[] = [];
        const youtubeUrl = validated.youtubeUrl?.trim();
        if (youtubeUrl) {
          if (!isYouTubeUrl(youtubeUrl)) {
            return res.status(400).json({ message: "Only public HTTPS YouTube URLs are accepted", code: "INVALID_YOUTUBE_URL" });
          }
          media.push({ kind: "youtube", url: youtubeUrl });
        }

        if (req.file) {
          const mimeType = String(req.file.mimetype || "").toLowerCase();
          if (!mediaSignatureMatches(req.file.buffer, mimeType)) {
            return res.status(400).json({ message: "The uploaded file content does not match its declared type", code: "MEDIA_SIGNATURE_MISMATCH" });
          }
          media.push({
            kind: "inline",
            mimeType,
            data: req.file.buffer.toString("base64"),
            name: String(req.file.originalname || "upload").slice(0, 120),
            sizeBytes: req.file.size,
          });
        }

        const result = await aiService.ask({
          userId: req.user.id,
          message: validated.message,
          conversationId: validated.conversationId,
          providerPreference: validated.providerPreference,
          media,
          requestType: "chat",
        });

        return res.json({
          id: result.knowledgeId || result.requestId,
          response: result.answer,
          answer: result.answer,
          source: result.source,
          provider: result.provider,
          model: result.model,
          routeReason: result.routeReason,
          requestId: result.requestId,
          conversationId: result.conversationId,
          usage: result.usage,
        });
      } catch (error) {
        return sendAIError(res, error);
      }
    },
  );
}
