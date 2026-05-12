# Contributing & Conventions

Local development, the conventions enforced by the codebase, and the workflow expected for PRs. Canonical references: `docs/CONTRIBUTING.md` and `CLAUDE.md` in the repo.

## Local setup

```sh
git clone https://github.com/jason-tucker/quiet-audience-voting.git
cd quiet-audience-voting
npm install
cp .env.example .env.local       # fill in JWT_SECRET, INITIAL_ADMIN_PASSWORD
npm run prisma:migrate           # create the SQLite DB and run migrations
npm run prisma:seed              # seed default settings
npm run dev
```

`JWT_SECRET` must be a real 32+ char string — the server refuses to start otherwise. `INITIAL_ADMIN_PASSWORD` cannot be the literal `changeme`.

Once dev is up: voter at `http://localhost:3000`, admin at `http://localhost:3000/admin`, results at `http://localhost:3000/results`.

## npm scripts

| Script                    | What it does                                                                  |
| ------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`             | Next.js dev server with hot reload                                            |
| `npm run build`           | Production build                                                              |
| `npm start`               | Start the built server                                                        |
| `npm run lint`            | ESLint with `--max-warnings 0` (any warning fails)                            |
| `npm run format`          | Prettier write across the repo                                                |
| `npm run format:check`    | Prettier verification (use in CI / pre-push)                                  |
| `npm test`                | Vitest unit tests, one-shot                                                   |
| `npm run test:watch`      | Vitest in watch mode                                                          |
| `npm run test:coverage`   | Vitest with V8 coverage                                                       |
| `npm run e2e`             | Playwright tests (assumes a running dev server, or set `PLAYWRIGHT_BASE_URL`) |
| `npm run prisma:generate` | Generate the Prisma client                                                    |
| `npm run prisma:migrate`  | Interactive migration workflow                                                |
| `npm run prisma:deploy`   | Apply pending migrations non-interactively (used in container start)          |
| `npm run prisma:seed`     | Run `prisma/seed.ts`                                                          |
| `npm run prisma:studio`   | Open Prisma Studio                                                            |

Husky + lint-staged is wired in `package.json` — on commit, ESLint and Prettier run on staged files.

## Code standards

- **TypeScript strict.** No `any`, no `!` non-null assertions.
- **Validate every API input with a Zod schema** in `src/lib/schemas/index.ts`. Don't hand-roll checks.
- **Throw typed `AppError` subclasses** for expected failures (`ValidationError`, `NotFoundError`, `RateLimitError`, …). Let the route's `catch` call `handleApiError(err, "VERB /path")`.
- **Keep route handlers thin.** Put logic in a service module under `src/lib/` (or `src/server/` for server-only).
- **TSDoc** (`/** … */`) on every exported symbol in `src/lib/` and `src/server/`. Write it for a reader with zero context.
- **Use the logger** from `@/server/logger`, never `console.*`.
- **No `_var` rename hacks** for unused parameters or backwards-compat shims. If something's unused, delete it.

## Adding a new API route

1. Add (or extend) a Zod schema in `src/lib/schemas/index.ts`. Export the inferred type via `z.infer`.
2. Write the service function in `src/lib/<feature>.ts` (or `src/server/<feature>.ts` for server-only). It takes the parsed input and either returns a value or throws an `AppError`.
3. Create `src/app/api/<route>/route.ts`:

   ```ts
   export async function POST(req: NextRequest) {
     try {
       const input = await parseJsonBody(req, MySchema);
       const result = await myService(input);
       return NextResponse.json(result);
     } catch (e) {
       return handleApiError(e, "POST /api/<route>");
     }
   }
   ```

4. Add a Vitest spec at `src/lib/__tests__/<feature>.test.ts` covering the service.

## Adding a new admin page

1. Create `src/app/admin/<page>/page.tsx`. Middleware already gates `/admin/*` behind a valid JWT cookie.
2. Fetch data via a server component (preferred) or a new admin API route built per the checklist above.
3. Reuse components from `src/components/`. Only add to a shared folder when the same piece appears on two or more pages.

## Tests

- **Unit (Vitest)** — alongside the code in `__tests__/`. Aim for one spec per service in `src/lib/`. Keep them fast and pure — no real Prisma calls; mock at the function boundary.
- **End-to-end (Playwright)** — `e2e/*.spec.ts`. Drive the dev server. Use `PLAYWRIGHT_BASE_URL` to point at a deployment if needed.

Before pushing: `npm run lint && npm test && npm run format:check`. The build is also a useful smoke test (`npm run build`).

## Branching & commits

- Branch from `dev`. Open PRs against `dev`. `main` is the promoted line — merges to `main` ship to production via the `deploy-main.yml` workflow.
- Keep PRs scoped. One concern per branch.
- Update `CHANGELOG.md` under `## [Unreleased]` as part of the PR.
- Don't squash-merge if the branch is mid-stack-of-PRs — preserve the history so promotions work.
- Don't push directly to `main`. Don't skip hooks (`--no-verify`).

## Decision log

When you make a non-trivial architectural call, add an ADR-style entry to `docs/DECISIONS.md` (a few lines: context, decision, consequences). The three existing entries cover the Zod-everywhere, service-layer, and `AppError`/`handleApiError` patterns that this repo leans on.
