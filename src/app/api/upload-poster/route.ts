import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Readable } from "node:stream";
import { MAX_FILE_BYTES, saveUploadedBuffer } from "@/lib/uploadStorage";
import { verifyAdminToken, getTokenFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

  // Buffer the body up to MAX_FILE_BYTES. We need the full bytes anyway to run
  // sharp resize-and-recompress in saveUploadedBuffer (sharp can stream, but
  // not for general resize). The cap is enforced as we read so a hostile
  // client can't pin the process at the Content-Length they advertised.
  const chunks: Buffer[] = [];
  let bytesReceived = 0;
  const nodeStream = Readable.fromWeb(
    request.body as unknown as Parameters<typeof Readable.fromWeb>[0],
  );

  try {
    for await (const chunk of nodeStream) {
      const buf = chunk as Buffer;
      bytesReceived += buf.length;
      if (bytesReceived > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${formatBytes(MAX_FILE_BYTES)})` },
          { status: 413 },
        );
      }
      chunks.push(buf);
    }
  } catch (err) {
    console.error("Upload stream failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  if (bytesReceived === 0) {
    return NextResponse.json({ error: "Empty file body" }, { status: 400 });
  }

  const inputBuffer = Buffer.concat(chunks);

  try {
    const result = await saveUploadedBuffer(inputBuffer, contentType);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    console.error("Image processing failed:", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
  return `${bytes}B`;
}
