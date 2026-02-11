#!/bin/sh
set -e

DB_PATH="${DATABASE_PATH:-/data/app.db}"

# Apply migrations if the database has no tables (fresh volume)
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" = "0" ]; then
  echo "Empty database detected — applying migrations..."
  for f in /app/drizzle/*.sql; do
    echo "  Applying $(basename "$f")"
    # Split on Drizzle's statement breakpoint marker and execute each statement
    sed 's/--> statement-breakpoint//' "$f" | sqlite3 "$DB_PATH"
  done
  echo "Migrations complete."
else
  echo "Database has $TABLE_COUNT tables — skipping migrations."
fi

exec node server.js
