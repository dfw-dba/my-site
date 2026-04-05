# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 48: CDK-managed MaxMind Secret

### Rules
- [x] 48.1 Add CDK-managed secrets rule + style examples + verification to `aws-cdk.md`

### Infrastructure
- [x] 48.2 Replace `fromSecretNameV2` with `new Secret()` in `data-stack.ts`

### Documentation
- [x] 48.3 Update README GeoIP prerequisites (create-secret → put-secret-value)

### Verification
- [x] 48.4 CDK TypeScript compiles (`npx tsc --noEmit`)
- [x] 48.5 No `fromSecretNameV2` references in infrastructure/
- [x] 48.6 Security audit: no CRITICAL/HIGH/MEDIUM; 1 LOW (placeholder empty strings — expected)

---

## Sprint 49: Fix MaxMind Download Redirect

### Implementation
- [x] 49.1 Add `_NoAuthRedirectHandler` class that strips Authorization on redirect
- [x] 49.2 Extract `_maxmind_auth_header()` helper to deduplicate auth logic
- [x] 49.3 Update `check_last_modified()` to use opener + auth helper
- [x] 49.4 Update `download_and_extract()` to use opener + auth helper
- [x] 49.5 Move `urllib.request` and `base64` to top-level imports

### Verification
- [x] 49.6 Python syntax check passes
- [x] 49.7 Docker image builds successfully

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

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
