# Roadmap

A living menu of features we've considered but not yet built. Items are bucketed by category and rated by effort (**S** = afternoon, **M** = 1–3 days, **L** = 1–2 weeks). Each row is tracked as a GitHub issue and on the [QAV Feature Roadmap project board](https://github.com/users/jason-tucker/projects); pick one and the next plan file in this repo's history will be the implementation plan for that single feature.

Authored 2026-05-12, after Two Explore-agent passes that mapped the current feature surface and identified ops/QoL gaps. Drift expected — when something ships, move the row to **[Done](#done)** and add the version it shipped in.

## Quick context

The app today (still `v0.1.0` — nothing below has been cut into a tagged release yet, but see [Done](#done) for what's shipped in the rolling `[DEV]` changelog):
- voter tap-to-vote flow with confirmation step and auto-reset
- live SSE results board with state machine (live/stale/disconnected), plus a fullscreen projector **presentation mode** (`/results/presentation`) with live and manual-reveal modes
- full admin: films CRUD (including bulk CSV import), settings, sessions/snapshots, trusted devices, audit log (votes + admin login attempts, with CSV/JSON export), suspicious-cluster detection
- showcase mode (6 simulated iPads with organic cadence)
- per-fingerprint rate limit + bcrypt password auth
- continuous SQLite backup (litestream), a real `/api/health` endpoint, and a CI verify gate (lint/build/test) before every image push

What it doesn't have: multi-event schema, PWA/offline, MFA, i18n/a11y polish, notifications/webhooks, error aggregation (Sentry), vote undo, per-category voting, QR-based onboarding.

---

## 🎬 User-facing

| # | Feature | Effort | Why |
|---|---|---|---|
| **U2** | **Per-category voting** — Best Drama, Best Comedy, Best Cinematography. Each film can be in multiple categories. Voter picks one film per category. | L | Real festivals always have multiple awards. Single-poll model forces a workaround. **Best done after U3.** |
| **U3** | **Multi-event support** — `Event` abstraction so the same instance hosts this year + next year + alumni votes without resetting. Each event has its own films, votes, snapshots, settings. | L | Foundational. Unlocks the README's stated "re-deployable for any school or festival" goal without `docker compose down -v` between events. |
| **U4** | **QR-based voter onboarding** — print a QR on the programme; voters scan with their phone instead of needing a kiosk iPad. Mobile-friendly responsive voter UI. | M | Widens reach beyond iPad kiosks; enables hybrid / remote festivals. |
| **U6** | **Tie-breaker workflow** — when results are tied, admin can run a quick re-vote with just the tied films. | M | Real festival scenario; no clean way to handle a tie today. Could piggyback on per-category if U2 lands first. |
| **U7** | **Per-event branding/theming** — logo upload, accent color, custom CSS / favicon override. | S/M | Today everything is generic "Film Festival". Sells reuse. Depends on U3. |
| **U8** | **Voter-side schedule / programme page** — public listing of showtimes, synopses, directors. Posters link to a detail page. | M | A voting app that's also a programme guide reduces what the festival hosts elsewhere. |

## 🛠 Quality of life

| # | Feature | Effort | Why |
|---|---|---|---|
| **Q1** | **Vote undo within 5 seconds** — thank-you overlay shows a small Undo button that retracts the vote before the screen resets. | S | High user-frustration mitigation; eliminates the "I tapped the wrong poster" pain. |
| **Q2** | **Voting velocity widget on admin dashboard** — votes/min over last 5 min per iPad. | S | Helps an organizer mid-event catch a stuck or unattended iPad. |
| **Q6** | **Showcase mode replay** — option to replay a previous real festival's vote timeline as the demo, instead of synthetic randoms. | S | Today's showcase fingerprints all trip suspicious detection; a "replay" mode is more honest demo material. |
| **Q7** | **Admin dry-run mode** — preview voting + results screens with sample state, without touching real data. | M | New event setup currently requires `votingOpen=true` to verify the layout. |

## ⚙️ Ops / operability

| # | Feature | Effort | Why |
|---|---|---|---|
| **O2** | **Pre-migration DB snapshot hook** — entrypoint copies `prod.db` to `prod.db.bak-<sha>` before `prisma migrate deploy`. | S | A bad migration corrupts the only copy. Three lines of bash. |
| **O4** | **Sentry (or self-hosted GlitchTip)** wired into all API routes via `handleApiError`. | S | `pino` is in place but no aggregated error surface. |
| **O6** | **Webhook on voting state change** — POST to a configurable URL when voting closes, with final results JSON. | M | Lets you wire into Discord, email, Google Sheets. |
| **O7** | **PWA / service worker** for the voter screen — caches the shell so a brief network blip doesn't black-screen a kiosk iPad. | M | One wifi hiccup currently breaks the kiosk. |
| **O8** | **E2E test of the full voter and admin flows** in Playwright, run on PRs. | M | Repo has Playwright installed and one trivial `/api/status` smoke test. Real coverage means refactors stop being scary. |
| **O9** | **Anomaly alert** — when a suspicious cluster crosses a threshold, send admin a notification via the same webhook as O6. | S | Closes the loop on the existing suspicious-detection feature. Depends on O6. |

---

## Recommended starter set

_The original starter set (below) is now fully shipped — see [Done](#done). The natural next big rock is **U3** (multi-event), since it unblocks U2 and U7._

1. ~~**O1** (litestream backups) — *do first.* Removes the single biggest existential risk.~~ Shipped.
2. ~~**O3** (real health endpoint) + **O5** (CI lint/test gate)~~ Shipped.
3. ~~**Q3** (admin login audit) + **Q4** (audit log export) + **Q5** (poster resize)~~ Shipped.
4. ~~**U5** (CSV film import) + **U1** (results presentation mode)~~ Shipped.
5. **U3** (multi-event) — big rock, but unblocks U2 and U7

Everything else is fair game when the moment calls for it.

---

## How to use this page

- **Browse**: skim the menu for whatever fits the day.
- **Pick**: open the matching issue (e.g. `[U1] Results presentation mode`) for the implementation conversation, status, and PR links.
- **Add**: new ideas go in a new row + a new GitHub issue. Keep the IDs sequential per bucket (U9, Q8, O10, etc.) — don't renumber existing ones, they're referenced from PRs and the project board.

When a row ships, move it to the **Done** section below with the PR number and version tag.

## Done

_Authored 2026-05-12 immediately after `v0.1.0` was sealed. Everything below has landed in the rolling `[DEV]` changelog since — none of it has been cut into a tagged release yet._

| # | Feature | PR | Issue |
|---|---|---|---|
| **O1** | Litestream sidecar for continuous SQLite backup (file replica by default; one-line swap to S3/R2/B2) | [#31](https://github.com/jason-tucker/quiet-audience-voting/pull/31) | [#22](https://github.com/jason-tucker/quiet-audience-voting/issues/22) |
| **O3** | Real `/api/health` endpoint — database, migrations, uploads-writable, disk-free checks; 503 on failure | [#32](https://github.com/jason-tucker/quiet-audience-voting/pull/32) | [#23](https://github.com/jason-tucker/quiet-audience-voting/issues/23) |
| **O5** | CI verify gate (`npm ci` → `prisma generate` → lint → build → test) before `build-push` on both `deploy-main.yml` and `deploy-dev.yml` | [#33](https://github.com/jason-tucker/quiet-audience-voting/pull/33) | [#24](https://github.com/jason-tucker/quiet-audience-voting/issues/24) |
| **Q3** | Admin login audit log (`AuthEvent` model) — every login attempt with IP/UA/outcome/reason, surfaced in `/admin/audit`'s "Admin logins" tab | [#34](https://github.com/jason-tucker/quiet-audience-voting/pull/34) | [#25](https://github.com/jason-tucker/quiet-audience-voting/issues/25) |
| **Q4** | Audit log CSV/JSON export — `GET /api/admin/votes/export`, streamed in 500-row chunks | [#35](https://github.com/jason-tucker/quiet-audience-voting/pull/35) | [#26](https://github.com/jason-tucker/quiet-audience-voting/issues/26) |
| **Q5** | Poster resize-on-upload to WebP (max 800px, quality 85) via `sharp`, content-hashed filenames, immutable long-lived cache on `/uploads/*` | [#36](https://github.com/jason-tucker/quiet-audience-voting/pull/36) | [#27](https://github.com/jason-tucker/quiet-audience-voting/issues/27) |
| **U5** | Bulk CSV film import — `/admin/films` "Bulk import…" button + `POST /api/admin/films/bulk` (transactional, capped at 500 rows) | [#37](https://github.com/jason-tucker/quiet-audience-voting/pull/37) | [#28](https://github.com/jason-tucker/quiet-audience-voting/issues/28) |
| **U1** | Results presentation mode at `/results/presentation` — projector leaderboard with live and manual-reveal modes | [#38](https://github.com/jason-tucker/quiet-audience-voting/pull/38) | [#29](https://github.com/jason-tucker/quiet-audience-voting/issues/29) |
