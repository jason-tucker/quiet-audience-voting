# Admin Guide

How to run an event from the admin area. All admin pages live under `/admin` and require a valid JWT cookie; the middleware redirects unauthenticated users to `/login`.

## First login

1. Set `INITIAL_ADMIN_PASSWORD` in the environment **before** the first boot. The literal string `changeme` is rejected — pick a real value.
2. The seed script (`prisma/seed.ts`) creates the three default `Setting` rows with an empty `adminPasswordHash`; the first successful login rehashes whatever you submit if the stored hash is empty.
3. Go to `/login`, submit the password. On success you'll be redirected to `/admin`.

Logout: click **Log out** in the admin nav, or `POST /api/admin/logout`.

## `/admin` — Dashboard

The landing page. Shows:

- **Stats** — total films, total votes, unique devices (`GET /api/admin/stats`).
- **Suspicious activity** — count of clusters from `/api/admin/suspicious` with the current defaults (10-minute window, 5-vote threshold).
- **Voting toggle** — opens or closes voting. Opening writes `votingOpenedAt` automatically.
- **Showcase mode toggle** — see [Voter & Showcase Flow](Voter-and-Showcase-Flow).
- **Vote timeline** and **per-device timeline** — live charts driven by `/api/admin/votes-detailed`.

## `/admin/films` — Films

CRUD for films. Each film has a `name`, `school`, and `posterUrl`.

- Posters can be uploaded via `POST /api/upload-poster` (multipart) and the returned URL pasted in.
- Deletes are hard. Vote rows reference `filmId` but are not FK-cascaded — clear votes via **Sessions** before deleting a film if you want a clean reset.

## `/admin/settings` — Settings

Form-backed wrapper for `PUT /api/admin/settings`.

| Setting                                  | Type    | Purpose                                                                                         |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `votingOpen`                             | boolean | Master switch. When false, `/api/vote` returns 403 and the voting page shows the closed screen. |
| `eventName`                              | string  | Shown in headers and the results board. Defaults to "Film Festival".                            |
| `showcaseMode`                           | boolean | Starts/stops the simulated-voter loop.                                                          |
| `adminPassword` + `adminPasswordConfirm` | string  | Optional password change (6–200 chars, must match).                                             |

`votingOpenedAt` is not user-editable — it's set server-side when you flip `votingOpen` from false → true.

## `/admin/sessions` — Sessions

A "session" is a captured snapshot of the current state plus a reset.

- **List** — the most recent 5 `VoteSnapshot` rows (`GET /api/admin/sessions`).
- **Reset** (`POST /api/admin/sessions/reset`) — captures the current standings into a `VoteSnapshot`, then deletes every `Vote` row. Useful between screenings or at the start of an event night.

Older snapshots beyond the most recent few are pruned automatically.

## `/admin/devices` — Devices & suspicious activity

Two sections on one page:

- **Suspicious clusters** — `/api/admin/suspicious`. A cluster is a fingerprint that cast ≥ N votes within a window (defaults: 5 votes / 10 min). Lists fingerprint, vote count, span, and films voted for.
- **All devices** — aggregates from `/api/admin/devices`. Joins against `TrustedDeviceProfile` so you can see which devices are whitelisted.

From here you can "trust" a fingerprint to whitelist it. The page calls `POST /api/admin/trusted-devices` with that fingerprint and a label (e.g. "Lobby iPad").

A trusted match is either an exact fingerprint hit, or a fuzzy match: same platform + browser family + screen size within ±8 px (`src/lib/trustedDevices.ts`).

## `/admin/audit` — Audit log

Full chronological vote list via `GET /api/admin/votes` (paged, default 50, max 500). Each row exposes the raw device JSON (`rawDeviceJson`) for forensic review.

Useful for after-the-fact disputes: filter by `filmId`, scroll through the timeline, inspect the device profile that cast each vote.

## Running an event — typical flow

1. Log in. Set `eventName`. Make sure `votingOpen` is **off**.
2. Add or update films in **Films**.
3. Designate any known tablets in **Devices** (whitelist their fingerprints so high vote counts don't trip suspicious detection).
4. When the screening ends and discussion starts: flip `votingOpen` **on** in **Dashboard** or **Settings**.
5. Open the **Results** page on the projector — it auto-connects via SSE.
6. After voting closes, flip `votingOpen` off and **Reset** in **Sessions** to archive the snapshot.
