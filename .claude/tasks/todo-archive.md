# Implementation Tracker — Archive

_Completed sprints moved from `todo.md`. For current work, see `todo.md`._

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

## Sprint 47: Automated GeoLite2 Data Refresh

### Database
- [x] 47.1 Create migration `007_geoip_refresh.sql` (staging schema, tables, swap function, update log)

### Docker
- [x] 47.2 Create `docker/geoip-update/Dockerfile` (Python 3.12-slim with psycopg + boto3)
- [x] 47.3 Create `docker/geoip-update/update.py` (download, COPY, atomic swap script)

### Infrastructure
- [x] 47.4 Add ECS cluster, task definition, security group, EventBridge rule, log group to `data-stack.ts`
- [x] 47.5 Bump CDK migration version 16 → 17 in `data-stack.ts`

### Documentation
- [x] 47.6 Update README.md (architecture diagram, cost estimate, GeoIP section, project structure)

### Verification
- [x] 47.7 CDK TypeScript compiles
- [x] 47.8 Backend lint + tests pass (41/41)
- [x] 47.9 Security audit: 4 MEDIUM + 1 LOW fixed (zip-slip, SQL identifiers, root container, unpinned deps, search_path)

---

## Sprint 46: Refactor GeoIP to MaxMind Recommended Schema

### Database
- [x] 46.1 Replace `geoip_ranges` with `geoip2_networks` + `geoip2_locations` tables in `02_tables.sql`
- [x] 46.2 Create migration `002_drop_geoip_ranges.sql` to drop old table
- [x] 46.3 Rewrite `api.geoip_lookup` to use cidr containment join in `03_functions.sql`
- [x] 46.4 Update `insert_page_view` comment in `03_functions.sql`

### Infrastructure
- [x] 46.5 Bump CDK migration version 15 → 16 in `data-stack.ts`

### Documentation
- [x] 46.6 Update README GeoIP Setup section with new table names and `\copy` commands

### Verification
- [x] 46.7 Backend lint + tests pass (41/41)
- [x] 46.8 CDK TypeScript compiles

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

## Sprint 1: Project Scaffolding & Local Dev Environment
- [x] 1.1 Create directory structure & .gitignore
- [x] 1.2 Config files (site.example.json, .env.example)
- [x] 1.3 Frontend scaffolding (React 19 + Vite + Tailwind + PWA)
- [x] 1.4 Backend scaffolding (FastAPI + SQLAlchemy + asyncpg via uv)
- [x] 1.5 Database init SQL scripts
- [x] 1.6 Docker files (backend, frontend) + docker-compose.yml
- [x] 1.7 GitHub Actions (ci.yml, deploy.yml stubs)
- [x] 1.8 .claude/ commands & .pre-commit-config.yaml
- [x] 1.9 Verify: `docker compose up -d` → all 4 services healthy → health check 200

## Sprint 2: Database "API" Layer
- [x] 2.1 Schema strategy (internal, api, public)
- [x] 2.2 Tables in internal schema
- [x] 2.3 Stored functions in api schema (19 functions)
- [x] 2.4 Permissions (GRANT EXECUTE)
- [x] 2.5 Seed data
- [x] 2.6 DatabaseAPI service class
- [x] 2.7 Alembic setup + initial migration
- [x] 2.8 Verify: stored functions return correct JSONB

## Sprint 3: FastAPI Routers
- [x] 3.1 Public endpoints (health, resume, blog, showcase, media)
- [x] 3.2 Admin endpoints (API-key protected writes)
- [x] 3.3 Pydantic schemas for all request/response models
- [x] 3.4 Presigned URL media upload flow
- [x] 3.5 Verify: all endpoints return correct responses, Swagger UI works

## Sprint 4: React Frontend
- [x] 4.1 Route definitions + MainLayout with hamburger menu
- [x] 4.2 Resume page (landing) with Timeline component
- [x] 4.3 Personal life pages (albums, gallery with lightbox)
- [x] 4.4 Showcase pages (hub, blog listing, blog post, data demos)
- [x] 4.5 Data fetching via @tanstack/react-query
- [x] 4.6 PWA configuration (manifest, service worker)
- [x] 4.7 Responsive design verification
- [x] 4.8 Verify: all pages render, navigation works, PWA installable

