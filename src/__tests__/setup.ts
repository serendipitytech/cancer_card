import { execSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Node 18 does not expose Web Crypto as a global in the vitest worker, but the
// Drizzle schema's id defaults call `crypto.randomUUID()`. Shim it.
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

// Point the app's SQLite singleton at a throwaway DB BEFORE any `@/db` import
// (setupFiles run before the test module is evaluated).
const dir = mkdtempSync(join(tmpdir(), "cc-vitest-"));
process.env.DATABASE_PATH = join(dir, "app.db");

// Make email a hard no-op so nothing reaches the network during tests.
delete process.env.RESEND_API_KEY;

// Build the schema straight from schema.ts via drizzle-kit push. We do NOT run
// the migration SQL: 0002_keen_vapor.sql rebuilds push_tokens in a way that
// fails on a fresh DB. push derives tables from the live schema, sidestepping
// that landmine.
execSync("npx drizzle-kit push --force", {
  cwd: process.cwd(),
  stdio: "ignore",
  env: process.env,
});
