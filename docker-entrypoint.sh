#!/bin/sh
set -e

# Apply any pending database migrations before starting the server.
# The runner is journal-aware and idempotent: it backs up the DB (WAL-safe)
# before applying, tracks applied migrations in __drizzle_migrations, and is a
# no-op when the schema is already current. This replaces the old "migrate only
# on an empty database" logic, which let production silently drift behind the
# schema.
echo "Running database migrations..."
node /app/scripts/migrate.cjs

echo "Starting server..."
exec node server.js