## Sprint 5: Testing
- [x] 5.1 Backend test fixtures (conftest.py)
- [x] 5.2 Stored procedure tests (test_db_functions.py)
- [x] 5.3 Router tests (all endpoints)
- [x] 5.4 Frontend component + page tests
- [x] 5.5 Verify: all tests pass

## Sprint 6: Resume Content + Dark Mode + Profile Image
- [x] 6.1 Replace placeholder resume_sections seed data with real content
- [x] 6.2 Replace placeholder professional_entries with real work history
- [x] 6.3 Remove placeholder education entry
- [x] 6.4 Rebuild database and verify API responses
- [x] 6.5 Verify frontend Resume page renders with real data
- [x] 6.6 Run tests to confirm no regressions
- [x] 6.7 Add dark theme with toggle (defaults to dark) — PR #16
- [x] 6.8 Add profile image placeholder to Resume page — PR #17

---

## Sprint 7: Profile Photo
- [x] 7.1 Replace profile placeholder with real photo on Resume page — PR #19

---

## Sprint 8: Claude Workflow Improvements
- [x] 8.1 Sync stale GitHub Project items with todo.md
- [x] 8.2 Update CLAUDE.md Task Management rules
- [x] 8.3 Update lessons.md with new workflow patterns
- [x] 8.4 Create plans directory with plan file for this sprint

---

## Sprint 9: Resume Page Redesign
- [x] 9.1 Center profile image at top of page
- [x] 9.2 Add social/contact icons below profile image
- [x] 9.3 Remove Contact section from page
- [x] 9.4 Rename DEVOPS_CLOUD to DEVOPS in skills
- [x] 9.5 Make skill groups collapsible (default collapsed)
- [x] 9.6 Center the Skills section
- [x] 9.7 Remove "Resume" title text and accent bar from header
- [x] 9.8 Center "Professional Timeline" heading
- [x] 9.9 Move theme toggle to top-right corner of page
- [x] 9.10 Remove "Skills" heading text
- [x] 9.11 Left-align collapsible skill groups

---

## Sprint 10: Fix Scroll Under Header + Update Planning Workflow
- [x] 10.1 Update CLAUDE.md §1 with strict numbered planning procedure
- [x] 10.2 Add lesson to `.claude/tasks/lessons.md` about planning checklist
- [x] 10.3 Convert MainLayout from fixed-positioned controls to flex-column layout
- [x] 10.4 Remove `fixed` positioning from HamburgerMenu toggle button
- [x] 10.5 Verify scroll clipping and layout on mobile and desktop

---

## Sprint 11: LinkedIn Recommendations Carousel + Global Social Icons
- [x] 11.1–11.9 All items complete

---

## Sprint 12: Admin UI
- [x] 12.1–12.14 All items complete

---

## Fix: Remove "About" Section from Resume Admin & Database
- [x] 13.1–13.5 All items complete

---

## Sprint 14: Performance Review Carousels
- [x] 14.1–14.9 All items complete

---

## Sprint 15: Refactor PostgreSQL Database to Match DB Rules
- [x] 15.1–15.9 All items complete

---

## Sprint 16: Repo Structure Optimization for Token Efficiency
- [x] 16.1–16.9 All items complete

---

## Feature: Editable Highlights in Resume Entry Form
- [x] 17.1–17.3 All items complete

---

## Sprint 18: Cognito Auth Integration
- [x] 18.1–18.22 All items complete (backend + frontend + config)

---

## Sprint 19: AWS CDK Infrastructure + CD Pipeline
- [x] 19.1–19.15 All items complete (CDK project, data infra, Lambda prep, app infra, CD pipeline)

---

## Sprint 20: RDS IAM Authentication (replace Secrets Manager)
- [x] 20.1–20.9 All items complete

---

## Sprint 21: Fix Database Schema Deployment + Add Bastion Host
- [x] 21.1–21.9 All items complete

---

## Sprint 22: Improve README Documentation
- [x] 22.1–22.3 All items complete

---

## Sprint 23: Normalize resume_sections Table & Add Summary Form Editor
- [x] 23.1–23.15 All items complete

---

## Sprint 24: Security Audit — Phase 1 (Critical + High + Select Medium)
- [x] 24.1–24.7 All items complete

---

