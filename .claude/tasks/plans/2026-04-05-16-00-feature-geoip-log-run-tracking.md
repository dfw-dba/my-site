# Add run_id and last_message to GeoIP Update History

**Branch**: `feature/geoip-log-run-tracking`
**Status**: Planning

## Context

The Update History table (`internal.geoip_update_log`) only shows row counts, duration, and status — it has no link to task runs or progress messages. Manual runs tracked in `geoip_task_runs`/`geoip_task_progress` are invisible in the history view. Adding `run_id` and `last_message` columns connects the dots so admins can see which task run produced each log entry and what its final status message was.

## Changes

### 1. New migration: add columns and update query function
**File:** `database/migrations/010_geoip_log_run_tracking.sql` (create)

- `alter table` to add `run_id int4 references internal.geoip_task_runs(id)` (nullable — scheduled runs have no task run) and `last_message text` (nullable)
- Column comments explaining nullability
- Recreate `api.get_geoip_update_logs()` to include `run_id` and `last_message` in the select list

### 2. Populate new columns from Docker container
**File:** `docker/geoip-update/update.py`

- Add `self.last_message = None` to `ProgressLogger.__init__` (line ~91)
- Set `self.last_message = message` in `ProgressLogger.log()` (line ~97)
- Update the INSERT at lines 381-386 to include `run_id` and `last_message`:
  - `run_id`: `int(progress.run_id) if progress.run_id else None`
  - `last_message`: `progress.last_message`

### 3. Update TypeScript types
**File:** `frontend/src/types/index.ts`

- Add `run_id: number | null` and `last_message: string | null` to `GeoipUpdateLog` interface

### 4. Update Update History table UI
**File:** `frontend/src/components/admin/utilities/GeoDataTab.tsx`

- Add "Run" and "Last Message" columns to table header and body
- Run column shows numeric run_id or dash for scheduled runs
- Last Message column shows truncated text with title tooltip

### 5. Bump CDK migration version
**File:** `infrastructure/cdk/lib/data-stack.ts` (line 164)

- Change `version: "20"` to `version: "21"`

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/migrations/010_geoip_log_run_tracking.sql` | Create | ALTER TABLE + recreate query function |
| `docker/geoip-update/update.py` | Edit | Track last_message in ProgressLogger, include both in INSERT |
| `frontend/src/types/index.ts` | Edit | Add run_id and last_message to GeoipUpdateLog |
| `frontend/src/components/admin/utilities/GeoDataTab.tsx` | Edit | Add two columns to Update History table |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Bump migration version to "21" |

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check` — lint passes
2. `cd frontend && npx tsc --noEmit` — type check passes
3. `cd frontend && npx vitest run` — tests pass
4. `cd backend && uv run pytest` — tests pass
5. Post-deploy: verify `/api/admin/geoip/logs` response includes `run_id` and `last_message` fields
6. Post-deploy: trigger a manual GeoIP update and verify the new log entry has `run_id` populated
