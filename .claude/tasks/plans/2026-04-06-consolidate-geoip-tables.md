# GeoIP Table Consolidation + Schedule Management

## Context

The GeoIP update tracking is spread across three tables (`geoip_task_runs`, `geoip_task_progress`, `geoip_update_log`) with different behaviors for manual vs scheduled runs. Scheduled runs don't create task_runs entries and have no progress tracking. The goal is to:

1. Consolidate into one append-only log table
2. Make scheduled runs produce progress entries (visible in Task Output)
3. Show Update History from the latest entry per run
4. Add a day/time picker UI to view and change the EventBridge refresh schedule
5. Remove the hardcoded EventBridge schedule from CDK so deploys don't overwrite runtime changes

---

## 1. Database Migration (`database/migrations/011_consolidate_geoip_tables.sql`)

### New sequence + table

```sql
create sequence internal.geoip_run_id_seq;

create table internal.geoip_update_log_v2 (
  id              int4        generated always as identity primary key,
  run_id          int4        not null,
  logged_at       timestamptz not null default now(),
  message         text,
  level           text        not null default 'info',
  status          text,           -- null for progress lines; set for lifecycle events
  triggered_by    text,           -- 'manual' | 'scheduled'; set on lifecycle entries
  task_arn        text,
  error_message   text,
  network_rows    int4,
  location_rows   int4,
  duration_ms     int4,
  last_modified   text
);

create index idx_geoip_update_log_v2_run on internal.geoip_update_log_v2(run_id, id);
create index idx_geoip_update_log_v2_status on internal.geoip_update_log_v2(run_id desc, id desc) where status is not null;
```

### Schedule table

```sql
create table internal.geoip_schedule (
  id              int4        generated always as identity primary key,
  cron_expression text        not null default 'cron(0 6 ? * WED,SAT *)',
  description     text        not null default 'Wednesday, Saturday at 06:00 UTC',
  updated_at      timestamptz not null default now(),
  updated_by      text        not null default 'system'
);
-- Seed with current schedule
insert into internal.geoip_schedule (cron_expression, description, updated_by)
values ('cron(0 6 ? * WED,SAT *)', 'Wednesday, Saturday at 06:00 UTC', 'system');
```

### Data migration

- Migrate `geoip_task_runs` + `geoip_task_progress` + `geoip_update_log` data into `geoip_update_log_v2`
- For each `geoip_task_runs` row: insert a lifecycle entry (status, triggered_by, started_at, etc.)
- For each `geoip_task_progress` row: insert a progress entry (run_id, message, level)
- For `geoip_update_log` entries with `run_id`: insert a completion entry merged with run data
- For `geoip_update_log` entries without `run_id` (scheduled): assign new run_id from sequence, insert lifecycle + completion entry
- Set sequence to `max(run_id) + 1`

### Drop old objects

- Drop old functions: `api.get_geoip_update_logs`, `api.get_geoip_task_status`, `api.create_geoip_task_run`, `api.update_geoip_task_run`, `api.get_geoip_task_progress`, `api.insert_geoip_task_progress`
- Drop old tables: `geoip_task_progress`, `geoip_task_runs`, `geoip_update_log`
- Rename `geoip_update_log_v2` to `geoip_update_log`

### New SQL functions

| Function | Purpose |
|----------|---------|
| `api.create_geoip_run(p_data)` | Insert a pending lifecycle entry, return `{run_id}` |
| `api.update_geoip_run(p_data)` | Insert a new lifecycle entry (status change, completion stats) |
| `api.insert_geoip_run_progress(p_data)` | Insert a progress entry |
| `api.get_geoip_run_progress(p_filters)` | Get progress entries for a run (cursor-based) |
| `api.get_geoip_run_status()` | Latest lifecycle entry for the most recent run (with 30-min timeout) |
| `api.get_geoip_run_history(p_filters)` | Paginated history: latest lifecycle entry per run + started_at from first entry |
| `api.get_geoip_schedule()` | Return current schedule row |
| `api.update_geoip_schedule(p_data)` | Update schedule, return new row |

### Key query patterns

**History (latest lifecycle entry per run):**
```sql
select distinct on (run_id) ... from internal.geoip_update_log
where status is not null order by run_id desc, id desc
```
Join with first entry per run to get `started_at`.

**Task output:** `WHERE run_id = X ORDER BY id`

**Current status:** Same as history but `LIMIT 1`

---

## 2. Docker Update Script (`docker/geoip-update/update.py`)

### ProgressLogger changes

- **Always open a DB connection** (remove the `if self.run_id` guard)
- If `GEOIP_RUN_ID` env var is set, use it. Otherwise call `api.create_geoip_run('{"triggered_by": "scheduled"}')` to get a new `run_id`. This means scheduled runs now have progress tracking.
- `log()` always writes to DB via `api.insert_geoip_run_progress()`
- `set_status()` always writes via `api.update_geoip_run()`
- Store `triggered_by` on the logger so completion entries carry it

### Completion logging

Replace raw `INSERT INTO internal.geoip_update_log` with `api.update_geoip_run()` passing `status='completed'`, `triggered_by`, `network_rows`, `location_rows`, `duration_ms`, `last_modified`.

### `should_skip()` update

Query `internal.geoip_update_log` (new table) for latest successful `last_modified`:
```sql
select last_modified from internal.geoip_update_log
where status = 'success' order by id desc limit 1
```

