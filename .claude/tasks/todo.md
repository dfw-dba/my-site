# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 53: GeoIP Table Consolidation + Schedule Management

### Database
- [x] 53.1 Create migration `011_consolidate_geoip_tables.sql`
  - New sequence `internal.geoip_run_id_seq`
  - New table `internal.geoip_update_log_v2` (consolidated append-only log)
  - New table `internal.geoip_schedule`
  - Data migration from 3 old tables
  - Drop old functions and old tables
  - Rename v2 table to `geoip_update_log`
  - 8 new SQL functions (create_geoip_run, update_geoip_run, insert_geoip_run_progress, get_geoip_run_progress, get_geoip_run_status, get_geoip_run_history, get_geoip_schedule, update_geoip_schedule)

### Docker
- [x] 53.2 Update `docker/geoip-update/update.py` — ProgressLogger always creates runs, scheduled runs get progress tracking, use new function names

### Backend
- [x] 53.3 Update `backend/src/app/services/db_functions.py` — rename methods, add schedule methods
- [x] 53.4 Update `backend/src/app/routers/admin.py` — rename calls, add GET/PUT /geoip/schedule endpoints
- [x] 53.5 Update `backend/src/app/services/geoip_trigger.py` — add `trigger_schedule_update()`

### Infrastructure
- [x] 53.6 Update `infrastructure/cdk/lib/data-stack.ts`
  - Remove hardcoded EventBridge rule
  - Create explicit ECS events role
  - Create schedule manager Lambda (non-VPC)
  - Create custom resource for initial rule
  - Add S3 notification for schedule/ prefix
  - Bump migration version 21 → 22

### Frontend
- [x] 53.7 Update `frontend/src/types/index.ts` — replace GeoIP types
- [x] 53.8 Update `frontend/src/services/api.ts` — update geoip methods, add schedule endpoints
- [x] 53.9 Update `frontend/src/hooks/useAdminApi.ts` — update hooks, add schedule hooks
- [x] 53.10 Update `frontend/src/components/admin/utilities/GeoDataTab.tsx` — schedule section with day/time picker, unified task output, updated history table

### Documentation & Verification
- [x] 53.11 Update README.md (schedule management, consolidated tracking)
- [x] 53.12 Backend lint + tests pass (41/41)
- [x] 53.13 Frontend type check + tests pass (25/25)
- [x] 53.14 CDK TypeScript compiles
- [x] 53.15 Security audit (MEDIUM: cron validation — fixed with Pydantic schema; no CRITICAL/HIGH)

---

## Sprint 54: Database Insights Advanced + Feature Toggle System

### Config
- [x] 54.1 Create `infrastructure/cdk/config/features.json` with staging/production sections
- [x] 54.2 Update `infrastructure/cdk/config/index.ts` — add features loader and interfaces

### Infrastructure
- [x] 54.3 Update `infrastructure/cdk/lib/data-stack.ts` — conditional Database Insights Advanced on RDS
- [x] 54.4 Create `.github/workflows/toggle-features.yml` — lightweight feature toggle deploy workflow

### Documentation & Verification
- [x] 54.5 Update README.md (feature toggles, new workflow, cost update)
- [x] 54.6 CDK synth verification (toggle on/off, staging/prod isolation)
- [x] 54.7 Security audit (no CRITICAL/HIGH; 2 LOW — runtime type validation on JSON, direct-to-prod access by design)

---

## Sprint 55: Analytics Interactive Filtering + New Metrics

### Database
- [x] 55.1 Add dimensional filter variables + WHERE clauses to all 4 analytics functions in `03_functions.sql`
- [x] 55.2 Add avg_session_duration to `get_analytics_visitors` session_stats sub-query
- [x] 55.3 Add avg_scroll_depth to `get_analytics_visitors` (new sub-query against visitor_events)
- [x] 55.4 Bump CDK migration version 22 → 23

### Backend
- [x] 55.5 Add 6 filter query params to all 4 analytics endpoints in `admin.py`

### Frontend
- [x] 55.6 Add `AnalyticsFilters` type + update `AnalyticsVisitors` in `types/index.ts`
- [x] 55.7 Refactor API methods in `api.ts` to use generic filter params
- [x] 55.8 Update hooks in `useAdminApi.ts` to accept `AnalyticsFilters`
- [x] 55.9 Add `onSegmentClick`/`activeSegment` to `DonutChart.tsx`
- [x] 55.10 Add `onBarClick`/`activeBar` to `HorizontalBarChart.tsx`
- [x] 55.11 Wire filter state, new StatCards, active filters bar, chart/table click handlers in `VisitorAnalyticsTab.tsx`

### Verification
- [x] 55.12 Backend lint + tests pass (41/41)
- [x] 55.13 Frontend type check + tests pass (25/25)
- [x] 55.14 Security audit (no CRITICAL/HIGH; 1 LOW — max-length on filter params, mitigated by admin-only + rate limit)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
