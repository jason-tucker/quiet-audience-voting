import { NextResponse } from "next/server";

/**
 * Base class for all expected (operational) API errors thrown from server
 * code. An `AppError` carries enough information to render a consistent JSON
 * error response without leaking internals.
 *
 * Throw a subclass (`ValidationError`, `NotFoundError`, ...) from route
 * handlers or services and let {@link handleApiError} turn it into a response.
 * Only construct `AppError` directly if no existing subclass fits.
 *
 * @example
 *   if (!film) throw new NotFoundError("Film not found");
 */
export class AppError extends Error {
  /** HTTP status to send to the client. */
  readonly statusCode: number;
  /** Stable machine-readable error code (e.g. `VALIDATION`). */
  readonly code: string;
  /** If set, emitted as the `Retry-After` response header (seconds). */
  readonly retryAfterSec?: number;

  constructor(message: string, statusCode: number, code: string, retryAfterSec?: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }

  /**
   * Serialize this error to a `NextResponse` with the appropriate status,
   * JSON body `{ error, code }`, and optional `Retry-After` header.
   */
  toResponse(): NextResponse {
    const headers: Record<string, string> = {};
    if (this.retryAfterSec !== undefined) headers["Retry-After"] = String(this.retryAfterSec);
    return NextResponse.json(
      { error: this.message, code: this.code },
      { status: this.statusCode, headers },
    );
  }
}

/** 400 — request body or params failed schema validation. */
export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super(message, 400, "VALIDATION");
  }
}

/** 401 — caller is not authenticated. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** 403 — caller is authenticated but not permitted (e.g. voting closed). */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

/** 409 — request conflicts with current state (e.g. duplicate unique key). */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

/** 413 — request body exceeded the configured maximum size. */
export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large") {
    super(message, 413, "PAYLOAD_TOO_LARGE");
  }
}

/**
 * 429 — caller exceeded a rate limit. `retryAfterSec` is required so clients
 * see a `Retry-After` header on the response.
 */
export class RateLimitError extends AppError {
  constructor(retryAfterSec: number, message = "Too many requests") {
    super(message, 429, "RATE_LIMIT", retryAfterSec);
  }
}
