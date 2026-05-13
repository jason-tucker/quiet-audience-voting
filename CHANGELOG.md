# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning conventions

- **`[DEV]`** — rolling section at the top. Everything merged to `main` that hasn't been cut into a tagged release yet. Replaces the conventional `[Unreleased]` heading because the `:dev` GHCR image (`dev` branch) is what actually goes to staging at `dev.qcffpoll.com`, so `[DEV]` is the natural name for the "still cooking" bucket.
- **`[X.Y.Z] — YYYY-MM-DD`** — a cut release. We tag with `vX.Y.Z` in git and the `:latest` GHCR image is whatever `main` points at when the tag is created.
  - `MAJOR` — schema break, voting URL change, or anything that requires a coordinated migration of a live event.
  - `MINOR` — new admin/voter feature visible in the UI or API.
  - `PATCH` — bug fixes, ops/Dockerfile fixes, internal refactors with no UI surface change.

When you ship a release, move the contents of `[DEV]` under a new `[X.Y.Z] — YYYY-MM-DD` heading and start a fresh empty `[DEV]` section above it.

## [DEV]

### Added

- **Litestream sidecar for continuous SQLite backup.** The shipped `docker-compose.yml` now runs a `litestream/litestream:0.3.13` container that tails `/app/data/prod.db`'s WAL and writes incremental segments + hourly snapshots to a new `qav_backups` volume. Default retention 7 days; the file replica defends against `docker compose down -v` and volume corruption, and a one-line edit of `litestream.yml` swaps to an S3-compatible bucket (Cloudflare R2, B2, S3) for off-VPS protection. Restore drill is documented in [Deployment & Operations → Backups](https://github.com/jason-tucker/quiet-audience-voting/wiki/Deployment-and-Operations#backups). Closes #22 (roadmap item O1).
- **`GET /api/health` — real operational health endpoint** (#23, roadmap O3). Returns `{ ok, checks: { database, migrations, uploads_writable, disk } }` with 200 when every check passes and 503 on any failure. The shape stays the same in both directions so a probe can grep `"ok":false` without branching on status code. `/api/status` keeps its existing lightweight role for the voter UI. Wired into the e2e smoke suite.
- **Audit log CSV/JSON export** (#26, roadmap Q4). New `GET /api/admin/votes/export?format=csv|json[&filmId=…]` streams the full vote audit log to a downloadable file (not paginated; walks the dataset in 500-row id-cursor chunks so memory stays flat regardless of dataset size). The `/admin/audit` page's Votes tab gets two "Export CSV" / "Export JSON" buttons next to pagination.
- **Admin login audit log** (#25, roadmap Q3). Every login attempt — success and fail — is recorded as an `AuthEvent` row with IP, user-agent, outcome, and a `reason` code (`bad_password`, `rate_limited`, `bad_origin`, `server_misconfigured`). The `/admin/audit` page gets a "Votes / Admin logins" tab toggle; the new tab paginates over the events and filters by outcome. Pruned to the last 1000 rows on each write so SQLite stays small. New API: `GET /api/admin/auth-events?outcome=…&page=…&limit=…`. Migration: `20260513000000_add_auth_event`.
- **Bulk CSV film import** (#28, roadmap U5). Admin `/admin/films` page gains a "Bulk import…" button next to "Add film". Paste a CSV or upload a `.csv` file with columns `name,school,posterUrl` (header optional), get a preview of ready / invalid rows with reasons, then import in one transactional call. New endpoint `POST /api/admin/films/bulk` accepts `{ films: FilmInput[] }` (capped at 500 rows per request), wraps the inserts in `prisma.$transaction` so partial failures don't leave half-imported lists.
- **Posters resize to WebP on upload + long-lived cache** (#27, roadmap Q5). New `sharp` dependency reprocesses every poster upload through `sharp().rotate().resize({width: 800}).webp({quality: 85})`. Output filenames are content-hashed (SHA-256, 32 hex chars) so re-uploading an identical poster is idempotent. New `/uploads/[...path]` route handler serves the files with `Cache-Control: public, max-age=31536000, immutable` (safe because of the content-addressed filenames). Animated GIFs are passed through without recompression. Replaces the stale `next.config.ts` comment about a custom upload-serving route with the actual route.
- **Results presentation mode** at `/results/presentation` (#29, roadmap U1). Fullscreen, projector-friendly leaderboard with a winner-highlighted top row, animated rank bars, and a manual reveal mode that progressively unveils results from worst to best — so the host can build to the announcement. Reveal mode freezes the leaderboard at the moment it starts, so a late-arriving vote doesn't reshuffle mid-reveal. Live mode is the default and reorders on every SSE tick. Keyboard: Space / → reveal next, A reveal all, R resume live, F fullscreen. Reuses the existing `/api/results/stream` SSE — no schema change.

### Fixed

- **ops:** `:dev` image was crash-looping at startup with `Cannot find module 'effect'`. Prisma 6.x's `@prisma/config` requires `effect`, `c12`, `deepmerge-ts`, and `empathic` as runtime peers, and the runner stage of the previous Dockerfile only `COPY`'d `node_modules/prisma` from the builder, leaving those top-level packages behind. The runner stage now does a clean `npm install prisma@^6.1.0 --omit=dev` so transitive deps are resolved. Landed on `main` in #6, ported to `dev` in #8. Incident write-up: #7.
- **ops:** `watchtower-qav` was crash-looping with `client version 1.25 is too old. Minimum supported API version is 1.40` against the host daemon (API 1.54). The shipped `docker-compose.yml` now pins `DOCKER_API_VERSION: "1.45"` on the watchtower service, and the production compose file on the VPS has the same pin applied.

### Docs

- Added a [Troubleshooting & Incidents](wiki/Troubleshooting-and-Incidents.md) wiki page that captures both 2026-05-12 incidents with symptom / root cause / fix / detection commands, plus a general triage checklist for on-call.
- README gained a Troubleshooting pointer to the wiki page.

## [0.1.0] — 2026-05-12

First version running on production hardware (`qcffpoll.com`) and staging (`dev.qcffpoll.com`). Treated as the baseline; everything below was developed before the formal versioning convention was adopted.

### Added

- chore(scaffolding): Zod, Pino, Vitest, Playwright, Prettier, Husky, ESLint flat config, typed `AppError` hierarchy, central `handleApiError`, JSON-body parser. Phase 1 of full rewrite.
- Initial project scaffold with Next.js 15, Prisma, SQLite, Tailwind CSS.
- Voting interface optimized for iPad (full-screen poster grid, tap to vote with confirmation step, 3-second reset).
- Voting grid is reshuffled on every fresh display so poster position cannot bias votes.
- Trusted device profiles: admin can mark a known iPad as "example" so non-matching devices are flagged as weird.
- Voting sessions: admin can end the current session, which snapshots results and clears the live vote table; the last 5 snapshots are retained.
- Live results page using Server-Sent Events.
- Password-protected admin dashboard with film management, vote audit log, device tracking, and suspicious vote detection.
- Docker setup for self-contained deployment.
- GitHub Actions CI to build and publish images to GitHub Container Registry.
- Three-environment deployment model: local → Unraid (`dev` branch) → Ubuntu VPS (`main` branch).

### Changed

- Removed the per-film display order field; the voting grid is randomized so an explicit order is no longer meaningful.
