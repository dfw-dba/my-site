#!/usr/bin/env bash
set -euo pipefail

# dev.sh — Start the local development environment.
#
# Usage:
#   ./dev.sh              Start services (no seed data)
#   ./dev.sh --seed       Start services and load sample seed data
#   SEED_DATA=true ./dev.sh   Same as --seed
#
# The seed script is idempotent — it only inserts data when tables are empty,
# so running --seed multiple times is safe.

SEED_DATA="${SEED_DATA:-false}"

for arg in "$@"; do
  case "$arg" in
    --seed) SEED_DATA=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# Source .env for POSTGRES_* vars used by psql
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

PGUSER="${POSTGRES_USER:-mysite}"
PGPASSWORD="${POSTGRES_PASSWORD:-localdev}"
PGDB="${POSTGRES_DB:-mysite}"

echo "Starting services..."
docker compose up -d

if [[ "$SEED_DATA" == "true" ]]; then
  echo "Waiting for database to be healthy..."
  until docker compose exec -T db pg_isready -U "$PGUSER" -d "$PGDB" > /dev/null 2>&1; do
    sleep 1
  done

  echo "Loading seed data..."
  docker compose exec -T db psql -U "$PGUSER" -d "$PGDB" < database/seed/05_seed_data.sql
  echo "Seed data loaded."
fi

echo "Development environment is running."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Database: localhost:5432"
