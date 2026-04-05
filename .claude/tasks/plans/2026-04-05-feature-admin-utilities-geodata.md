# Admin Utilities Tab with GeoData Section

**Branch**: `feature/admin-utilities-geodata`
**Status**: Planning

## Context

The admin portal currently has Dashboard (with Logs, DB Performance, Visitor Analytics tabs) and Resume pages. The user wants a new "Utilities" sidebar nav item following the same tab pattern, starting with a single "GeoData" tab. The GeoData tab provides visibility into GeoIP update history and the ability to manually trigger updates with real-time progress.

**Key constraint**: Lambda is in a VPC with only S3 (gateway), Secrets Manager, and Cognito IDP endpoints. No ECS or CloudWatch Logs endpoints exist. To keep costs at $0/month, we use an S3 trigger chain for ECS invocation and DB-based progress logging.

## Architecture: S3 Trigger Chain

```
Frontend → POST /api/admin/geoip/trigger
  → VPC Lambda: INSERT task_run (status='pending'), PUT trigger file to S3
    → S3 Event Notification → Trigger Lambda (non-VPC)
      → ECS RunTask (with GEOIP_RUN_ID env override)
        → Docker container: UPDATE status='running', INSERT progress lines to DB
          → On complete: UPDATE status='completed', INSERT into geoip_update_log
Frontend polls: GET /api/admin/geoip/task-status (every 3s when active)
Frontend polls: GET /api/admin/geoip/task-progress?run_id=X (every 2s when running)
```

## Changes

### 1. Database Migration (`009_geoip_task_tracking.sql`)
**File(s):** `database/migrations/009_geoip_task_tracking.sql`

New tables:
- `internal.geoip_task_runs` — tracks manual trigger runs (id, task_arn, status, triggered_by, started_at, completed_at, error_message). Status enum: pending/running/completed/failed. Built-in 30-min timeout: if status='running' and started_at older than 30 min, treat as 'failed'.
- `internal.geoip_task_progress` — log lines per run (id, run_id FK, logged_at, message, level). Index on (run_id, id) for efficient polling.

New functions (in `api` schema, lowercase SQL, returns jsonb):
- `api.get_geoip_update_logs(p_filters jsonb)` — paginated query on `internal.geoip_update_log`. Accepts `limit` (default 10), `offset` (default 0). Returns `{logs: [...], total: N}`.
- `api.get_geoip_task_status()` — returns latest `geoip_task_runs` row as jsonb (or null). Applies 30-min timeout logic in the query.
- `api.create_geoip_task_run(p_data jsonb)` — inserts pending run, returns `{id: N}`.
- `api.update_geoip_task_run(p_data jsonb)` — updates status/completed_at/error_message for a run_id.
- `api.get_geoip_task_progress(p_filters jsonb)` — returns progress lines for `run_id`, optionally after `after_id`. Returns jsonb array.
- `api.insert_geoip_task_progress(p_data jsonb)` — inserts a progress line. Used by Docker container.

### 2. Docker Container Changes
**File(s):** `docker/geoip-update/update.py`

Add `ProgressLogger` class that:
- Reads `GEOIP_RUN_ID` env var (set only for manual triggers)
- If present: opens a **separate** `autocommit=True` DB connection for progress logging (so progress is visible even if main transaction rolls back)
- `log(message, level='info')` — prints to stdout AND (if run_id set) inserts into `geoip_task_progress`
- On start: updates task_run status to 'running'
- On success: updates status to 'completed'
- On failure: updates status to 'failed' with error_message

Replace all `print()` calls in `main()` with `progress.log()`. The container already has psycopg and DB credentials.

### 3. CDK Infrastructure — S3 Trigger Chain
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

New resources in DataStack:
- **S3 trigger bucket**: `mysite-geoip-triggers` (auto-named via CDK). Lifecycle rule: delete objects after 1 day. `removalPolicy: DESTROY, autoDeleteObjects: true`.
- **Trigger Lambda**: Non-VPC Python Lambda (`runtime: PYTHON_3_12`, inline code or bundled). Reads ECS config from its own env vars. On S3 PutObject, reads the trigger file JSON to get `run_id`, calls `ecs:RunTask` with `GEOIP_RUN_ID` container override.
- **S3 event notification**: bucket → trigger Lambda for `s3:ObjectCreated:*` on prefix `triggers/`.
- **IAM for trigger Lambda**: `ecs:RunTask` on task definition ARN, `iam:PassRole` on task role + execution role ARNs, `s3:GetObject` on trigger bucket.

