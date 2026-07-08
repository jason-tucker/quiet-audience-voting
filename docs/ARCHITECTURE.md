# Architecture

A one-page map of the quiet-audience-voting codebase. This document is the
single source of truth for "where does X live and why". Each section is short
on purpose — link out to code rather than paraphrasing it.

## Overview

Quiet Audience Voting is a single-container Next.js app for running silent,
fingerprint-deduplicated audience voting at film festivals. Three surfaces
share one deployment: **voters** open `/` on a kiosk iPad (or any browser),
tap a poster, and get a 3-second thank-you before the screen resets for the
next person; **results viewers** watch `/results` (or the projector-friendly
`/results/presentation`) update live over Server-Sent Events with no refresh;
**admins** manage films, settings, sessions, trusted devices, and the audit
log from a JWT-gated `/admin` area.

The deployment shape is deliberately minimal: one Docker container, one
SQLite file (via Prisma), no external services required. A Litestream sidecar
tails the SQLite WAL for continuous backup. State lives in four buckets:
`Film`/`Vote` (the poll itself), `Setting` (voting open/closed, event name,
showcase mode, admin password hash), `TrustedDeviceProfile` (whitelisted
kiosk fingerprints), and `VoteSnapshot`/`AuthEvent` (session history and
login audit trail).

## Directory layout

```
src/
  app/              # Next.js App Router routes (pages + API)
    api/            # Route handlers — thin, delegate to services
    admin/          # Admin UI pages
    results/        # Public live-results page
    page.tsx        # Voter UI (poster grid)
  components/       # React components shared across pages
  lib/              # Pure-ish modules usable from server or client
    errors.ts       # AppError hierarchy (typed HTTP errors)
    result.ts       # Result<T, E> discriminated union
    schemas/        # Zod schemas for every API boundary
    prisma.ts       # Prisma client singleton
    auth.ts         # JWT verify/sign
    device.ts       # Client IP + device-info utilities
    settings.ts     # Voting open/closed flag, admin password
    sse.ts          # SSE broadcast hub
    suspicious.ts   # Duplicate-vote cluster detection
    uploadStorage.ts# Poster upload helpers
  server/           # Server-only modules — never import from client code
    logger.ts       # Pino structured logger
    handleApiError.ts # Convert thrown errors into NextResponse
    parseJsonBody.ts  # Size-capped JSON body parser + Zod validation
  types/            # Cross-cutting TypeScript types
  middleware.ts     # Admin route auth gate
prisma/             # schema.prisma + migrations + seed.ts
e2e/                # Playwright specs
docs/               # ARCHITECTURE / CONTRIBUTING / DECISIONS
```

## Request lifecycle

### Voter (`POST /api/vote`)

The handler checks `isVotingOpen()` (403 if closed), enforces a 16 KB body
cap, parses the JSON body itself (no schema-level validation yet — see the
caveat below), applies a per-fingerprint token-bucket rate limit (429 with
`Retry-After` on breach), 404s on an unknown `filmId`, inserts the `Vote` row
with the full device telemetry plus `rawDeviceJson`, and fires-and-forgets an
SSE broadcast of the updated snapshot before returning `{ success: true }`.

### Admin (`POST /api/admin/films`, `PUT /api/admin/films/[id]`, etc.)

`src/middleware.ts` gates every `/admin/**` page and `/api/admin/**` route
behind the `qav_admin` JWT cookie (401 for API routes, redirect to `/login`
for pages) before the route handler runs. From there, handlers vary in how
strictly they validate: `POST /api/admin/films/bulk` parses the body with
`FilmBulkInputSchema` (Zod) and wraps the inserts in `prisma.$transaction`;
the single-film create/update/delete routes (`/api/admin/films`,
`/api/admin/films/[id]`) do their own ad-hoc type checks against
`request.json()` rather than a Zod schema.

**Caveat on the "thin handler → Zod → service → `AppError`/`handleApiError`"
pattern described in `CLAUDE.md`:** that is the required pattern for new
routes, but it is not yet universally adopted. `src/lib/errors.ts`
(`AppError` and subclasses) and `src/server/handleApiError.ts` exist and are
unit-tested, but as of this writing no route under `src/app/api/**` actually
calls `handleApiError` — every route catches its own errors and hand-builds
a `NextResponse.json({ error, ... }, { status })`. Similarly,
`src/server/parseJsonBody.ts` is not yet wired into any route. Treat the
checklist in `CLAUDE.md` as the target for new code, not a description of
every existing handler.

### SSE (`GET /api/results/stream`)

`src/lib/sse.ts` maintains an in-memory set of connected clients (capped at
200 per process). On connect it sends the current snapshot immediately, then
a heartbeat snapshot every 3000 ms regardless of activity. `POST /api/vote`
calls `broadcastUpdate()` after every successful insert so all connected
clients get the new tally (plus a `lastVote` payload) without waiting for the
next heartbeat. The client (`/results`, `/results/presentation`) reconnects
with exponential backoff on `error` and treats a stream as stale if no
message has arrived in 5 s.

## Auth model

A single admin password is stored hashed (bcrypt) in the `Setting` table
under the `adminPasswordHash` key. On first login (empty hash), the password
submitted is compared against `INITIAL_ADMIN_PASSWORD` from the environment
(the literal `changeme` is rejected) and, if it matches, hashed and persisted.
`POST /api/login` also checks that the request's `Origin` matches the host
(or `NEXT_PUBLIC_APP_URL`), rate-limits by IP, and records every attempt —
success or failure, with a `reason` code on failure — as an `AuthEvent` row.
On success it signs an HS256 JWT (`jose`, 1 h expiry) and sets it as the
`qav_admin` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` in production
unless `SECURE_COOKIE=false`). `src/middleware.ts` verifies that cookie on
every `/admin/**` and `/api/admin/**` request.

## Database

SQLite via Prisma (`prisma/schema.prisma`). Six models: `Film`, `Vote`,
`Setting`, `TrustedDeviceProfile`, `VoteSnapshot`, and `AuthEvent`. `Vote`
rows store both individually-indexed columns (`filmId`, `timestamp`,
`deviceFingerprint`, plus optional telemetry columns) and the full
`rawDeviceJson` blob for audit fidelity. Indexes: `Vote.filmId`,
`Vote.timestamp`, `Vote.deviceFingerprint`, `AuthEvent.timestamp`,
`AuthEvent.outcome`. See [`wiki/Architecture.md`](../wiki/Architecture.md) for
a per-model field breakdown.

## Tests

- Unit tests: **Vitest**, in `src/**/__tests__/*.test.ts` or colocated
  `*.test.ts`. Coverage targets `src/lib/**` and `src/server/**`.
- End-to-end: **Playwright**, in `e2e/*.spec.ts`. Configured for desktop
  Chrome and iPad Pro 11 viewports.

Coverage today is thin: the only unit spec is `src/lib/__tests__/errors.test.ts`
(covers the `AppError` hierarchy and `handleApiError`), and the only e2e spec
is `e2e/smoke.spec.ts` (asserts `/api/status` and `/api/health` respond with
the expected shape). There's no shared fixture/test-DB setup yet — this is
tracked as roadmap **O8** (full voter/admin flow coverage in Playwright, run
on PRs). CI's `verify` job (`.github/workflows/deploy-main.yml` /
`deploy-dev.yml`) runs `npm run lint`, `npm run build`, and `npm test` before
every image push (roadmap **O5**, shipped).
