#!/bin/sh

# Ensure the database schema is up-to-date
# This runs on the real persistent database volume
echo "Syncing database schema..."
npx prisma db push --accept-data-loss --skip-generate

# Start the Next.js application
echo "Starting application..."
exec node server.js
