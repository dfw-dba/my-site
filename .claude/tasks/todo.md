# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 42: Admin Portal Regression Test Suite

### Backend auth changes
- [x] 42.1 Add `REGRESSION_TEST_API_KEY` to `backend/src/app/config.py`
- [x] 42.2 Add `X-Regression-Key` auth path in `backend/src/app/dependencies.py`
- [x] 42.3 Add `X-Regression-Key` to CORS headers in `backend/src/app/middleware/cors.py`

### Infrastructure changes
- [x] 42.4 Add `X-Regression-Key` to API Gateway CORS + staging-only Lambda env var in `app-stack.ts`
- [x] 42.5 Pass `REGRESSION_TEST_API_KEY` secret to staging CDK deploy in `deploy.yml`

### Regression test script
- [x] 42.6 Create `.github/scripts/regression-test-admin.sh` with full admin CRUD tests
- [x] 42.7 Integrate admin regression step into `stage-post-deploy-validation` in `deploy.yml`

### Verification
- [x] 42.8 Backend lint + tests pass (41/41)
- [x] 42.9 CDK TypeScript compiles
- [ ] 42.10 Shellcheck passes on new script (will verify in CI)

---

## Sprint 43: Database Performance Metrics (PR 1 of Observability)

### Infrastructure
- [x] 43.1 Add PG params to RDS parameter group in `data-stack.ts` (pg_stat_statements, auto_explain, track_functions)
- [x] 43.2 Enable `pg_stat_statements` extension in `00_extensions.sql`
- [x] 43.3 Add hourly EventBridge rule for metrics capture in `app-stack.ts`
- [x] 43.4 Bump CDK migration version from "11" to "12" in `data-stack.ts`

### Database tables & functions
- [x] 43.5 Add 6 metric snapshot tables to `02_tables.sql` (metric_snapshots, stat_statements_history, stat_tables_history, stat_indexes_history, stat_functions_history, stat_database_history)
- [x] 43.6 Add `api.capture_db_metrics()` function to `03_functions.sql`
- [x] 43.7 Add query/dashboard functions to `03_functions.sql` (get_db_overview, get_slow_queries, get_plan_instability, get_table_stats, get_index_usage, get_function_stats, purge_metric_snapshots)

### Backend
- [x] 43.8 Extend Lambda handler to dispatch metrics capture events in `lambda_handler.py`
- [x] 43.9 Extend maintenance job to purge old snapshots and VACUUM metric tables
- [x] 43.10 Add DatabaseAPI methods for all metrics functions in `db_functions.py`
- [x] 43.11 Add admin metrics endpoints in `admin.py` (7 endpoints: overview, queries, plan-instability, tables, indexes, functions, manual capture)

### Documentation & verification
- [x] 43.12 Update `README.md` with DB metrics feature documentation
- [x] 43.13 Verification: backend lint + tests pass, CDK TypeScript compiles

---

## Sprint 44: Visitor Analytics (PR 2 of Observability)

### Database
- [x] 44.1 Add `page_views`, `visitor_events`, `geoip_ranges` tables to `02_tables.sql` with indexes and comments
- [x] 44.2 Add analytics functions to `03_functions.sql` (geoip_lookup, insert_page_view, insert_visitor_event, get_analytics_summary, get_analytics_visitors, get_analytics_geo, purge_analytics)

### Backend
- [x] 44.3 Create Pydantic schemas in `schemas/analytics.py` with strict validation and 4KB event_data limit
- [x] 44.4 Create public analytics router `routers/analytics.py` with bot detection and 30/min rate limit
- [x] 44.5 Add admin analytics endpoints to `admin.py` (summary, visitors, geo)
- [x] 44.6 Add DatabaseAPI analytics methods to `db_functions.py`
- [x] 44.7 Register analytics router in `main.py`
- [x] 44.8 Add `/api/analytics/event` to skip paths in logging middleware
- [x] 44.9 Add analytics purge (90d) and VACUUM to lambda maintenance handler

### Frontend
- [x] 44.10 Create analytics tracker service `services/analytics.ts` (fingerprint, session, batching, sendBeacon)
- [x] 44.11 Create `useAnalytics` hook with page view, click, scroll, print, visibility tracking
- [x] 44.12 Wire `useAnalytics()` into `MainLayout.tsx`

### Infrastructure & docs
- [x] 44.13 Bump CDK migration version from "12" to "13" in `data-stack.ts`
- [x] 44.14 Update `README.md` with visitor analytics documentation

### Verification
- [x] 44.15 Backend lint + tests pass (41/41)
- [x] 44.16 Frontend TypeScript + tests pass (25/25)
- [x] 44.17 CDK TypeScript compiles
- [x] 44.18 Security audit: 2 MEDIUM findings fixed (event_data size constraint, listener cleanup)

---

## Sprint 45: Observability Reporting — Admin Dashboard Tabs (PR 1)

### Setup
- [x] 45.1 Install recharts (`cd frontend && npm install recharts`)
- [x] 45.2 Add TypeScript types for metrics and analytics API responses to `types/index.ts`

### API layer
- [x] 45.3 Add metrics + analytics API service methods to `api.ts`
- [x] 45.4 Add TanStack Query hooks to `useAdminApi.ts` (11 hooks: 7 metrics, 4 analytics)

### Dashboard refactor
- [x] 45.5 Extract `StatCard` to `components/admin/dashboard/StatCard.tsx`
- [x] 45.6 Extract all existing Dashboard content to `components/admin/dashboard/LogsTab.tsx`
- [x] 45.7 Refactor `Dashboard.tsx` to thin tab shell (Logs, DB Performance, Visitor Analytics)

### DB Performance tab
- [x] 45.8 Build `DbPerformanceTab.tsx` — overview cards, slow queries table + chart, plan instability, table stats, index usage, function stats, manual capture button

### Visitor Analytics tab
- [x] 45.9 Add `api.get_analytics_timeseries()` function to `03_functions.sql` + migration 006
- [x] 45.10 Add timeseries backend endpoint + DatabaseAPI method
- [x] 45.11 Bump CDK migration version
- [x] 45.12 Build `VisitorAnalyticsTab.tsx` — date filter, overview cards, time series chart, top pages/referrers, device/browser/OS charts, geo table

### Chart wrappers
- [x] 45.13 Create `DonutChart.tsx`, `TimeSeriesChart.tsx`, `HorizontalBarChart.tsx` in `components/admin/charts/`

### Verification
- [x] 45.14 Frontend TypeScript compiles (`npx tsc --noEmit`)
- [x] 45.15 Frontend tests pass (`npx vitest run`) — 25/25
- [x] 45.16 Backend lint + tests pass — 41/41
- [x] 45.17 Security audit: no CRITICAL/HIGH issues; 1 LOW (date param validation)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
