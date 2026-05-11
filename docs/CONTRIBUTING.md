# Contributing

## Setup

```bash
git clone https://github.com/Jason-Tucker/quiet-audience-voting.git
cd quiet-audience-voting
npm install
cp .env.example .env.local
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Visit `http://localhost:3000` (voter), `/admin` (dashboard, password from
`INITIAL_ADMIN_PASSWORD`), `/results` (live tally).

## Day-to-day scripts

| Command                | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Next.js dev server with hot reload        |
| `npm run build`        | Production build                          |
| `npm test`             | Vitest unit tests (one-shot)              |
| `npm run test:watch`   | Vitest in watch mode                      |
| `npm run e2e`          | Playwright end-to-end tests               |
| `npm run lint`         | ESLint (flat config), zero-warning policy |
| `npm run format`       | Prettier write across the repo            |
| `npm run format:check` | Prettier verification (CI-friendly)       |

## Conventions

- **TypeScript strict**. No `any`. No non-null assertions (`!`).
- **Validate every API boundary** with a Zod schema from `src/lib/schemas/`.
- **Throw typed errors** (`ValidationError`, `NotFoundError`, ...) from
  services and route handlers; catch in each route and call
  `handleApiError(err)`.
- **Use the service layer**: route handlers are thin — parse, authorize,
  delegate, respond.
- **TSDoc** on every exported symbol in `src/lib/` and `src/server/`.
- **Logger over `console`**: import `logger` from `@/server/logger`.

## Pre-commit hook

Husky + lint-staged run ESLint + Prettier on staged files. Install runs
automatically via `npm install` (`prepare` script). If the hook misbehaves,
re-run `npx husky init` and verify `.husky/pre-commit` contains
`npx lint-staged`.

## Tests

- Add unit tests next to the code they cover (`foo.ts` →
  `__tests__/foo.test.ts`).
- Playwright specs live in `e2e/`. Run against a started dev server
  (default) or a deployed URL via `PLAYWRIGHT_BASE_URL`.

## Submitting changes

- Branch off `dev`. Open PRs against `dev`. `main` is promoted from `dev`
  after the staging environment looks good.
- Keep PRs scoped. Update `CHANGELOG.md` under `## [Unreleased]`.
- Run `npm run lint && npm test` before pushing.
