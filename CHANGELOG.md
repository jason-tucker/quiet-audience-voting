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
