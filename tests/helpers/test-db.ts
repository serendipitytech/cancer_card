import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration,
} from "drizzle-kit/api";
import { db, sqlite } from "@/db";
import * as schema from "@/db/schema";

// The app's `@/db` module opens the connection from `DATABASE_PATH`, which the
// vitest config pins to `:memory:` for the test run. This file brings that
// throwaway connection up to the current schema and resets it between tests.
//
// We build the schema directly from `@/db/schema` (via drizzle-kit's diff API)
// rather than replaying the committed migration history. That history currently
// contains a broken push_tokens rebuild (migration 0002 copies columns the
// prior table never had — the "migration landmine" noted in the project memory),
// so replaying it fails on a fresh DB. Generating from the live schema keeps the
// test DB aligned with the code under test, and is the right contract anyway:
// tests validate against the schema the ORM expects.
//
// Swappable: for the Postgres move (WP8/E1a), swap these two helpers for their
// `generatePg*` equivalents and change DATABASE_PATH; the fixtures and route
// tests are untouched.

let migrated = false;

export async function applyMigrations(): Promise<void> {
  if (migrated) return;
  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson(
    schema as Record<string, unknown>
  );
  const statements = await generateSQLiteMigration(empty, current);
  for (const statement of statements) {
    sqlite.exec(statement);
  }
  migrated = true;
}

// Every user-facing table. Wiped between tests with foreign keys off, so the
// order is for readability only.
const TABLES = [
  "activity_feed",
  "notification_log",
  "notification_preferences",
  "push_tokens",
  "bids",
  "milestones",
  "task_menu_templates",
  "self_care_routines",
  "tasks",
  "crew_members",
  "crews",
  "users",
] as const;

export async function resetDb(): Promise<void> {
  await applyMigrations();
  sqlite.pragma("foreign_keys = OFF");
  const wipe = sqlite.transaction(() => {
    for (const table of TABLES) {
      sqlite.prepare(`DELETE FROM ${table}`).run();
    }
  });
  wipe();
  sqlite.pragma("foreign_keys = ON");
}

export { db, sqlite };
