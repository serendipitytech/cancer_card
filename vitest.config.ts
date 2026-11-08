import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Vitest config for the Cancer Card API/business-logic test suite.
//
// Design notes (see tests/README.md for the full write-up):
//  - `DATABASE_PATH=:memory:` makes the real `@/db` module open a throwaway
//    in-memory SQLite connection per test file, so no mocking of the DB layer
//    is needed. The harness applies the committed Drizzle migrations to it.
//  - `isolate: true` (the default) gives each test file its own module
//    registry, hence its own in-memory DB. Rows are cleared between tests.
//  - Swappable: when the Postgres migration (WP8/E1a) lands, only
//    `tests/helpers/test-db.ts` and this env need to change; the route tests
//    and fixtures stay the same.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    env: {
      DATABASE_PATH: ":memory:",
      NODE_ENV: "test",
    },
    // Each file gets a fresh worker + fresh in-memory DB.
    isolate: true,
  },
});
