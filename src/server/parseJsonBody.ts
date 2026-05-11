import type { NextRequest } from "next/server";
import { z } from "zod";
import { PayloadTooLargeError, ValidationError } from "@/lib/errors";

/**
 * Read a JSON body from `request`, enforce a size cap, and validate it with a
 * Zod schema. Throws an {@link AppError} subclass on failure — callers should
 * forward the thrown error to {@link handleApiError}.
 *
 * - Honors `Content-Length` for a cheap pre-parse reject.
 * - Wraps the raw `request.json()` `SyntaxError` as a {@link ValidationError}
 *   so the client sees a 400 with a stable `VALIDATION` code.
 *
 * @typeParam T Zod schema type; the resolved value is `z.infer<T>`.
 * @param request The incoming Next.js request.
 * @param schema Zod schema describing the expected body.
 * @param options.maxBytes Maximum body size in bytes (default 16 KiB).
 *
 * @example
 *   const input = await parseJsonBody(request, VoteInputSchema);
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
  options: { maxBytes?: number } = {},
): Promise<z.infer<T>> {
  const maxBytes = options.maxBytes ?? 16 * 1024;
  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > maxBytes) {
    throw new PayloadTooLargeError(`Body exceeds ${maxBytes} bytes`);
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const path = first?.path.join(".") ?? "body";
    throw new ValidationError(`${path}: ${first?.message ?? "invalid"}`);
  }
  return parsed.data;
}
