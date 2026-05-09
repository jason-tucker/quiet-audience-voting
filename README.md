# Quiet Audience Voting

A full-screen, iPad-friendly audience voting web app for film festivals. Staff manage iPads at theatre exits; audience members tap a movie poster to cast a vote, and the device resets after 3 seconds for the next voter. An admin dashboard tracks votes, devices, and audit logs in real time.

Built originally for **QCFFPOLL.COM** — designed to be re-deployable for any school or festival.

## Features

- **Voting interface** — full-screen poster grid optimized for iPad. Tap a poster, confirm with the vote button (or tap again), reset after 3 seconds.
- **Live results** — `/results` page updates in real-time via Server-Sent Events. No refresh needed.
- **Admin dashboard** — password protected. Manage films, toggle voting open/closed, view vote timeline, audit log, device list, and flagged suspicious clusters.
- **Device tracking** — captures all browser-exposed device info on every vote (user agent, screen, timezone, language, platform, etc.) for legitimate audit logging.
- **Self-contained** — single Docker container, single SQLite file, no external services required.

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router) + React 19
- [Prisma](https://www.prisma.io) + SQLite
- [Tailwind CSS](https://tailwindcss.com)
- Server-Sent Events for live updates
- `jose` (Edge-compatible JWT) + `bcryptjs` for admin auth
- Docker + GitHub Container Registry + Watchtower for deployment

## Local Development

Requirements: Node.js 20+ and npm.

```powershell
git clone https://github.com/Jason-Tucker/quiet-audience-voting.git
cd quiet-audience-voting
npm install
Copy-Item .env.example .env.local
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Visit `http://localhost:3000` for the voting screen, `http://localhost:3000/admin` for the dashboard, `http://localhost:3000/results` for live results.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite file location. Local: `file:./prisma/dev.db`. Docker: `file:/app/data/prod.db`. |
| `JWT_SECRET` | Random 32+ char string for signing admin JWTs. |
| `INITIAL_ADMIN_PASSWORD` | Used for first admin login until you change it via the settings page. |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed site. |

## Deployment

Three environments wired through Git branches:

| Environment | URL | Branch | Host |
|-------------|-----|--------|------|
| Local dev | `http://localhost:3000` | any | your machine |
| Dev/staging | `https://dev.qcffpoll.com` | `dev` | Unraid Docker |
| Production | `https://qcffpoll.com` | `main` | Ubuntu VPS |

Each push to `dev` or `main` triggers a GitHub Actions workflow that builds a Docker image and pushes it to GitHub Container Registry. [Watchtower](https://containrrr.dev/watchtower/) on each host polls GHCR every 5 minutes and auto-updates the running container. [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) exposes both hosts without port forwarding.

See the [Wiki](https://github.com/Jason-Tucker/quiet-audience-voting/wiki) for detailed setup guides for Unraid, the Ubuntu VPS, Cloudflare Tunnel, and Watchtower.

## Workflow

```
local edits → push to dev → GitHub Actions builds :dev image
                          → Watchtower on Unraid pulls :dev
                          → live at dev.qcffpoll.com

confirmed working → merge dev into main → GitHub Actions builds :latest
                                        → Watchtower on VPS pulls :latest
                                        → live at qcffpoll.com
```

## License

MIT
