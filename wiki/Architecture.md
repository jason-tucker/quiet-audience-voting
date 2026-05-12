# Architecture

A high-level tour of how quiet-audience-voting is wired together. For decision rationale see `docs/DECISIONS.md`; for the canonical structural tour see `docs/ARCHITECTURE.md`.

## Where things live

| Concern                     | Location                                                            |
| --------------------------- | ------------------------------------------------------------------- |
| API route handlers          | `src/app/api/**/route.ts` — thin, delegate to services              |
| Business logic / Prisma     | `src/lib/*.ts` (and `src/server/*.ts` for server-only)              |
| Validation schemas          | `src/lib/schemas/index.ts` (Zod, `z.infer` types)                   |
| Error types                 | `src/lib/errors.ts` (`AppError` + subclasses)                       |
| Central error handler       | `src/server/handleApiError.ts`                                      |
| JSON body parser + size cap | `src/server/parseJsonBody.ts`                                       |
| Logger                      | `src/server/logger.ts` (Pino)                                       |
| React components            | `src/components/`                                                   |
| Tests                       | `src/**/__tests__/*.test.ts` (Vitest), `e2e/*.spec.ts` (Playwright) |

## Request flow

### Voter (`POST /api/vote`)

1. Client posts `{ filmId, deviceInfo }` (device telemetry).
2. Handler validates input, checks `votingOpen`, applies per-fingerprint rate limit.
3. Vote is inserted; the full device JSON is kept in `rawDeviceJson` for audit.
4. The SSE broadcaster pushes the updated snapshot (with `lastVote`) to every connected results client.

### Admin (`POST /api/admin/films`, etc.)

1. Middleware verifies the `qav_admin` JWT cookie. Missing/invalid → 401 (API) or redirect to `/login` (pages).
2. Route handler calls `parseJsonBody(req, SomeSchema)` to validate + size-cap the body.
3. A service in `src/lib/` performs the work and either returns a value or throws an `AppError`.
4. The route's `catch` calls `handleApiError(err, "PUT /api/admin/films/[id]")`, producing a consistent `{ error, code }` JSON envelope and the right HTTP status.

### Live results (`GET /api/results/stream`)

- Returns `Content-Type: text/event-stream`.
- The SSE module sends a snapshot every 3000 ms (`src/lib/sse.ts:15`) and on every new vote.
- A per-process cap of 200 concurrent clients (`src/lib/sse.ts:19`) prevents memory exhaustion on the public results page.
- Payload shape: `{ films, total, votingOpenedAt, serverTime, lastVote? }`.

## Auth model

- A single admin password lives in the `Setting` table as `adminPasswordHash` (bcrypt). First boot: `INITIAL_ADMIN_PASSWORD` from env seeds it.
- `POST /api/login` exchanges the password for an HS256 JWT signed with `JWT_SECRET`, set as `qav_admin` — `HttpOnly`, `SameSite=Strict`, 1 h TTL, `Secure` in production (toggle: `SECURE_COOKIE`).
- `src/middleware.ts` matches `/admin/:path*` and `/api/admin/:path*` and calls `verifyAdminToken`. Invalid tokens get a 401 (for API) or a redirect to `/login?from=…` (for pages).

## Data model (Prisma, `prisma/schema.prisma`)

### `Film`

`id` (cuid), `name`, `school`, `posterUrl`, `createdAt`, `votes Vote[]`.

### `Vote`

`id`, `filmId`, `timestamp`, `deviceFingerprint`, `ipAddress`, `userAgent`, plus optional device telemetry (`screenWidth/Height`, `timezone`, `language`, `platform`, `colorDepth`, `touchSupport`, `pixelRatio`, `viewportWidth/Height`, `cookieEnabled`, `doNotTrack`, `hardwareConcurrency`, `deviceMemory`), and `rawDeviceJson` for the full audit blob. Indexed on `filmId`, `timestamp`, `deviceFingerprint`.

### `Setting`

Key-value store: `key` (PK), `value`. Used for `votingOpen`, `votingOpenedAt`, `eventName`, `showcaseMode`, `adminPasswordHash`.

### `TrustedDeviceProfile`

`id`, `label`, `fingerprint` (unique), `userAgent`, `platform`, `screenWidth`, `screenHeight`, `createdAt`. Used to whitelist a known tablet so a high vote count from one of them doesn't get flagged as suspicious.

### `VoteSnapshot`

`id`, `label`, `createdAt`, `totalVotes`, `uniqueDevices`, `filmResults` (JSON: `[{ filmId, filmName, school, posterUrl, count, percentage }]`). Captured when an admin resets a session.

## Errors

All expected failures throw a typed subclass from `src/lib/errors.ts`:

| Class                  | HTTP | `code`                                  |
| ---------------------- | ---- | --------------------------------------- |
| `ValidationError`      | 400  | `VALIDATION`                            |
| `UnauthorizedError`    | 401  | `UNAUTHORIZED`                          |
| `ForbiddenError`       | 403  | `FORBIDDEN`                             |
| `NotFoundError`        | 404  | `NOT_FOUND`                             |
| `ConflictError`        | 409  | `CONFLICT`                              |
| `PayloadTooLargeError` | 413  | `PAYLOAD_TOO_LARGE`                     |
| `RateLimitError`       | 429  | `RATE_LIMIT` (requires `retryAfterSec`) |

`handleApiError` formats the response as `{ error: string, code: string }` and adds `Retry-After` when applicable.

## Cross-cutting modules

- **Rate limiting** — `src/lib/rateLimit.ts`. In-memory token bucket, per process. Used on `/api/vote` (per fingerprint) and `/api/login` (per IP).
- **Suspicious detection** — `src/lib/suspicious.ts`. Sliding-window clustering by fingerprint; defaults: window 10 min, threshold 5.
- **Trusted devices** — `src/lib/trustedDevices.ts`. Matches by fingerprint or by screen + browser family within tolerance.
- **Showcase mode** — `src/lib/showcase.ts`. Simulates 6 iPad-like devices voting on an organic cadence for demos.
- **Settings** — `src/lib/settings.ts`. Reads/writes the `Setting` table.
- **Logger** — `src/server/logger.ts` (Pino). Use `logger`, never `console.*`.
