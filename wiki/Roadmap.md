# Roadmap

A living menu of features we've considered but not yet built. Items are bucketed by category and rated by effort (**S** = afternoon, **M** = 1–3 days, **L** = 1–2 weeks). Each row is tracked as a GitHub issue and on the [QAV Feature Roadmap project board](https://github.com/users/jason-tucker/projects); pick one and the next plan file in this repo's history will be the implementation plan for that single feature.

Authored 2026-05-12, after Two Explore-agent passes that mapped the current feature surface and identified ops/QoL gaps. Drift expected — when something ships, move the row to **[Done](#done)** and add the version it shipped in.

## Quick context

The app today (`v0.1.0`):
- voter tap-to-vote flow with confirmation step and auto-reset
- live SSE results board with state machine (live/stale/disconnected)
- full admin: films CRUD, settings, sessions/snapshots, trusted devices, audit log, suspicious-cluster detection
- showcase mode (6 simulated iPads with organic cadence)
- per-fingerprint rate limit + bcrypt password auth

What it doesn't have: backups, real health checks, test/lint CI gate, multi-event schema, data export, PWA/offline, MFA, projector-friendly presentation mode, i18n/a11y polish, poster resize, notifications.

---

## 🎬 User-facing

| # | Feature | Effort | Why |
|---|---|---|---|
| **U1** | **Results presentation mode** — fullscreen, big-number animated leaderboard with an "envelope reveal" button for the awards moment. Pause/resume so the host controls pacing. | M | Today `/results` is utilitarian. The emotional payoff at a festival is the live reveal, and the current page doesn't deliver that energy. |
| **U2** | **Per-category voting** — Best Drama, Best Comedy, Best Cinematography. Each film can be in multiple categories. Voter picks one film per category. | L | Real festivals always have multiple awards. Single-poll model forces a workaround. **Best done after U3.** |
| **U3** | **Multi-event support** — `Event` abstraction so the same instance hosts this year + next year + alumni votes without resetting. Each event has its own films, votes, snapshots, settings. | L | Foundational. Unlocks the README's stated "re-deployable for any school or festival" goal without `docker compose down -v` between events. |
| **U4** | **QR-based voter onboarding** — print a QR on the programme; voters scan with their phone instead of needing a kiosk iPad. Mobile-friendly responsive voter UI. | M | Widens reach beyond iPad kiosks; enables hybrid / remote festivals. |
| **U5** | **Bulk CSV film import** — admin pastes/uploads a CSV of `name, school, posterUrl` rows. | S | Pre-festival data entry for 30+ films is currently one-form-per-film. |
| **U6** | **Tie-breaker workflow** — when results are tied, admin can run a quick re-vote with just the tied films. | M | Real festival scenario; no clean way to handle a tie today. Could piggyback on per-category if U2 lands first. |
| **U7** | **Per-event branding/theming** — logo upload, accent color, custom CSS / favicon override. | S/M | Today everything is generic "Film Festival". Sells reuse. Depends on U3. |
| **U8** | **Voter-side schedule / programme page** — public listing of showtimes, synopses, directors. Posters link to a detail page. | M | A voting app that's also a programme guide reduces what the festival hosts elsewhere. |

## 🛠 Quality of life

| # | Feature | Effort | Why |
|---|---|---|---|
| **Q1** | **Vote undo within 5 seconds** — thank-you overlay shows a small Undo button that retracts the vote before the screen resets. | S | High user-frustration mitigation; eliminates the "I tapped the wrong poster" pain. |
| **Q2** | **Voting velocity widget on admin dashboard** — votes/min over last 5 min per iPad. | S | Helps an organizer mid-event catch a stuck or unattended iPad. |
| **Q3** | **Admin login audit log** — record every login (success/fail) with IP, timestamp. Show in audit page with a `type=auth` filter. | S | Audit log is currently vote-only; misses the most important security event. |
| **Q4** | **Audit log CSV/JSON export** — admin clicks "Export" → downloads. | S | Festival organizers want raw data for offline analysis or to share with judges. |
| **Q5** | **Poster resize-on-upload** — convert to WebP, max 800px wide. `Cache-Control: public, max-age=31536000, immutable` on `/uploads/*`. | S | A 12 MB JPEG slows every iPad in the room. |
| **Q6** | **Showcase mode replay** — option to replay a previous real festival's vote timeline as the demo, instead of synthetic randoms. | S | Today's showcase fingerprints all trip suspicious detection; a "replay" mode is more honest demo material. |
| **Q7** | **Admin dry-run mode** — preview voting + results screens with sample state, without touching real data. | M | New event setup currently requires `votingOpen=true` to verify the layout. |

## ⚙️ Ops / operability

| # | Feature | Effort | Why |
|---|---|---|---|
| **O1** | **Automated SQLite + uploads backup** — `litestream` (continuous) to an S3-compatible bucket (or a local replica volume + cron push). | S/M | Zero backup today. A `docker compose down -v` typo or volume corruption eats every festival's results. Single biggest existential risk. |
| **O2** | **Pre-migration DB snapshot hook** — entrypoint copies `prod.db` to `prod.db.bak-<sha>` before `prisma migrate deploy`. | S | A bad migration corrupts the only copy. Three lines of bash. |
| **O3** | **Real health endpoint** at `/api/health` — checks DB reachable, migrations applied, uploads dir writable, free disk > 5%. 503 on failure. | S | Watchtower currently treats "HTTP responds" as healthy. A corrupt DB or full disk would still look green. |
| **O4** | **Sentry (or self-hosted GlitchTip)** wired into all API routes via `handleApiError`. | S | `pino` is in place but no aggregated error surface. |
| **O5** | **CI lint + typecheck + test gate** before image push. | S | Today `Build and Push *` blindly builds whatever's on the branch — a `tsc` error makes it to prod. |
| **O6** | **Webhook on voting state change** — POST to a configurable URL when voting closes, with final results JSON. | M | Lets you wire into Discord, email, Google Sheets. |
| **O7** | **PWA / service worker** for the voter screen — caches the shell so a brief network blip doesn't black-screen a kiosk iPad. | M | One wifi hiccup currently breaks the kiosk. |
| **O8** | **E2E test of the full voter and admin flows** in Playwright, run on PRs. | M | Repo has Playwright installed and one trivial `/api/status` smoke test. Real coverage means refactors stop being scary. |
| **O9** | **Anomaly alert** — when a suspicious cluster crosses a threshold, send admin a notification via the same webhook as O6. | S | Closes the loop on the existing suspicious-detection feature. Depends on O6. |

---

## Recommended starter set

This is a coherent slice that compounds — ship in this order:

1. **O1** (litestream backups) — *do first.* Removes the single biggest existential risk.
2. **O3** (real health endpoint) + **O5** (CI lint/test gate)
3. **Q3** (admin login audit) + **Q4** (audit log export) + **Q5** (poster resize)
4. **U5** (CSV film import) + **U1** (results presentation mode)
5. **U3** (multi-event) — big rock, but unblocks U2 and U7

Everything else is fair game when the moment calls for it.

---

## How to use this page

- **Browse**: skim the menu for whatever fits the day.
- **Pick**: open the matching issue (e.g. `[U1] Results presentation mode`) for the implementation conversation, status, and PR links.
- **Add**: new ideas go in a new row + a new GitHub issue. Keep the IDs sequential per bucket (U9, Q8, O10, etc.) — don't renumber existing ones, they're referenced from PRs and the project board.

When a row ships, move it to the **Done** section below with the PR number and version tag.

## Done

_(Nothing shipped from this roadmap yet — it was authored on 2026-05-12 immediately after `v0.1.0` was sealed.)_
