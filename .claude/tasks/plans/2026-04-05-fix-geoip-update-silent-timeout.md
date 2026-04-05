# Fix: GeoIP Manual Update — Silent Timeout (No Error Feedback)

## Context

The manual "Run GeoIP Update" in the admin UI times out after 30 minutes in staging with **zero progress messages**. The 30-minute timeout is virtual — `api.get_geoip_task_status()` returns "Task timed out after 30 minutes" when a task record stays `pending`/`running` for >30 min.

Zero progress means the ECS task never connected to the database. The chain has a blind spot:
```
API creates pending record → S3 trigger → Lambda → ECS RunTask → container → Secrets Manager → DB connect → set "running"
```
If anything fails between steps 2-6, the task silently times out with no actionable error.

## Approach: S3-Based Status Feedback

Use the existing S3 trigger bucket as a bidirectional communication channel:
- **Forward**: API writes `triggers/{run_id}.json` → Lambda reads it
- **Backward** (new): Lambda writes `triggers/{run_id}.status.json` → API reads it

This works because:
- Trigger Lambda already has S3 read access
- VPC Lambda already has S3 put access (just needs read added)
- S3 gateway endpoint is already in the VPC (free, no NAT needed)
- No auth complexity (unlike calling the API with Cognito tokens)

## Changes

### 1. Reorder `update.py` startup — DB connection first

**File**: `docker/geoip-update/update.py`

Current order causes the blind spot:
```python
account_id, license_key = get_maxmind_credentials()  # ← crashes here = no DB feedback
conninfo = get_db_connection_string()
progress = ProgressLogger(conninfo)
progress.set_status("running")                         # ← too late
```

New order:
```python
conninfo = get_db_connection_string()
progress = ProgressLogger(conninfo)
progress.set_status("running")                         # ← visible ASAP
account_id, license_key = get_maxmind_credentials()    # ← failures now logged to DB
```

Then pass `account_id, license_key` into `_run_update()` instead of fetching there.

This captures failures after the container starts (Secrets Manager for MaxMind, download errors, DB errors). The remaining blind spot (container never starts) is handled by change #2.

### 2. Trigger Lambda writes status file to S3

**File**: `infrastructure/cdk/lib/data-stack.ts` (inline Lambda, ~line 453-498)

After calling `ecs.run_task()`:
- **Success**: Write `triggers/{run_id}.status.json` with `{"task_arn": "...", "status": "started"}`
- **Failure**: Write `triggers/{run_id}.status.json` with `{"status": "failed", "error": "..."}`

Also wrap the entire Lambda handler in try/except so even unexpected errors get written to the status file.

Grant the trigger Lambda write access to the bucket (it currently only has read via `grantRead`):
```typescript
geoipTriggerBucket.grantReadWrite(geoipTriggerFn);
```

### 3. Admin API checks S3 status on pending tasks

**File**: `backend/src/app/routers/admin.py` — modify `get_geoip_task_status`

When the DB shows a task is `pending` (no progress yet):
1. Read `triggers/{run_id}.status.json` from S3
2. If found with `status: "failed"`: update DB record to `failed` with the error message, return updated status
3. If found with `task_arn`: update DB record with `task_arn` (task started, waiting for container to connect to DB)
4. If not found: Lambda hasn't run yet (S3 event delay or Lambda not invoked)

This transforms the blind "30 min timeout" into specific, actionable errors within seconds.

**File**: `backend/src/app/services/geoip_trigger.py` — add `check_geoip_task_status(run_id)` function

Reads the status file from S3 and returns the parsed JSON (or None if not found).

### 4. Grant backend Lambda S3 read access on trigger bucket

**File**: `infrastructure/cdk/lib/app-stack.ts` (line 286)

Change:
```typescript
props.geoipTriggerBucket.grantPut(backendFn);
```
To:
```typescript
props.geoipTriggerBucket.grantReadWrite(backendFn);
```

### 5. Bump CDK migration version

**File**: `infrastructure/cdk/lib/data-stack.ts`

No DB schema changes needed, but bump the `DbMigration` version since we're modifying the Docker image (CDK rebuilds the image asset on deploy).

Actually — the DbMigration version only needs bumping for `database/` file changes. The Docker image is a separate asset that CDK rebuilds automatically when file contents change. **No version bump needed.**

## Files to Modify

| File | Change |
|------|--------|
| `docker/geoip-update/update.py` | Reorder: DB connect → set "running" → fetch MaxMind creds |
| `infrastructure/cdk/lib/data-stack.ts` | Update inline Lambda to write status file; grant Lambda readWrite on bucket |
| `infrastructure/cdk/lib/app-stack.ts` | Change `grantPut` → `grantReadWrite` for backend Lambda |
| `backend/src/app/services/geoip_trigger.py` | Add `check_geoip_task_status(run_id)` function |
| `backend/src/app/routers/admin.py` | Modify `get_geoip_task_status` to check S3 when task is pending |

## Verification

1. **Local test**: Run `update.py` directly against local Docker DB to verify reordered startup works
2. **Deploy to staging**: `cdk deploy MySiteData MySiteApp`
3. **Test happy path**: Trigger manual update, verify progress messages appear in admin UI
4. **Test Lambda failure**: Temporarily break the ECS task def ARN in Lambda env, trigger update, verify error appears quickly (not 30 min timeout)
5. **Test container failure**: Trigger update with invalid MaxMind creds (placeholder values), verify error appears in progress log with specific message (e.g., "401 Unauthorized from MaxMind")
6. Run backend tests: `cd backend && uv run pytest`
7. Run frontend tests: `cd frontend && npx vitest run`