---

## 3. Backend API

### `backend/src/app/services/db_functions.py`

Rename methods to match new function names:
- `get_geoip_update_logs` → `get_geoip_run_history` → calls `api.get_geoip_run_history`
- `get_geoip_task_status` → `get_geoip_run_status` → calls `api.get_geoip_run_status`
- `create_geoip_task_run` → `create_geoip_run` → calls `api.create_geoip_run`
- `update_geoip_task_run` → `update_geoip_run` → calls `api.update_geoip_run`
- `get_geoip_task_progress` → `get_geoip_run_progress` → calls `api.get_geoip_run_progress`

Add: `get_geoip_schedule()`, `update_geoip_schedule(data)`

### `backend/src/app/routers/admin.py`

Update existing endpoints to call renamed methods. Add:
- `GET /geoip/schedule` — returns current schedule
- `PUT /geoip/schedule` — validates input, updates DB, writes S3 trigger file (`schedule/{timestamp}.json`) to invoke the schedule manager Lambda

### `backend/src/app/services/geoip_trigger.py`

Add `trigger_schedule_update(cron_expression: str)` — writes `schedule/*.json` to S3 trigger bucket.

---

## 4. CDK Infrastructure (`infrastructure/cdk/lib/data-stack.ts`)

### Remove native EventBridge rule

Delete the `events.Rule(this, "GeoipScheduleRule", ...)` construct.

### Create explicit ECS events role

CDK previously created this automatically via `targets.EcsTask`. Now create explicitly:
```typescript
const geoipEventsRole = new iam.Role(this, "GeoipEventsRole", {
  assumedBy: new iam.ServicePrincipal("events.amazonaws.com"),
});
geoipEventsRole.addToPolicy(/* ecs:RunTask, iam:PassRole for task role */);
```

### Schedule Manager Lambda (non-VPC)

New Lambda that handles both schedule updates and initial rule creation:
- Env vars: rule name, cluster ARN, task def ARN, subnets, security group, ECS events role ARN, task execution role ARN
- Permissions: `events:PutRule`, `events:PutTargets`, `events:DescribeRule`, `events:RemoveTargets`, `iam:PassRole`
- Handles two invocation modes:
  1. **Custom Resource** (on deploy): ensures the EventBridge rule exists with the schedule from the event properties (default schedule on first deploy)
  2. **S3 notification** (`schedule/` prefix): reads new cron from the S3 file, calls `PutRule` to update

### Custom Resource

Calls the schedule manager Lambda on every deploy with the default schedule as a property. The Lambda only creates the rule if it doesn't exist (idempotent).

### S3 notification wiring

Add `schedule/` prefix notification on the existing trigger bucket → schedule manager Lambda.

### Extend existing trigger Lambda

Add the `schedule/` prefix S3 notification to the existing `GeoipTriggerFn` (or create a separate Lambda if cleaner). Actually, a separate Lambda is cleaner since it needs different IAM permissions.

### Bump migration version

`version: "21"` → `version: "22"`

---

## 5. Frontend

### Types (`frontend/src/types/index.ts`)

Replace GeoIP types:
```typescript
GeoipRunSummary {
  run_id, status, triggered_by, started_at, completed_at, error_message,
  task_arn, network_rows?, location_rows?, duration_ms?, last_modified?, last_message?
}
GeoipRunHistoryResponse { runs: GeoipRunSummary[], total: number }
GeoipRunProgress { id, logged_at, message, level }
GeoipSchedule { cron_expression, description, updated_at, updated_by }
```

### API service (`frontend/src/services/api.ts`)

Update geoip methods for renamed endpoints. Add `schedule()` and `updateSchedule()`.

### Hooks (`frontend/src/hooks/useAdminApi.ts`)

Update hook internals. Add `useGeoipSchedule()` and `useUpdateGeoipSchedule()`.

### GeoDataTab (`frontend/src/components/admin/utilities/GeoDataTab.tsx`)

1. **Schedule section (new)** — Card showing current schedule with day/time picker:
   - 7 day-of-week checkboxes (Mon–Sun)
   - Hour dropdown (00:00–23:00 UTC)
   - Save button that calls `updateSchedule` mutation
   - Shows last updated timestamp and who changed it

2. **Trigger section** — Unchanged (shows latest run status with "Manual"/"Scheduled" badge)

3. **Task Output** — Now shows progress for ANY active run (manual or scheduled), since scheduled runs now create run entries too

4. **Update History** — Uses `GeoipRunSummary` type. Columns: Date, Trigger (manual/scheduled), Status, Networks, Locations, Duration, Last-Modified. Remove "Run" and "Last Message" columns (run_id is implicit, last_message becomes the summary row's message).

---

## 6. Verification

- [ ] Run backend tests: `cd backend && uv run pytest`
- [ ] Run frontend tests: `cd frontend && npx vitest run`
- [ ] Type check frontend: `cd frontend && npx tsc --noEmit`
- [ ] Lint: `cd backend && uv run ruff check && uv run ruff format --check`
- [ ] Local Docker test: run `update.py` without `GEOIP_RUN_ID` to verify scheduled path creates its own run
- [ ] Verify history query returns correct data with migrated rows
- [ ] Verify schedule GET/PUT endpoints work
- [ ] Verify CDK synth succeeds with schedule manager Lambda
