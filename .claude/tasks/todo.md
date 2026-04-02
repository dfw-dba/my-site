# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

---

## Sprint 41: Regression Tests & Deploy Lifecycle Automation

### Regression test script
- [x] 41.1 Create `.github/scripts/regression-test.sh` with 7 tests (health, resume x3, admin auth x2, frontend)
- [x] 41.2 Add regression test steps to `stage-post-deploy-validation` job in `deploy.yml`
- [x] 41.3 Add regression test steps to `post-deploy-validation` job in `deploy.yml`

### Deploy lifecycle automation (git-workflow.md)
- [x] 41.4 Add end-of-cycle cleanup to Prod Deploy Gate (dependabot check, switch to main)
- [x] 41.5 Update Dependabot section with CI/deploy monitoring after merge
- [x] 41.6 Add Session Start Checks section (release-please, dependabot, stale branch detection)

### Verification
- [x] 41.7 Verify YAML syntax and job flow logic
- [x] 41.8 Read through full git-workflow.md for end-to-end lifecycle coverage

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

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
