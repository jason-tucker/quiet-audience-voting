# Architecture

A one-page map of the quiet-audience-voting codebase. This document is the
single source of truth for "where does X live and why". Each section is short
on purpose — link out to code rather than paraphrasing it.

## Overview

> TODO (Phase 2, U10): write the 3-paragraph elevator pitch — what the app
> does, who uses each surface (voter / results viewer / admin), and the
> deployment shape (single container, single SQLite file, SSE for live
> updates).

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

> TODO (Phase 2, U10): document the path through middleware → route handler
> → `parseJsonBody(VoteInputSchema)` → vote service → Prisma insert → SSE
> broadcast → JSON 200 response. Note that voting-closed returns 403 via
> `ForbiddenError` and unknown films return 404 via `NotFoundError`.

### Admin (`POST /api/films`, `PATCH /api/films/[id]`, etc.)

> TODO (Phase 2, U10): document middleware JWT verification → route handler
> → schema validation → service mutation → response. Errors flow through
> `handleApiError`.

### SSE (`GET /api/results/stream`)

> TODO (Phase 2, U10): document the SSE handshake, the `sse.ts` broadcast
> hub, heartbeat cadence, and how `/api/vote` publishes updates.

## Auth model

> TODO (Phase 2, U10): single admin password stored hashed in the `Settings`
> row, exchanged via `POST /api/login` for a `jose`-signed JWT cookie, gated
> by `src/middleware.ts` on the `/admin` segment.

## Database

> TODO (Phase 2, U10): SQLite via Prisma. Three models — `Film`, `Vote`,
> `Settings`. Vote rows store both individual columns and `rawDeviceJson`
> for full audit fidelity. Indexes on `Vote.filmId` and `Vote.timestamp`.

## Tests

- Unit tests: **Vitest**, in `src/**/__tests__/*.test.ts` or colocated
  `*.test.ts`. Coverage targets `src/lib/**` and `src/server/**`.
- End-to-end: **Playwright**, in `e2e/*.spec.ts`. Configured for desktop
  Chrome and iPad Pro 11 viewports.

> TODO (Phase 2, U10): document fixtures, the test DB strategy, and how to
> run a focused subset.
