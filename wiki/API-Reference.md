# API Reference

Every route lives under `src/app/api/**/route.ts`. Handlers are thin: parse with Zod, delegate to a service in `src/lib/`, let `handleApiError` shape the response.

All error responses share the shape:

```json
{ "error": "human message", "code": "MACHINE_CODE" }
```

`Retry-After` is set when applicable (429s).

## Public routes

### `POST /api/vote`

Cast a vote.

- **Body** — `VoteInputSchema`: `{ filmId: string (1–64), deviceInfo: DeviceInfoSchema }`. `deviceInfo.fingerprint` is required (1–128 chars); the other telemetry fields (screen size, timezone, language, platform, etc.) are all optional.
- **Auth** — none.
- **Rate limit** — per `deviceInfo.fingerprint`.
- **Effects** — inserts a `Vote` row, broadcasts the new snapshot over SSE.
- **Errors** — `400` invalid body, `403` voting closed, `404` unknown `filmId`, `429` rate-limited.

### `GET /api/films`

List all films.

- **Auth** — none.
- **Response** — `Film[]` (id, name, school, posterUrl, createdAt).

### `POST /api/login`

Exchange admin password for a JWT cookie.

- **Body** — `LoginInputSchema`: `{ password: string (1–200) }`.
- **Auth** — none, but rate-limited per IP.
- **Effects** — sets `qav_admin` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` in prod, 1 h TTL).
- **Errors** — `401` bad password, `429` rate-limited.

### `GET /api/status`

Public app status used by the voting page and admin nav.

- **Response** — `{ votingOpen: boolean, eventName: string }`.

### `POST /api/upload-poster`

Multipart image upload for posters. Admin-only — bypasses middleware (which strips bodies) by verifying the JWT directly in the handler.

- **Auth** — JWT from cookie (manual check).
- **Errors** — `401` unauthenticated, `413` too large, `400` not an image.

### `GET /api/results`

Current snapshot, non-streaming.

- **Response** — `{ films: VoteResult[], total: number, votingOpenedAt: string | null, serverTime: string }`.

### `GET /api/results/stream`

Server-Sent Events stream of vote snapshots.

- **Headers** — `Content-Type: text/event-stream`.
- **Cadence** — heartbeat every 3 s plus on every new vote.
- **Cap** — 200 concurrent clients per process.
- **Event payload** — same shape as `/api/results`, with optional `lastVote: { id, filmId, filmName, timestamp }`.

### `GET /api/results/votes`

Paginated vote-event timeline for the public results board.

- **Query** — `filmId?`, pagination params; capped at 20,000 results.
- **Response** — `{ events: VoteEvent[] }`.

## Admin routes (`/api/admin/**`)

All require a valid `qav_admin` JWT. Middleware enforces this; the response on failure is `401`.

### `POST /api/admin/films`

Create a film.

- **Body** — `FilmInputSchema`: `{ name, school, posterUrl }` (all 1–2000 chars).

### `PUT /api/admin/films/[id]`

Patch a film.

- **Body** — `FilmPatchSchema` (`FilmInputSchema.partial()`).
- **Errors** — `404` if id unknown.

### `DELETE /api/admin/films/[id]`

Delete a film.

- **Errors** — `404` if id unknown.

### `GET /api/admin/settings`

All settings except `adminPasswordHash`.

### `PUT /api/admin/settings`

Update settings.

- **Body** — `SettingsInputSchema`: optional `adminPassword` + `adminPasswordConfirm` (6–200, must match), and a catchall of string/boolean values for the rest (`votingOpen`, `eventName`, `showcaseMode`).
- **Effects** — toggling `votingOpen` from false→true also writes `votingOpenedAt`. Setting a new password rehashes it.

### `POST /api/admin/logout`

Clears the auth cookie.

### `GET /api/admin/sessions`

Lists the last 5 vote snapshots.

### `POST /api/admin/sessions/reset`

Captures a `VoteSnapshot` of the current results, wipes `Vote`, and prunes old snapshots.

### `GET /api/admin/votes`

Audit-grade vote list.

- **Query** — `filmId?`, `limit?` (default 50, max 500), `offset?`.
- **Response** — full vote rows including `rawDeviceJson`.

### `GET /api/admin/votes-detailed`

Slim timeline (`id, filmId, timestamp, deviceFingerprint`) suitable for charts.

### `GET /api/admin/stats`

Aggregates: `{ totalFilms, totalVotes, uniqueDevices }`.

### `GET /api/admin/suspicious`

Suspicious vote clusters by fingerprint.

- **Query** — `windowMinutes?` (default 10), `threshold?` (default 5).
- **Response** — clusters sorted by size.

### `GET /api/admin/devices`

Aggregates votes by fingerprint and joins against `TrustedDeviceProfile`.

### `GET /api/admin/trusted-devices`

List trusted device profiles.

### `POST /api/admin/trusted-devices`

Register a trusted device from a known fingerprint (e.g. a vote you trust).

### `PUT /api/admin/trusted-devices/[id]`

Update a profile's label.

### `DELETE /api/admin/trusted-devices/[id]`

Remove a trusted profile.

## Zod schemas

Exported from `src/lib/schemas/index.ts`:

- `DeviceInfoSchema`
- `VoteInputSchema`
- `FilmInputSchema`
- `FilmPatchSchema`
- `LoginInputSchema`
- `SettingsInputSchema`

Always import the inferred type (`type VoteInput = z.infer<typeof VoteInputSchema>`) rather than hand-writing the type.
