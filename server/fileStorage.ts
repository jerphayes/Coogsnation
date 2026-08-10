import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Response } from "express";

export type FileVisibility = "public" | "private";

export interface StoredFile {
  absolutePath: string;
  relativePath: string;
  contentType: string;
  ownerId: string;
  visibility: FileVisibility;
  size: number;
}

interface StoredFileMetadata {
  contentType: string;
  ownerId: string;
  visibility: FileVisibility;
}

export class FileNotFoundError extends Error {
  constructor() {
    super("File not found");
    this.name = "FileNotFoundError";
  }
}

function storageRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads"));
}

function normalizeRelativePath(value: string): string {
  const decoded = decodeURIComponent(value).replace(/^\/+/, "");
  const normalized = path.posix.normalize(decoded);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new FileNotFoundError();
  }
  return normalized;
}

function absolutePathFor(relativePath: string): string {
  const root = storageRoot();
  const absolute = path.resolve(root, relativePath);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new FileNotFoundError();
  }
  return absolute;
}

function metadataPathFor(absolutePath: string): string {
  return `${absolutePath}.metadata.json`;
}

export class FileStorageService {
  async uploadAvatarDirect(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const relativePath = `avatars/${safeUserId}/${Date.now()}-${randomUUID()}.webp`;
    const absolutePath = absolutePathFor(relativePath);
    const metadata: StoredFileMetadata = {
      contentType: mimeType,
      ownerId: userId,
      visibility: "public",
    };

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, fileBuffer, { flag: "wx" });
    await writeFile(metadataPathFor(absolutePath), JSON.stringify(metadata), { flag: "wx" });
    return `/objects/${relativePath}`;
  }

  async getFile(objectPath: string): Promise<StoredFile> {
    if (!objectPath.startsWith("/objects/")) throw new FileNotFoundError();
    const relativePath = normalizeRelativePath(objectPath.slice("/objects/".length));
    const absolutePath = absolutePathFor(relativePath);

    try {
      const [fileStat, metadataText] = await Promise.all([
        stat(absolutePath),
        readFile(metadataPathFor(absolutePath), "utf8"),
      ]);
      if (!fileStat.isFile()) throw new FileNotFoundError();
      const metadata = JSON.parse(metadataText) as StoredFileMetadata;
      return {
        absolutePath,
        relativePath,
        contentType: metadata.contentType || "application/octet-stream",
        ownerId: metadata.ownerId,
        visibility: metadata.visibility,
        size: fileStat.size,
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) throw error;
      throw new FileNotFoundError();
    }
  }

  canAccess(file: StoredFile, userId?: string): boolean {
    if (file.visibility === "public") return true;
    return Boolean(userId && file.ownerId === userId);
  }

  download(file: StoredFile, res: Response, cacheTtlSec = 3600): void {
    res.set({
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": `${file.visibility === "public" ? "public" : "private"}, max-age=${cacheTtlSec}`,
      "X-Content-Type-Options": "nosniff",
    });

    const stream = createReadStream(file.absolutePath);
    stream.on("error", (error) => {
      console.error("File stream error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
      else res.destroy(error);
    });
    stream.pipe(res);
  }

  async deleteByObjectPath(objectPath: string, ownerId: string): Promise<boolean> {
    try {
      const file = await this.getFile(objectPath);
      if (file.ownerId !== ownerId) return false;
      await Promise.all([
        unlink(file.absolutePath),
        unlink(metadataPathFor(file.absolutePath)).catch(() => undefined),
      ]);
      return true;
    } catch (error) {
      if (error instanceof FileNotFoundError) return false;
      throw error;
    }
  }
}
