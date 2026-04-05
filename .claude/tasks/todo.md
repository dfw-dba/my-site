# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 50: Admin Utilities Tab — GeoData

### Database
- [x] 50.1 Create migration `009_geoip_task_tracking.sql` (task_runs table, task_progress table, 6 API functions)

### Docker
- [x] 50.2 Add `ProgressLogger` to `docker/geoip-update/update.py` (DB-based progress + status tracking)

### Infrastructure
- [x] 50.3 Add S3 trigger bucket, trigger Lambda, S3 notification, IAM to `data-stack.ts`
- [x] 50.4 Export `geoipTriggerBucket` from DataStack, wire through `app.ts` to AppStack
- [x] 50.5 Add `GEOIP_TRIGGER_BUCKET` env var + S3 write grant to Lambda in `app-stack.ts`
- [x] 50.6 Bump CDK migration version 19 → 20

### Backend
- [x] 50.7 Add `GEOIP_TRIGGER_BUCKET` to `config.py`
- [x] 50.8 Add 4 GeoIP methods to `db_functions.py`
- [x] 50.9 Create `services/geoip_trigger.py` (S3 trigger writer)
- [x] 50.10 Add 4 GeoIP endpoints to `admin.py`

### Frontend
- [x] 50.11 Add GeoIP types to `types/index.ts`
- [x] 50.12 Add `api.admin.geoip` namespace to `api.ts`
- [x] 50.13 Add 4 GeoIP hooks to `useAdminApi.ts`
- [x] 50.14 Add Utilities nav item to `AdminSidebar.tsx` + route to `routes/index.tsx`
- [x] 50.15 Create `pages/admin/Utilities.tsx` (tab page)
- [x] 50.16 Create `components/admin/utilities/GeoDataTab.tsx` (main component)

### Documentation & Verification
- [x] 50.17 Update `README.md` (trigger bucket, trigger Lambda, env var, admin features)
- [x] 50.18 Backend lint + tests pass (41/41)
- [x] 50.19 Frontend type check + tests pass (25/25)
- [x] 50.20 Security audit (no issues found)

---

## Sprint 51: Fix GeoIP Silent Timeout — S3 Status Feedback

### Docker
- [x] 51.1 Reorder `update.py` startup: DB connect → set "running" → fetch MaxMind creds

### Infrastructure
- [x] 51.2 Update trigger Lambda to write `status.json` to S3 (success/failure)
- [x] 51.3 Grant trigger Lambda readWrite on trigger bucket (was read-only)
- [x] 51.4 Grant backend Lambda readWrite on trigger bucket (was put-only)

### Backend
- [x] 51.5 Add `check_geoip_trigger_status(run_id)` to `geoip_trigger.py`
- [x] 51.6 Modify `get_geoip_task_status` endpoint to check S3 when task is pending

### Verification
- [x] 51.7 Backend lint + tests pass (41/41)
- [x] 51.8 CDK TypeScript compiles
- [x] 51.9 Security audit (no CRITICAL/HIGH; 2 MEDIUM — error message sanitization, admin-only access mitigates)

---

## Sprint 52: GeoIP Log Run Tracking

### Implementation
- [x] 52.1 Create migration `010_geoip_log_run_tracking.sql` (add run_id + last_message columns, recreate query function)
- [x] 52.2 Track `last_message` in `ProgressLogger`, include both columns in INSERT (`update.py`)
- [x] 52.3 Update `GeoipUpdateLog` TypeScript type with new nullable fields
- [x] 52.4 Add Run and Last Message columns to Update History table (`GeoDataTab.tsx`)
- [x] 52.5 Bump CDK migration version 20 → 21

### Verification
- [x] 52.6 Backend lint + tests pass (41/41)
- [x] 52.7 Frontend type check + tests pass (25/25)
- [x] 52.8 CDK TypeScript compiles

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