## Sprint 25: Security Audit — Phase 2 (Medium Severity)
- [x] 25.1–25.8 All items complete

---

## Fix: Profile Image Not Displaying on Resume Page
- [x] 26.1–26.8 All items complete

---

## Fix: Profile Image Upload Shows Stale Image in Production
- [x] 27.1–27.10 All items complete

---

## Fix: Profile Image Upload Timeout (Lambda can't reach CloudFront API from VPC)
- [x] 28.1–28.10 All items complete

---

## Sprint 29: Skip CI/Deploy for Non-Code Changes + Documentation Rule
- [x] 29.1–29.7 All items complete

---

## Sprint 30: Application Logging Dashboard
- [x] 30.1–30.17 All items complete

---

## Sprint 31: Staging Environment with Approval Gate
_Superseded by the separate staging account work (PR #103). Design changed from same-account staging to separate AWS account model._

---

## Sprint 32: Stage Post-Deploy Validation
- [x] 32.1–32.6 All items complete

---

## Sprint 33: Release Please Versioning & Release Process
- [x] 33.1–33.10 All items complete

---

## Sprint 34: Fix Database Migration System & LinkedIn URL Deploy Failure
- [x] 34.1–34.9 All items complete

---

## Sprint 35: Dashboard IP Filter & Log Detail Heading
- [x] 35.1 SQL: Add `client_ip` filter to `get_app_logs` and `get_threat_detections` functions
- [x] 35.2 Migration: Create `004_add_client_ip_filter.sql`
- [x] 35.3 CDK: Bump migration version to "9"
- [x] 35.4 Backend: Add `client_ip` query param to `/logs` and `/logs/threats` endpoints
- [x] 35.5 Frontend API: Pass `client_ip` in API calls
- [x] 35.6 Frontend hooks: Accept `client_ip` in filter types
- [x] 35.7 Dashboard: IP filter state, clickable IPs, clear button, "Log Detail" heading
- [x] 35.8 Verification: lint, type check, all tests pass

---

## Sprint 36: Fix GitHub Actions Node.js 20 Deprecation

- [x] 36.1 Upgrade `actions/checkout` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.2 Upgrade `actions/setup-node` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.3 Upgrade `aws-actions/configure-aws-credentials` v4 → v5 in deploy-stage, deploy-prod
- [x] 36.4 Upgrade `actions/setup-python` v5 → v6 in ci
- [x] 36.5 Upgrade `astral-sh/setup-uv` v4 → v5 in ci
- [x] 36.6 Upgrade `amannn/action-semantic-pull-request` v5 → v6 in lint-pr

---

## Sprint 37: Hobby Entry Type

- [x] 37.1–37.5 All items complete

---

## Sprint 38: Scoped Rules & Memory Migration

- [x] 38.1–38.6 All items complete

---

## Sprint 39: Pre-Public Security Audit & Hardening

- [x] 39.1 Delete all 38 old plan files from `.claude/tasks/plans/`
- [x] 39.2 Add Content-Security-Policy header to CloudFront response headers policy in `app-stack.ts`
- [x] 39.3 Add architecture decision comments for Lambda public subnets in `app-stack.ts` and `data-stack.ts`
- [x] 39.4 Scope S3 media bucket permissions: `grantReadWrite` → `grantRead` + `grantPut` in `app-stack.ts`
- [x] 39.5 Document RDS IAM wildcard trade-off with comment in `app-stack.ts`
- [x] 39.6 Verification: TypeScript compiles, backend tests pass (41/41), frontend tests pass (25/25)
- [x] 39.7 Post-public: Enable branch protection on `main`
- [x] 39.8 Post-public: Add production environment protection rules

---

## Sprint 40: Combine Deploy Workflows

- [x] 40.1 Create combined `deploy.yml` workflow with 6-job chain
- [x] 40.2 Delete `deploy-stage.yml` and `deploy-prod.yml`
- [x] 40.3 Update `.claude/rules/git-workflow.md` (Deploy Workflows, Prod Deploy Gate, Dependabot)
- [x] 40.4 Update `.claude/agents/aws-architect.md` (2 workflow references)
- [x] 40.5 Update `README.md` (Continuous Deployment, Staging, Production sections)
- [x] 40.6 Verification: YAML syntax, job chain, secrets, no stale references

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
