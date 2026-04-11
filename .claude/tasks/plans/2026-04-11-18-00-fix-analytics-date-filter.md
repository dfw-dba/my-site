# Fix Analytics Date Filter + Timezone Support

**Branch**: `fix/analytics-date-filter`
**Status**: In Progress

## Context

The "To" date filter on Visitor Analytics (both public and admin) excludes visits that occurred during the selected end date. The backend casts date strings to midnight UTC and uses `BETWEEN`, excluding everything after midnight. Additionally, `toISOString().slice(0,10)` produces UTC dates, causing wrong defaults near midnight in non-UTC timezones.

## Changes

### 1. Fix date range logic in all 4 analytics database functions
**File(s):** `database/init/03_functions.sql`

- Add `v_tz text` variable, parse from `p_filters->>'timezone'` (default `'UTC'`)
- Use timezone-aware date-to-timestamptz conversion
- Replace all 15 `BETWEEN` clauses with `>= v_start AND < v_end` (half-open range)
- Fix timeseries grouping to use `date(created_at at time zone v_tz)`

### 2. Add `timezone` to AnalyticsFilters type
**File(s):** `frontend/src/types/index.ts`

### 3. Fix default date range and add timezone to params
**File(s):** `frontend/src/pages/Analytics.tsx`, `frontend/src/components/admin/dashboard/VisitorAnalyticsTab.tsx`

- Replace `toISOString().slice(0, 10)` with local-date formatter
- Add `timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` to params

### 4. Accept timezone parameter in backend endpoints
**File(s):** `backend/src/app/routers/analytics.py`, `backend/src/app/routers/admin.py`

### 5. Bump CDK migration version
**File(s):** `infrastructure/cdk/lib/data-stack.ts` — version 23 -> 24

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/init/03_functions.sql` | Edit | Fix date range + timezone in 4 functions |
| `frontend/src/types/index.ts` | Edit | Add `timezone` to `AnalyticsFilters` |
| `frontend/src/pages/Analytics.tsx` | Edit | Local date default + send timezone |
| `frontend/src/components/admin/dashboard/VisitorAnalyticsTab.tsx` | Edit | Local date default + send timezone |
| `backend/src/app/routers/analytics.py` | Edit | Accept/pass timezone in public endpoints |
| `backend/src/app/routers/admin.py` | Edit | Accept/pass timezone in admin endpoints |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Bump migration version 23 -> 24 |

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check`
2. `cd backend && uv run pytest`
3. `cd frontend && npx tsc --noEmit`
4. `cd frontend && npx vitest run`
5. Post-deploy: curl analytics endpoints with timezone param
