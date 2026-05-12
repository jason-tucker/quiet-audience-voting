# Voter & Showcase Flow

What the audience sees, how the results board stays live, and what the showcase-mode simulator does.

## Voter — `/`

The home page is the voter UI.

1. On load, the page fetches `/api/status` and `/api/films`.
2. If `votingOpen` is false, it renders the `VotingClosedScreen` and stops.
3. Otherwise it renders a responsive grid of films. The order is **shuffled per voter** via Fisher–Yates, so no film benefits from being first in the list.
4. Tapping a film expands it (`ExpandedFilmCard`) with the full poster and a Vote button.
5. The Vote button collects a device fingerprint plus telemetry and `POST`s to `/api/vote`.
6. On success the voter sees a thank-you overlay.

### What goes in `deviceInfo`

The client-side fingerprint module collects all of: `fingerprint`, `userAgent`, `screenWidth/Height`, `timezone`, `language`, `platform`, `colorDepth`, `touchSupport`, `pixelRatio`, `viewportWidth/Height`, `cookieEnabled`, `doNotTrack`, `hardwareConcurrency`, `deviceMemory`. Server stores the whole thing as `rawDeviceJson` and lifts the columns it indexes (`deviceFingerprint`, `userAgent`, screen size, etc.).

### Rate limit

`POST /api/vote` is rate-limited per `fingerprint` via `src/lib/rateLimit.ts` (token bucket, per process, in-memory). Exceeding it returns `429` with a `Retry-After` header.

## Results — `/results`

The projector / TV page. Public, no auth.

- On mount, fetches `/api/results/votes` to hydrate the timeline of recent events.
- Opens an `EventSource` to `/api/results/stream`. The connection is keyed with `?cb=<timestamp>` to bust intermediaries' caches on reconnect.
- Each SSE message is `JSON.parse`d into a `SsePayload`:

  ```ts
  interface SsePayload {
    films: VoteResult[]; // { filmId, filmName, school, posterUrl, count, percentage }
    total: number;
    votingOpenedAt: string | null;
    serverTime: string;
    lastVote?: { id; filmId; filmName; timestamp };
  }
  ```

- State machine: `live` / `stale` / `disconnected`.
  - Live whenever a message arrived within the last 5 s.
  - Stale if no update for > 5 s — the page force-reconnects.
  - Disconnected on `error`, with exponential backoff (500 ms × 2ⁿ, capped at 5 s).
- The page also polls `/api/status` every 5 s for `eventName` and `votingOpen` so the chrome reflects admin changes without needing an SSE event for them.

### Server side — `src/lib/sse.ts`

- Heartbeat every **3000 ms** (`HEARTBEAT_MS`) — sends the current snapshot to every connected client even if nothing has changed.
- On every successful vote, `broadcast()` pushes immediately.
- Hard cap of **200 concurrent clients** per process — additional connections are rejected. This bounds memory on the public page.
- When the last client disconnects, the heartbeat timer is cleared.

## Showcase mode

A demo-friendly simulator that fakes organic voter traffic. Useful for sanity-checking the results board on a projector before an event.

- Toggled by the `showcaseMode` setting (admin Settings page, or `PUT /api/admin/settings`).
- `ensureShowcaseSync()` reads the setting periodically and starts or stops the loop accordingly.
- Six fake iPad profiles tick on independent timers. Cadence per device:
  - 30% fast votes (1.5–4 s)
  - 55% normal (4–10 s)
  - 15% slow (10–25 s)
- Roughly ~1 vote/sec system-wide, varied enough to look organic.
- Pauses automatically if `votingOpen` flips to false; resumes when reopened.

Showcase fingerprints look like real iPads to the rest of the system, so they will trip the suspicious-cluster detector — that's expected. Use **Trusted devices** to whitelist them if you want a clean dashboard during a demo.

## Anti-fraud heuristics

These run server-side regardless of who's voting.

### Per-fingerprint rate limit

`src/lib/rateLimit.ts`. Token bucket, default in `POST /api/vote`. Independent of `votingOpen`.

### Suspicious cluster detection

`src/lib/suspicious.ts`. For each fingerprint, finds the largest sliding window (default 10 min) where the vote count meets a threshold (default 5). Returns the cluster size, span, and films voted for. Surfaced in **Admin → Devices**.

### Trusted devices

`src/lib/trustedDevices.ts`. A `TrustedDeviceProfile` row whitelists a fingerprint **or** a (platform, browser family, screen ±8 px) signature. Matching is lenient so a known tablet survives small browser updates without losing its trust.