New exports from DataStack:
- `public readonly geoipTriggerBucket: s3.IBucket` — so AppStack can grant VPC Lambda write access

Bump migration version from `"19"` to `"20"`.

### 4. CDK Infrastructure — AppStack Changes
**File(s):** `infrastructure/cdk/lib/app-stack.ts`, `infrastructure/cdk/lib/app-stack.ts` (AppStackProps)

- Add `geoipTriggerBucket` to AppStackProps
- Grant VPC Lambda `s3:PutObject` on the trigger bucket
- Add `GEOIP_TRIGGER_BUCKET` env var to Lambda

### 5. CDK Stack Wiring
**File(s):** `infrastructure/cdk/bin/app.ts`

Pass `geoipTriggerBucket: data.geoipTriggerBucket` to AppStack.

### 6. Backend Config
**File(s):** `backend/src/app/config.py`

Add `GEOIP_TRIGGER_BUCKET: str = ""` to Settings class.

### 7. Backend DatabaseAPI Methods
**File(s):** `backend/src/app/services/db_functions.py`

Add GeoIP section with methods:
- `get_geoip_update_logs(filters)` → calls `api.get_geoip_update_logs`
- `get_geoip_task_status()` → calls `api.get_geoip_task_status`
- `create_geoip_task_run(data)` → calls `api.create_geoip_task_run`
- `get_geoip_task_progress(filters)` → calls `api.get_geoip_task_progress`

All follow existing pattern: `text("select api.func(cast(:param as jsonb))")`.

### 8. Backend S3 Trigger Service
**File(s):** `backend/src/app/services/geoip_trigger.py` (new)

Thin wrapper: `trigger_geoip_update(run_id: int) -> None`
- Uses boto3 S3 client to PUT a JSON file: `s3://bucket/triggers/{run_id}.json` containing `{"run_id": run_id}`
- The S3 gateway endpoint is already available from VPC Lambda

### 9. Backend Admin Endpoints
**File(s):** `backend/src/app/routers/admin.py`

