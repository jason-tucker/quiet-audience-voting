# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- chore(scaffolding): add Zod, Pino, Vitest, Playwright, Prettier, Husky, ESLint flat config, typed AppError hierarchy, central handleApiError, JSON-body parser. Phase 1 of full rewrite.
- Initial project scaffold with Next.js 15, Prisma, SQLite, Tailwind CSS
- Voting interface optimized for iPad (full-screen poster grid, tap to vote with confirmation step, 3-second reset)
- Voting grid is now reshuffled on every fresh display so poster position cannot bias votes
- Trusted device profiles: admin can mark a known iPad as "example" so non-matching devices are flagged as weird
- Voting sessions: admin can end the current session, which snapshots results and clears the live vote table; the last 5 snapshots are retained
- Live results page using Server-Sent Events
- Password-protected admin dashboard with film management, vote audit log, device tracking, and suspicious vote detection
- Docker setup for self-contained deployment
- GitHub Actions CI to build and publish images to GitHub Container Registry
- Three-environment deployment model: local → Unraid (dev branch) → Ubuntu VPS (main branch)

### Changed

- Removed the per-film display order field; the voting grid is randomized so an explicit order is no longer meaningful
