import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploadStorage";

export const runtime = "nodejs";

// GET /uploads/[...path] — serves files written by saveUploadedBuffer.
//
// Why a custom handler instead of /public:
//   /app/uploads is a mutable bind-mounted volume; static files in /public
//   get baked into the Next.js standalone output at build time and don't see
//   runtime writes. We need to serve from the volume at request time.
//
// Cache strategy:
//   Filenames are content-addressed SHA-256 hashes (see saveUploadedBuffer),
//   so the (filename, bytes) pair is immutable. That lets us cache forever.
//   See roadmap Q5 (#27).

const CACHE_HEADER = "public, max-age=31536000, immutable";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;

  // Reject path traversal up front. `path.normalize` on its own isn't enough —
  // a `..` that resolves inside UPLOAD_DIR could still escape via symlinks if
  // someone manages to drop one. We guard at the lexical level here and let
  // fs.stat catch anything weird at IO time.
  if (segments.some((s) => s === ".." || s === "." || s.includes("/") || s.includes("\\"))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const relative = segments.join("/");
  const fullPath = path.join(UPLOAD_DIR, relative);

  // Belt-and-braces: ensure the resolved path is still inside UPLOAD_DIR.
  const resolved = path.resolve(fullPath);
  const root = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return new NextResponse("Bad request", { status: 400 });
  }

  let size: number;
  try {
    const s = await stat(fullPath);
    if (!s.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    size = s.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const stream = Readable.toWeb(createReadStream(fullPath)) as unknown as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": CACHE_HEADER,
    },
  });
}
