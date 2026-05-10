import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR, MAX_FILE_BYTES } from "@/lib/uploadStorage";
import { verifyAdminToken, getTokenFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// This route lives outside `/api/admin/*` so it bypasses the Edge-runtime
// middleware. Edge buffers the entire request body before forwarding to the
// Node handler, which truncates large uploads at ~10 MB. Auth is enforced
// here directly via the same JWT cookie the middleware would have checked.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? getTokenFromRequest(request);
  const authed = token ? await verifyAdminToken(token) : false;
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = (request.headers.get("content-type") || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  if (!ALLOWED_MIME.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: "${contentType}". Allowed: jpg, png, webp, gif.` },
      { status: 400 },
    );
  }

  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${formatBytes(MAX_FILE_BYTES)})` },
      { status: 413 },
    );
  }

  if (!request.body) {
    return NextResponse.json({ error: "Empty file body" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = MIME_EXTENSION[contentType] ?? "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  let bytesReceived = 0;
  let aborted = false;
  const writeStream = createWriteStream(fullPath);
  const nodeStream = Readable.fromWeb(
    request.body as unknown as Parameters<typeof Readable.fromWeb>[0],
  );

  nodeStream.on("data", (chunk: Buffer) => {
    bytesReceived += chunk.length;
    if (bytesReceived > MAX_FILE_BYTES) {
      aborted = true;
      nodeStream.destroy(new Error("File too large"));
    }
  });

  try {
    await pipeline(nodeStream, writeStream);
  } catch (err) {
    await unlink(fullPath).catch(() => {});
    if (aborted) {
      return NextResponse.json(
        { error: `File too large (max ${formatBytes(MAX_FILE_BYTES)})` },
        { status: 413 },
      );
    }
    console.error("Upload stream failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  if (bytesReceived === 0) {
    await unlink(fullPath).catch(() => {});
    return NextResponse.json({ error: "Empty file body" }, { status: 400 });
  }

  return NextResponse.json({ url: `/uploads/${filename}`, bytesReceived });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
  return `${bytes}B`;
}
