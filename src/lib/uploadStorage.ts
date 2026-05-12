import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Capped at the Cloudflare Tunnel POST body limit so the limit our app
// rejects at matches what Cloudflare would silently reject in production.
//   Free / Pro:   100 MB
//   Business:     200 MB
//   Enterprise:   500 MB (configurable via support)
// If you upgrade your Cloudflare plan, bump this to match.
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const UPLOAD_DIR =
  process.env.NODE_ENV === "production" ? "/app/uploads" : path.join(process.cwd(), "uploads");

export async function saveUploadedBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string }> {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed: jpg, png, webp, gif.`,
    );
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`File too large (max ${formatBytes(MAX_FILE_BYTES)})`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = extensionForMime(mimeType);
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  await writeFile(fullPath, buffer);

  return { url: `/uploads/${filename}` };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(0)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
  return `${bytes}B`;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export { UPLOAD_DIR, MAX_FILE_BYTES };
