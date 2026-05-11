/**
 * Discriminated union returned by service-layer functions that can fail in
 * known ways without throwing. Callers narrow on `result.ok` to access either
 * `result.value` (success) or `result.error` (failure).
 *
 * Prefer `Result` for control-flow-style failures (validation, conflicts).
 * Throw {@link AppError} for failures that should bubble up to the route
 * handler and become an HTTP response.
 *
 * @example
 *   const res = await castVote(input);
 *   if (!res.ok) return res.error.toResponse();
 *   return NextResponse.json(res.value);
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/** Construct a successful {@link Result}. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Construct a failed {@link Result}. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
