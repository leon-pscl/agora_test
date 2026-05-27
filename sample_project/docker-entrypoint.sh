#!/bin/sh
set -e

mkdir -p /app/data
export DATABASE_URL="${DATABASE_URL:-file:/app/data/dev.db}"

cd /app

echo "Applying database schema..."
pnpm exec prisma db push

echo "Seeding default landlord data (if needed)..."
pnpm exec prisma db seed || true

echo "Starting application..."
exec "$@"
