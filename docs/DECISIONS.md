# Architectural Decisions

Short ADRs. Each entry: what we decided, the one or two reasons it matters.
Order is reverse-chronological so the latest decisions are first.

## ADR-001: Zod at every API boundary

We validate every API request body and query with a Zod schema from
`src/lib/schemas/`. Schemas are the single source of truth for both runtime
checks and TypeScript types (`z.infer`), so the type the handler sees is
provably the shape we accepted — no `as` casts, no parallel `interface`
that can drift from the validator.

## ADR-002: Service layer over fat route handlers

Route handlers in `src/app/api/**` are thin: parse → authorize → delegate to
a service module → respond. Services hold the business logic and are the
only code that touches Prisma. This keeps handlers testable in isolation,
lets us reuse logic across REST and SSE endpoints, and avoids the common
Next.js pitfall of business logic that can't be exercised without a request
context.

## ADR-003: Typed `AppError` subclasses + central `handleApiError`

Every operational failure is an `AppError` subclass (`ValidationError`,
`NotFoundError`, `RateLimitError`, ...). Route handlers `catch` and call
`handleApiError(err)`, which also normalizes `ZodError`, known Prisma error
codes, and JSON parse failures. This guarantees a consistent
`{ error, code }` response shape and a single place to harden behavior
(e.g. scrub leaks, log unhandled errors).
