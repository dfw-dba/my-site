# Fix: Database Migration System & LinkedIn URL Deploy Failure

## Context

CloudFormation stack `MySiteData` failed because bumping migration version to `"6"` re-ran init scripts, and `02_tables.sql` tried to `COMMENT ON COLUMN internal.resume_recommendations.linkedin_url` — a column that doesn't exist in the prod table (CREATE TABLE IF NOT EXISTS is a no-op on existing tables).

## Changes

| File | Change |
|------|--------|
| `database/init/02_tables.sql` | Add `ALTER TABLE ADD COLUMN IF NOT EXISTS` for linkedin_url |
| `database/init/02a_schema_migrations.sql` | **New** — migration tracking table |
| `database/migrations/000_seed_existing_migrations.sql` | **New** — seed pre-existing migrations |
| `infrastructure/cdk/lib/migration-handler/index.py` | Add Phase 2: migration execution with tracking |
| `infrastructure/cdk/lib/data-stack.ts` | Bundle migrations dir, bump version to "7" |

## Status: IMPLEMENTED
