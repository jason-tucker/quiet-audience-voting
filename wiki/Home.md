Welcome to the quiet-audience-voting wiki!

**Quiet Audience Voting** is a single-container Next.js app for running silent, fingerprint-deduplicated audience voting at film festivals and similar events. Voters open the site on their phone, pick a film, and tap; a live results board updates over Server-Sent Events. Admins manage films, settings, sessions, and audit trails from a JWT-gated admin area.

## Start here

- **[Architecture](Architecture)** — directory layout, request flow, data model, error handling.
- **[API Reference](API-Reference)** — every `/api/*` route, its verbs, schemas, and auth status.
- **[Admin Guide](Admin-Guide)** — how to run an event: opening voting, managing films, reviewing suspicious activity, trusted devices, sessions.
- **[Voter & Showcase Flow](Voter-and-Showcase-Flow)** — what voters see, how the results board stays live, what showcase mode does.
- **[Deployment & Operations](Deployment-and-Operations)** — Docker, env vars, Prisma migrations, reverse-proxy notes, `SECURE_COOKIE`.
- **[Contributing & Conventions](Contributing-and-Conventions)** — branch flow, code conventions, tests, the Zod + `AppError` pattern.

## At a glance

- **Stack** — Next.js 15 App Router, React 19, TypeScript strict, Prisma 6 + SQLite, Zod, Pino, jose (JWT), Tailwind, Vitest, Playwright.
- **Auth** — single admin password, hashed in the `Setting` table, exchanged at `POST /api/login` for an HS256 JWT in an `HttpOnly` cookie. Middleware gates `/admin/**` and `/api/admin/**`.
- **Live results** — `GET /api/results/stream` (SSE) pushes a snapshot every 3 s plus on every vote; capped at 200 concurrent clients per process.
- **Anti-fraud** — device fingerprint + telemetry on every vote; suspicious-cluster detection; trusted-device profiles to whitelist known tablets; in-memory token-bucket rate limits on `/api/vote` and `/api/login`.

## Repository layout (high level)

```
src/app/api/**/route.ts   thin route handlers
src/lib/                  services, Prisma access, Zod schemas, errors
src/server/               server-only helpers (logger, error handler, body parsing)
src/components/           React components (admin, results, voting)
prisma/                   schema, migrations, seed
docs/                     in-repo docs (ARCHITECTURE.md, DECISIONS.md, CONTRIBUTING.md)
```

See [Architecture](Architecture) for the full picture.
