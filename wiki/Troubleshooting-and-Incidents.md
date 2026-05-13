# Troubleshooting & Incidents

A running log of operational issues we've hit in production, plus the canonical fix and how to recognise the symptom again. New entries go at the top; keep the format consistent so on-call can grep for an error string.

---

## 2026-05-12 — `:dev` image crash-loops with `Cannot find module 'effect'`

**Tracking issue:** [#7](https://github.com/jason-tucker/quiet-audience-voting/issues/7)
**Fix PRs:** [#6](https://github.com/jason-tucker/quiet-audience-voting/pull/6) (main), [#8](https://github.com/jason-tucker/quiet-audience-voting/pull/8) (dev)

**Symptom**

`qav-dev` (and any container running the `:dev` image, or any `:latest` image built before #6) restarts on a tight loop. Logs show:

```
Error: Cannot find module 'effect'
Require stack:
- /app/node_modules/@prisma/config/dist/index.js
- /app/node_modules/prisma/build/index.js
```

The crash happens during `prisma migrate deploy` in the entrypoint, so it fires before Next.js boots.

**Root cause**

Prisma 6.x's CLI requires `@prisma/config`, which in turn requires runtime peers `effect`, `c12`, `deepmerge-ts`, and `empathic`. The old runner stage in `Dockerfile`:

```dockerfile
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma   ./node_modules/prisma
```

copies the Prisma packages themselves but **not** the top-level `node_modules/effect`, etc. So `require('effect')` from inside `@prisma/config` throws `MODULE_NOT_FOUND`.

**Fix**

Replace those two `COPY` lines with a fresh `npm install` of the Prisma CLI in the runner image, so npm walks the dep graph and brings in transitive runtime deps:

```dockerfile
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
RUN npm install prisma@^6.1.0 --omit=dev --no-audit --no-fund
```

Already on `main` and `dev` as of 2026-05-12. If you see this error after that date, the most likely cause is an old image being pulled — check `docker image inspect …:dev --format '{{.Created}}'`.

**Detect quickly**

```bash
docker compose -f /opt/qav/docker-compose.yml logs qav-dev --tail=20 | grep -F "Cannot find module 'effect'"
```

---

## 2026-05-12 — `watchtower-qav` crash-loops with `client version 1.25 is too old`

**Tracking issue:** [#7](https://github.com/jason-tucker/quiet-audience-voting/issues/7)

**Symptom**

`docker compose ps` shows `watchtower-qav` in `Restarting (1) …` indefinitely. Logs repeat:

```
level=error msg="Error response from daemon: client version 1.25 is too old.
  Minimum supported API version is 1.40, please upgrade your client to a newer version"
level=info  msg="Waiting for the notification goroutine to finish" notify=no
```

App containers (`qav-main`, `qav-dev`) are unaffected, but **auto-updates stop** — new GHCR images won't roll forward without manual `docker compose pull`.

**Root cause**

`containrrr/watchtower:latest` ships with a vendored Docker client locked to API version 1.25. The host daemon (`docker version` on this VPS reports API 1.54) refuses clients below 1.40. The project itself is in low-activity maintenance and hasn't refreshed the client lib.

**Fix**

Pin the API version on the watchtower service in `/opt/qav/docker-compose.yml`:

```yaml
watchtower:
  image: containrrr/watchtower
  environment:
    DOCKER_API_VERSION: "1.45"
  command: --label-enable --scope qav --cleanup --interval ${WATCHTOWER_INTERVAL}
```

Then `docker compose up -d watchtower`. Watchtower's Docker client honours `DOCKER_API_VERSION` and will negotiate at that level.

**Verify**

```bash
docker compose -f /opt/qav/docker-compose.yml logs watchtower --tail=5
# Expect:
#   "Watchtower 1.7.1"
#   "Only checking containers using enable label, in scope \"qav\""
#   "Scheduling first run: …"
```

**Fallback**

If a future Docker daemon raises the minimum API past 1.45, bump the pin (1.46, 1.47, …) to match `docker version --format '{{.Server.APIVersion}}'`. If watchtower becomes uninstallable on the host, switch to a maintained fork (`nickfedor/watchtower`, `beatkind/watchtower`) — same CLI flags.

---

## General triage checklist (start here on any production page)

1. **`docker compose -f /opt/qav/docker-compose.yml ps`** — what state is each container in?
2. If anything is `Restarting`, dump its logs: **`docker compose logs <service> --tail=80`**.
3. Hit the localhost ports directly: **`curl -fsS http://127.0.0.1:6090/api/status`** (prod) and **`:6091`** (dev). If localhost is healthy but the public URL is not, the issue is the Cloudflare Tunnel, not the app — check `systemctl status cloudflared`.
4. Image freshness: **`docker image inspect ghcr.io/jason-tucker/quiet-audience-voting:latest --format '{{.Created}}'`**, compare with the most recent successful `Build and Push Production Image` run on GitHub Actions.
5. Volumes still attached: **`docker volume ls | grep qav`** should show `qav_main_data`, `qav_main_uploads`, `qav_dev_data`, `qav_dev_uploads`. **Never `docker compose down -v` on this host** — that deletes the database.
