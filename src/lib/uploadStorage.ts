import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

// Capped at the Cloudflare Tunnel POST body limit so the limit our app
// rejects at matches what Cloudflare would silently reject in production.
//   Free / Pro:   100 MB
//   Business:     200 MB
//   Enterprise:   500 MB (configurable via support)
// If you upgrade your Cloudflare plan, bump this to match.
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Max width for resized posters. 800px is enough for an iPad in landscape
// (the largest grid cell is < 600px wide in practice). Bigger = wasted bytes
// on every iPad load. See roadmap Q5 (#27).
const MAX_POSTER_WIDTH = 800;
const WEBP_QUALITY = 85;

const UPLOAD_DIR =
  process.env.NODE_ENV === "production" ? "/app/uploads" : path.join(process.cwd(), "uploads");

export async function saveUploadedBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string; bytesIn: number; bytesOut: number }> {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: jpg, png, webp, gif.`);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`File too large (max ${formatBytes(MAX_FILE_BYTES)})`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Animated GIFs: copy through without resize/convert. sharp's webp would
  // freeze the animation, which matters during showcase-mode demos where
  // organisers sometimes use meme posters.
  const isAnimated = mimeType === "image/gif";

  let outBuffer: Buffer;
  let outExt: string;

  if (isAnimated) {
    outBuffer = buffer;
    outExt = ".gif";
  } else {
    outBuffer = await sharp(buffer)
      .rotate() // honor EXIF orientation before stripping metadata
      .resize({
        width: MAX_POSTER_WIDTH,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    outExt = ".webp";
  }

  // Content-hash filename for cache busting. Same input -> same filename
  // (re-uploading an identical poster is idempotent). Different inputs get
  // different files so the long-lived Cache-Control on /uploads/* doesn't
  // pin the wrong version in voter iPad caches.
  const hash = crypto.createHash("sha256").update(outBuffer).digest("hex").slice(0, 32);
  const filename = `${hash}${outExt}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  await writeFile(fullPath, outBuffer);

  return {
    url: `/uploads/${filename}`,
    bytesIn: buffer.length,
    bytesOut: outBuffer.length,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(0)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
  return `${bytes}B`;
}

export { UPLOAD_DIR, MAX_FILE_BYTES };
