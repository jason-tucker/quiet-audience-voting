import { NextResponse } from "next/server";
import { saveUploadedBuffer, MAX_FILE_BYTES } from "@/lib/uploadStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// We bypass multipart/form-data and accept the raw file as the request body.
// `request.formData()` in Next.js App Router can intermittently fail with
// "Failed to parse body as FormData" depending on the runtime + body — sending
// the file as a raw stream via the existing Web Request API is more reliable
// and lets us validate size/type cheaply.
export async function POST(request: Request) {
  try {
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    if (!contentType) {
      return NextResponse.json({ error: "Missing Content-Type header" }, { status: 400 });
    }
    const lenHeader = request.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${(MAX_FILE_BYTES / 1024 / 1024 / 1024).toFixed(0)}GB)` },
        { status: 413 },
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Empty file body" }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);
    const result = await saveUploadedBuffer(buffer, contentType);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload failed:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
