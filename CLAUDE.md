# CLAUDE.md

Guide for AI readers (and humans in a hurry) working in this repo.

For the full structural tour see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
For decision rationale see [`docs/DECISIONS.md`](docs/DECISIONS.md). For
setup, scripts, and PR etiquette see [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

## Where things live

- API route handlers — `src/app/api/**/route.ts`. Thin; delegate to services.
- Business logic / Prisma access — `src/lib/*.ts` and (Phase 2) services
  under `src/server/` or `src/lib/services/`.
- Validation schemas — `src/lib/schemas/index.ts` (Zod, `z.infer` types).
- Error types — `src/lib/errors.ts` (`AppError` + subclasses).
- Central error handler — `src/server/handleApiError.ts`.
- JSON body parser + size cap — `src/server/parseJsonBody.ts`.
- Logger — `src/server/logger.ts` (Pino).
- React components — `src/components/`.
- Tests — `src/**/__tests__/*.test.ts` (Vitest), `e2e/*.spec.ts` (Playwright).

## Conventions

- TypeScript strict. No `any`, no `!` non-null assertions.
- Validate every API input with a Zod schema; do not hand-roll checks.
- Throw `AppError` subclasses for expected failures; let the route's
  `catch` call `handleApiError(err)`.
- Route handlers stay thin. Put logic in a service module.
- TSDoc (`/** ... */`) on every exported symbol in `src/lib/` and
  `src/server/`. Write it for a reader with zero context.
- Use the `logger` from `@/server/logger`, never `console.*`.

## Adding a new API route

1. Add (or extend) a Zod schema in `src/lib/schemas/index.ts`. Export the
   inferred type.
2. Write the service function in `src/lib/<feature>.ts` (or
   `src/server/<feature>.ts` for server-only). It takes the parsed input
   and returns either a value or throws an `AppError`.
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
4. Add a Vitest spec for the service in `src/lib/__tests__/<feature>.test.ts`.

## Adding a new admin page

1. Create `src/app/admin/<page>/page.tsx`. Middleware already gates the
   `/admin` segment behind a valid JWT cookie.
2. Fetch data via a server component (preferred) or via a new admin API
   route built per the checklist above.
3. Reuse components from `src/components/`; only add to the shared folder
   when a piece appears in two or more pages.
