#!/bin/sh
set -e

echo "=== NAUDEA Pricing Startup ==="

# Make sure the data directory exists and is writable
mkdir -p /app/data

# Ensure the database schema is up-to-date against the mounted NAS volume
echo "Syncing database schema..."
npx prisma db push --accept-data-loss --skip-generate
echo "Database ready."

# Start the Next.js application
echo "Starting application on port $PORT..."
exec node server.js
