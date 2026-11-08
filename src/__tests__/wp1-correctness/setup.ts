import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { webcrypto } from "crypto";

// The Drizzle schema derives default ids from the global `crypto`, which exists
// in the Next runtime but not in the bare vitest node environment.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

// A route handler transitively imports `@/db`, which opens the SQLite file named
// by DATABASE_PATH at module-eval time. This setup file runs before the test
// module is imported, so pointing DATABASE_PATH at a throwaway temp DB here keeps
// the suite off any real data. Guarded so repeated setup imports in one worker
// reuse the same file.
if (!process.env.DATABASE_PATH) {
  const dir = mkdtempSync(join(tmpdir(), "cancer-card-test-"));
  process.env.DATABASE_PATH = join(dir, "test.db");
}

// Create the tables the task/auction routes touch. We build the schema directly
// rather than running the committed migration chain: migration 0002_keen_vapor
// rebuilds push_tokens with SQL that fails on a fresh DB (a known landmine,
// tracked for the E0 cutover), and these routes never touch push_tokens anyway.
// WP2 owns the full scaffold; this is the minimal WP1-scoped DDL.
const { sqlite } = await import("@/db");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    has_seen_tour INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS crews (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    card_holder_id TEXT NOT NULL REFERENCES users(id),
    point_balance INTEGER NOT NULL DEFAULT 500,
    invite_code TEXT NOT NULL UNIQUE,
    settings TEXT DEFAULT '{"defaultPoints":500,"allowNegativeBalance":true}',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS crew_members (
    id TEXT PRIMARY KEY NOT NULL,
    crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    stats TEXT DEFAULT '{"tasksCompleted":0,"pointsSpent":0,"auctionWins":0,"totalResponseTimeMs":0,"responseCount":0,"currentStreak":0,"longestStreak":0}',
    badges TEXT DEFAULT '[]',
    joined_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS crew_member_unique ON crew_members (crew_id, user_id);

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    point_cost INTEGER NOT NULL,
    request_mode TEXT NOT NULL,
    assigned_to TEXT REFERENCES users(id),
    claimed_by TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    urgency TEXT NOT NULL DEFAULT 'whenever',
    due_by INTEGER,
    auction_settings TEXT,
    final_point_cost INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    bid_amount INTEGER NOT NULL,
    comment TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS activity_feed (
    id TEXT PRIMARY KEY NOT NULL,
    crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_id TEXT NOT NULL REFERENCES users(id),
    data TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
