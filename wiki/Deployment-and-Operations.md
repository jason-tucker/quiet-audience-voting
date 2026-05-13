# Deployment & Operations

How to run quiet-audience-voting in production. Local dev setup is in [Contributing & Conventions](Contributing-and-Conventions).

## Image build

The repo ships a multi-stage `Dockerfile`:

1. **deps** — Node 20 Alpine, `libc6-compat` + `openssl`, `npm ci`.
2. **builder** — runs `prisma generate` and `npm run build` (Next.js standalone output).
3. **runner** — copies `public/`, `.next/standalone`, `.next/static`, `prisma/`, and the Prisma Node modules. Creates `/app/data` (SQLite) and `/app/uploads` (poster files). Runs as the `nextjs` user on port `3000`. Entrypoint runs `prisma migrate deploy` before starting `node server.js`.

GitHub Actions builds and publishes the image to GHCR on every push:

- `.github/workflows/deploy-dev.yml` — pushes to `dev` build `ghcr.io/<owner>/quiet-audience-voting:dev`.
- `.github/workflows/deploy-main.yml` — pushes to `main` build `:latest` and `:<sha>`.

Both authenticate to GHCR with `${{ secrets.GITHUB_TOKEN }}` and use the Actions cache for Buildx layers.

## docker-compose

The bundled `docker-compose.yml` pulls the latest image from GHCR and runs two services:

- **`qav`** — the app. Exposes port `3000`. Mounts `/app/data` (database) and `/app/uploads` (posters) as named volumes. Reads env from the compose file (or an `.env`).
- **Watchtower** — polls GHCR every `WATCHTOWER_POLL_INTERVAL=300` seconds (5 min) and rolls forward when a new image is available. Pin `DOCKER_API_VERSION` on this service (current value: `1.45`) — see [Troubleshooting & Incidents](Troubleshooting-and-Incidents) for the failure mode if you forget.

## Environment variables

| Variable                  | Required         | Purpose                                                                                                                                                                                                                       |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | yes              | SQLite path. Dev: `file:./prisma/dev.db`. Prod (in container): `file:/app/data/prod.db`.                                                                                                                                      |
| `JWT_SECRET`              | yes              | 32+ char random string used to sign HS256 JWTs. The server **refuses to start** if unset or set to a placeholder.                                                                                                             |
| `INITIAL_ADMIN_PASSWORD`  | yes (first boot) | Seeds the first admin password. The literal `changeme` is rejected.                                                                                                                                                           |
| `NEXT_PUBLIC_APP_URL`     | recommended      | Public URL of the deployment. Used for absolute URLs in metadata and as the alternate `Origin` accepted by `/api/login`.                                                                                                      |
| `TRUSTED_PROXY`           | optional         | Set `true` **only** when the app is behind a proxy that rewrites `x-forwarded-for` / `x-real-ip` (Cloudflare Tunnel, nginx, etc.). Without it, the audit log records `ipAddress` as `"unknown"` to prevent client-forged IPs. |
| `SECURE_COOKIE`           | optional         | Set `false` to allow the admin cookie over plain HTTP. **Do not use in production with TLS.** Default: `Secure` in production.                                                                                                |
| `NODE_ENV`                | yes              | `production` or `development`.                                                                                                                                                                                                |
| `LOG_LEVEL`               | optional         | Pino logger level (`info`, `debug`, …).                                                                                                                                                                                       |
| `PORT`, `HOSTNAME`        | optional         | Override server bind. Dockerfile defaults: `3000` and `0.0.0.0`.                                                                                                                                                              |
| `NEXT_TELEMETRY_DISABLED` | optional         | Set in the Dockerfile to opt out of Next telemetry.                                                                                                                                                                           |

A starter `.env.example` is in the repo root.

## Behind a reverse proxy

The voting page, admin, and `/api/*` are all standard HTTP. **`/api/results/stream` is SSE**, so:

- Disable response buffering for that path. nginx: `proxy_buffering off;` on the `/api/results/stream` location.
- Allow long-lived connections: `proxy_read_timeout` long enough to cover the 3 s heartbeat indefinitely (e.g. `1h`), and pass `Connection`/`Upgrade` headers appropriately if your stack needs them.
- If terminating TLS at the proxy, keep `SECURE_COOKIE` at its default (Secure) and set `TRUSTED_PROXY=true` so audit IPs are real.

## Prisma migrations

Migrations live in `prisma/migrations/` and are applied at container start (`prisma migrate deploy`). Current set:

1. `20260509060959_init` — initial schema (`Film`, `Vote`, `Setting`).
2. `20260509065820_drop_display_order` — remove unused column.
3. `20260509065857_add_trusted_devices_and_snapshots` — add `TrustedDeviceProfile` and `VoteSnapshot`.

The seed script (`prisma/seed.ts`) inserts three default `Setting` rows: `votingOpen=false`, `eventName=Film Festival`, `adminPasswordHash=` (empty). Run it locally with `npm run prisma:seed` after the first `prisma migrate dev`. In production, the password is set from `INITIAL_ADMIN_PASSWORD` on first successful login.

## Backups

The two state directories are:

- `/app/data` — SQLite database (`prod.db`, plus WAL/SHM files when in use).
- `/app/uploads` — poster image files referenced by `Film.posterUrl`.

Back up both together. SQLite is safe to copy while running if you use `sqlite3 prod.db ".backup '/path/to/backup.db'"`; a plain `cp` may race with WAL writes.

## Operational toggles cheat-sheet

| Want to …                              | Do this                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pause voting mid-event                 | Admin → Dashboard → **Voting off**. `/api/vote` starts returning 403 immediately.                                |
| Reset between screenings               | Admin → Sessions → **Reset**. Snapshots the standings then wipes `Vote`.                                         |
| Hide a film without losing votes       | Currently no soft-hide. Delete it and accept that its votes will still exist as orphans, or rename it.           |
| Demo on a projector                    | Admin → Settings → **Showcase mode on**. Whitelist the 6 fake fingerprints in **Devices** for a clean dashboard. |
| Run on plain HTTP for a quick LAN test | Set `SECURE_COOKIE=false`. **Don't ship this.**                                                                  |
