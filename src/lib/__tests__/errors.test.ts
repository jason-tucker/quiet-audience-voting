import { describe, it, expect } from "vitest";
import { AppError, NotFoundError, RateLimitError } from "../errors";

describe("AppError", () => {
  it("subclass carries statusCode and code", () => {
    const err = new NotFoundError("missing film");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("missing film");
    expect(err).toBeInstanceOf(AppError);
  });
  it("RateLimitError sets retryAfterSec and Retry-After header on response", async () => {
    const err = new RateLimitError(42);
    const res = err.toResponse();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });
});
