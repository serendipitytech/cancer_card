#!/usr/bin/env node
/*
 * Self-contained, journal-aware SQLite migration runner.
 *
 * Uses ONLY better-sqlite3 (the app's own DB driver, always present in the
 * Next standalone image) plus Node core fs/crypto. It deliberately does NOT
 * depend on drizzle-kit (a devDependency, absent from the production image) or
 * on the drizzle-orm migrator subpath (which Next's file-tracing may not bundle
 * into .next/standalone). That independence is the whole point: the old
 * entrypoint only ran migrations against an empty DB, so production silently
 * drifted behind the schema.
 *
 * Semantics match drizzle-kit's better-sqlite3 migrator so a developer running
 * `npx drizzle-kit migrate` locally stays compatible with what runs in prod:
 *   - tracking table __drizzle_migrations(id, hash, created_at)
 *   - a journal entry is applied iff its `when` (folderMillis) is greater than
 *     the MAX(created_at) already recorded
 *   - each applied migration records (hash = sha256(file), created_at = when)
 *
 * Extra safety for a live PII database:
 *   - a WAL-safe .backup is taken before anything is applied, only when there
 *     are pending migrations
 *   - a one-time BASELINE reconciles the existing production DB, which was
 *     created by the old raw-sqlite loop and therefore has no tracking table
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_PATH || "/data/app.db";
const DRIZZLE_DIR = process.env.DRIZZLE_DIR || path.join(__dirname, "..", "drizzle");
const BREAKPOINT = "--> statement-breakpoint";
const RETAIN_BACKUPS = 5;

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

function readJournal() {
  const journalPath = path.join(DRIZZLE_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  return journal.entries
    .slice()
    .sort((a, b) => a.when - b.when)
    .map((entry) => {
      const raw = fs.readFileSync(path.join(DRIZZLE_DIR, `${entry.tag}.sql`), "utf8");
      const statements = raw
        .split(BREAKPOINT)
        .map((s) => s.trim())
        .filter(Boolean);
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      return { tag: entry.tag, when: entry.when, statements, hash };
    });
}

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

function columnExists(db, table, column) {
  if (!tableExists(db, table)) return false;
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((col) => col.name === column);
}

function ensureTrackingTable(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       hash TEXT NOT NULL,
       created_at NUMERIC
     )`
  );
}

/*
 * One-time reconciliation for the production DB created by the old entrypoint
 * (schema present, no tracking table). We mark as APPLIED every existing
 * migration whose effects are already in the schema, detected by one sentinel
 * per migration. Anything not detected stays pending and is applied normally.
 * Once the tracking table exists, this path is never taken again.
 */
function baselinePreTrackingDb(db, migrations) {
  const sentinels = {
    "0000_large_randall": () => tableExists(db, "users"),
    "0001_nervous_legion": () => tableExists(db, "notification_preferences"),
    // 0002 adds token_type to push_tokens; its presence means 0002 already ran.
    "0002_keen_vapor": () => columnExists(db, "push_tokens", "token_type"),
  };
  const insert = db.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)"
  );
  for (const migration of migrations) {
    const sentinel = sentinels[migration.tag];
    if (sentinel && sentinel()) {
      insert.run(migration.hash, migration.when);
      log(`baseline: ${migration.tag} already present, marked applied`);
    } else if (sentinel) {
      log(`baseline: ${migration.tag} not yet present, will apply`);
    }
  }
}

function backupBeforeMigrate(db) {
  const backupDir = path.join(path.dirname(DB_PATH), "pre-migrate");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `app-${stamp}.db`);
  log(`backing up to ${backupPath} before applying`);
  // Prune older snapshots, keeping the most recent RETAIN_BACKUPS.
  const existing = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .sort();
  for (const old of existing.slice(0, Math.max(0, existing.length - (RETAIN_BACKUPS - 1)))) {
    fs.unlinkSync(path.join(backupDir, old));
  }
  return db.backup(backupPath); // WAL-safe, returns a promise
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 10000");
  // Table rebuilds are safe with FKs disabled at the connection level; the
  // in-migration PRAGMA toggles become harmless no-ops inside the transaction.
  db.pragma("foreign_keys = OFF");

  const migrations = readJournal();
  const hasAppTables = tableExists(db, "users");
  const hasTracking = tableExists(db, "__drizzle_migrations");

  ensureTrackingTable(db);

  if (hasAppTables && !hasTracking) {
    log("pre-tracking database detected, baselining");
    baselinePreTrackingDb(db, migrations);
  }

  const lastApplied = db
    .prepare("SELECT MAX(created_at) AS m FROM __drizzle_migrations")
    .get().m;
  const cutoff = lastApplied == null ? -Infinity : Number(lastApplied);
  const pending = migrations.filter((m) => m.when > cutoff);

  if (pending.length === 0) {
    log("no pending migrations");
    db.close();
    return;
  }

  log(`${pending.length} pending: ${pending.map((m) => m.tag).join(", ")}`);

  if (hasAppTables) {
    await backupBeforeMigrate(db);
  }

  const insert = db.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)"
  );
  const applyAll = db.transaction(() => {
    for (const migration of pending) {
      log(`applying ${migration.tag}`);
      for (const statement of migration.statements) {
        db.exec(statement);
      }
      insert.run(migration.hash, migration.when);
    }
  });
  applyAll();

  log(`applied ${pending.length} migration(s)`);
  db.close();
}

main().catch((err) => {
  console.error(`[migrate] FAILED: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
