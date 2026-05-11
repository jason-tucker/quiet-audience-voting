import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "./logger";

/**
 * Convert any error thrown from an API route into a `NextResponse`. Call this
 * from every route's `catch` block so error shape and status codes stay
 * consistent across the app.
 *
 * Recognized:
 * - {@link AppError} subclasses → their own status/code/body via `toResponse()`.
 * - `ZodError` → 400 `VALIDATION` with the first failing field path.
 * - `Prisma.PrismaClientKnownRequestError` P2002 → 409 `CONFLICT`.
 * - `Prisma.PrismaClientKnownRequestError` P2025 → 404 `NOT_FOUND`.
 * - `SyntaxError` from `request.json()` → 400 `VALIDATION`.
 * - Anything else → logged via {@link logger} and returned as 500 `INTERNAL`
 *   with no internal details exposed.
 *
 * @param err Caught exception (typed `unknown` so it works in any `catch`).
 * @param context Optional label included in the log line for unhandled errors.
 *
 * @example
 *   export async function POST(req: NextRequest) {
 *     try { ... } catch (e) { return handleApiError(e, "POST /api/vote"); }
 *   }
 */
export function handleApiError(err: unknown, context?: string): NextResponse {
  if (err instanceof AppError) return err.toResponse();
  if (err instanceof ZodError) {
    const first = err.errors[0];
    const path = first?.path.join(".") ?? "body";
    return new ValidationError(`${path}: ${first?.message ?? "invalid"}`).toResponse();
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return new ConflictError("Duplicate value").toResponse();
    if (err.code === "P2025") return new NotFoundError().toResponse();
  }
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    return new ValidationError("Invalid JSON body").toResponse();
  }
  logger.error({ err, context }, "Unhandled API error");
  return NextResponse.json({ error: "Internal server error", code: "INTERNAL" }, { status: 500 });
}
