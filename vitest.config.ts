import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Vitest config for the Cancer Card API/business-logic test suite.
//
//  - `DATABASE_PATH=:memory:` makes the real `@/db` module open a throwaway
//    in-memory SQLite connection per test file, so the DB layer is never mocked.
//    The harness builds the schema from `@/db/schema` (not the migration chain,
//    which carries the known broken push_tokens rebuild).
//  - `isolate: true` gives each file its own module registry, hence its own
//    in-memory DB; rows are cleared between tests.
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
    isolate: true,
  },
});
