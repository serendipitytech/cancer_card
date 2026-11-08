import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration,
} from "drizzle-kit/api";
import { db, sqlite } from "@/db";
import * as schema from "@/db/schema";

// The app's `@/db` module opens the connection from `DATABASE_PATH`, pinned to
// `:memory:` by the vitest config. We build the schema directly from
// `@/db/schema` via drizzle-kit's diff API rather than replaying the committed
// migration history, which contains a broken push_tokens rebuild (migration
// 0002 copies columns the prior table never had). Generating from the live
// schema keeps the test DB aligned with the code under test.

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

// Every user-facing table. Wiped between tests with foreign keys off.
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
