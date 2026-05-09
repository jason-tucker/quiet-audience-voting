import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const UPLOAD_DIR =
  process.env.NODE_ENV === "production" ? "/app/uploads" : path.join(process.cwd(), "uploads");

export async function saveUploadedFile(file: File): Promise<{ url: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File too large (max ${MAX_FILE_BYTES} bytes)`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = extensionForMime(file.type);
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return { url: `/uploads/${filename}` };
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

export { UPLOAD_DIR };