New `# -- GeoIP --` section with 4 endpoints:

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/geoip/logs` | GET | 60/min | Paginated geoip_update_log (limit, offset params) |
| `/geoip/task-status` | GET | 120/min | Latest task run status |
| `/geoip/trigger` | POST | 2/min | Create pending run + write S3 trigger. Returns 409 if already running. |
| `/geoip/task-progress` | GET | 120/min | Progress lines for a run_id, optionally after after_id |

All use `dependencies=[Depends(get_admin_auth)]`.

### 10. Frontend Types
**File(s):** `frontend/src/types/index.ts`

Add interfaces: `GeoipUpdateLog`, `GeoipUpdateLogsResponse`, `GeoipTaskStatus`, `GeoipTaskProgress`, `GeoipTriggerResponse`.

### 11. Frontend API Service
**File(s):** `frontend/src/services/api.ts`

Add `api.admin.geoip` namespace with: `logs()`, `taskStatus()`, `trigger()`, `taskProgress()`.

### 12. Frontend TanStack Query Hooks
**File(s):** `frontend/src/hooks/useAdminApi.ts`

Add hooks:
- `useGeoipUpdateLogs(params)` — standard query
- `useGeoipTaskStatus()` — polls every 3s when status is pending/running, stops when idle
- `useGeoipTrigger()` — mutation, invalidates task-status on success
- `useGeoipTaskProgress(runId)` — polls every 2s when runId is set, fetches all lines for the run

### 13. Frontend Sidebar + Route
**File(s):** `frontend/src/components/admin/AdminSidebar.tsx`, `frontend/src/routes/index.tsx`

- Add "Utilities" to NAV_ITEMS with cog/wrench icon
- Add `<Route path="utilities" element={<Utilities />} />` under admin layout

### 14. Frontend Utilities Page
**File(s):** `frontend/src/pages/admin/Utilities.tsx` (new)

Same pattern as Dashboard.tsx: `type UtilitiesTab = "geodata"`, single tab, renders `<GeoDataTab />`.

### 15. Frontend GeoDataTab Component
**File(s):** `frontend/src/components/admin/utilities/GeoDataTab.tsx` (new)

Layout (top to bottom):
1. **Trigger row**: "Run GeoIP Update" button + status badge (Idle/Running.../Completed/Failed). Button disabled when pending/running. Status uses animated pulse for running state.
2. **Live progress panel** (shown when running): dark monospace scrollable container, auto-scrolls to bottom, displays timestamped progress lines. Stops polling when task completes.
3. **Update history table**: Columns: Date, Status, Networks, Locations, Duration, Last-Modified. Default 10 rows. "Load More" button. Auto-refreshes when task completes (query invalidation). Color-coded status badges.

State management: `useGeoipTaskStatus()` drives whether progress panel is visible. When status transitions from running→completed, invalidate logs query. Track `prevStatus` via `useRef` to detect transitions.

### 16. README.md Updates
**File(s):** `README.md`

- Add GeoIP Trigger Bucket to infrastructure/architecture section
- Add Trigger Lambda to project structure
- Add GEOIP_TRIGGER_BUCKET to env vars table
- Update admin portal description to mention Utilities page

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/migrations/009_geoip_task_tracking.sql` | Create | Tables + functions for task tracking |
| `docker/geoip-update/update.py` | Edit | Add ProgressLogger for DB-based progress |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | S3 trigger bucket, trigger Lambda, exports, migration version bump |
| `infrastructure/cdk/bin/app.ts` | Edit | Pass geoipTriggerBucket to AppStack |
| `infrastructure/cdk/lib/app-stack.ts` | Edit | Accept trigger bucket prop, grant Lambda access, add env var |
| `backend/src/app/config.py` | Edit | Add GEOIP_TRIGGER_BUCKET setting |
| `backend/src/app/services/db_functions.py` | Edit | Add 4 GeoIP DatabaseAPI methods |
| `backend/src/app/services/geoip_trigger.py` | Create | S3 trigger file writer |
| `backend/src/app/routers/admin.py` | Edit | Add 4 GeoIP admin endpoints |
| `frontend/src/types/index.ts` | Edit | Add GeoIP type interfaces |
| `frontend/src/services/api.ts` | Edit | Add api.admin.geoip namespace |
| `frontend/src/hooks/useAdminApi.ts` | Edit | Add 4 GeoIP hooks |
| `frontend/src/components/admin/AdminSidebar.tsx` | Edit | Add Utilities nav item |
| `frontend/src/routes/index.tsx` | Edit | Add /admin/utilities route |
| `frontend/src/pages/admin/Utilities.tsx` | Create | Utilities page with tab system |
| `frontend/src/components/admin/utilities/GeoDataTab.tsx` | Create | Main GeoData UI component |
| `README.md` | Edit | Document new infrastructure + feature |

## Edge Cases & Mitigations

- **Stale "running" status**: `get_geoip_task_status()` applies 30-min timeout — if running > 30 min, returns 'failed'.
- **Double-trigger**: POST endpoint checks for existing pending/running task → 409. Frontend disables button via `mutation.isPending`.
- **Scheduled runs**: Don't set `GEOIP_RUN_ID`, so no progress tracking. They still write to `geoip_update_log` on completion, which appears in the history table.
- **Container crash**: No DB update → status stays 'running' → 30-min timeout → auto-failed.
- **S3 trigger Lambda failure**: Task stays 'pending' → 30-min timeout → auto-failed. User can retry.

## Verification

1. **Local backend tests**: `cd backend && uv run pytest` — verify new endpoints return expected data
2. **Local frontend tests**: `cd frontend && npx vitest run` — verify new components render
3. **Type check**: `cd frontend && npx tsc --noEmit`
4. **Lint**: `cd backend && uv run ruff check && uv run ruff format --check`
5. **Manual local test**: Navigate to `/admin/utilities`, verify GeoData tab shows update history table
6. **E2E after deploy**: Trigger GeoIP update from UI, watch progress panel fill in real-time, verify history table updates on completion
7. **Security**: All endpoints require admin auth, rate-limited, trigger Lambda has least-privilege IAM
