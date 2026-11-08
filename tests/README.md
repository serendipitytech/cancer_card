# Cancer Card test suite

Vitest-based unit and API-route tests. The goal of this first pass (WP2) is real
coverage on the high-blast-radius paths, not smoke tests: point spend/earn math,
task completion (the money path), reverse-auction close, bidding, self-care and
streak math, and crew membership/role authorization.

## Running

```bash
npm test            # vitest run (one-shot)
npm run test:watch  # watch mode
npx vitest run tests/routes/task-close.test.ts   # a single file
```

## Harness design

Three things make it possible to exercise the route handlers directly, fast, and
in isolation.

### 1. A per-file in-memory database (`helpers/test-db.ts`)

`vitest.config.ts` sets `DATABASE_PATH=:memory:`, so the app's real `@/db`
module opens a throwaway SQLite connection instead of a file. Because vitest
isolates modules per test file, each file gets its own fresh in-memory DB.

The schema is built from the live `@/db/schema` via drizzle-kit's diff API, not
by replaying the committed migration history. The committed history currently
contains a broken `push_tokens` rebuild (migration `0002_keen_vapor` copies
columns the prior table never had, the "migration landmine" noted in the project
memory), which fails on a fresh database. Generating from the live schema keeps
the test DB aligned with the code under test, which is the correct contract for
tests anyway. `resetDb()` wipes every table between tests.

Swappable for the Postgres move (WP8 / E1a): swap the two `generateSQLite*`
helpers for their `generatePg*` equivalents and change `DATABASE_PATH`. The
fixtures and route tests do not change.

### 2. A faked auth session (`setup.ts` + `helpers/harness.ts`)

The route handlers authenticate via `auth()` from `@/lib/auth`. `tests/setup.ts`
mocks that module (plus `@/lib/cookies` for active-crew selection and
`@/lib/notification-service` to keep Resend out of tests). A mutable auth state
lives on `globalThis`; tests drive it with:

- `setSession(user)` / `clearSession()` - who is signed in
- `setActiveCrew(crewId)` - pin the active crew (otherwise the first crew wins)

Crew membership itself is NOT mocked: `addMember()` inserts a real
`crew_members` row, so the handlers' membership and role checks run for real
against the test DB.

When the Logto migration lands, the single thing that changes is the mock target
in `setup.ts`.

### 3. Fixtures and a route invoker (`helpers/harness.ts`)

`createUser`, `createCrew` (also registers the card-holder membership),
`addMember`, `createTask`, `createBid`, `createMilestone`, `createRoutine` seed
state directly. `jsonRequest(body)` builds a `Request`, and `routeContext(id)`
builds the `{ params }` argument Next passes to `[id]` route handlers.

## Files

| Path | Covers |
|------|--------|
| `lib/points.test.ts` | spend/earn arithmetic, negative balances, activity log |
| `lib/streaks.test.ts` | medication + general streak math, bonus thresholds, gaps |
| `lib/rate-limit.test.ts` | the in-memory limiter (budgets, windows, isolation) |
| `lib/session.test.ts` | `isCardHolder`, `getUserCrews`, active-crew resolution |
| `routes/tasks-create.test.ts` | task creation authz + persistence |
| `routes/task-claim.test.ts` | claim rules (direct/open/auction, membership) |
| `routes/task-close.test.ts` | completion point spend (money path), cancel, authz |
| `routes/auction-close.test.ts` | manual + bid-threshold auction close |
| `routes/bid.test.ts` | bid validation, lowest-bid rule, expiry auto-close |
| `routes/milestones.test.ts` | point earn + streak-bonus integration, authz |

## Not covered here (deliberately)

- Account deletion / anonymize-on-delete: no endpoint exists on this branch yet
  (WP3 builds it). It should get a dedicated deletion test when it lands.
- Cross-tenant isolation, billing, Logto provisioning: those features do not
  exist yet (E1/E2/E9). Scaffolding is ready for them.
