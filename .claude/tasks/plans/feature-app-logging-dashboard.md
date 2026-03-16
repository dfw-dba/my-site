# Plan: Application Logging Dashboard

## Branch: `feature/app-logging-dashboard`

## Problem
Zero visibility into application behavior after deploying to AWS. Lambda is in a VPC with no NAT Gateway, so it can't reach CloudWatch or SNS. RDS PostgreSQL is accessible from the Lambda.

## Solution
Log requests to PostgreSQL and expose via the admin dashboard.

## Changes

### Database
- `internal.app_logs` table (int8 PK, level/message/request fields, jsonb extra, timestamptz)
- 4 stored functions: `insert_app_log`, `get_app_logs`, `get_app_log_stats`, `purge_app_logs`
- Migration version bump: "4" → "5"

### Backend
- `RequestLoggingMiddleware` — logs every request (except /api/health) to DB after response
- 4 `DatabaseAPI` methods for log CRUD
- 3 admin endpoints: GET /logs, GET /logs/stats, POST /logs/purge
- `PurgeLogs` Pydantic schema

### Frontend
- Types: `AppLog`, `AppLogStats`, `AppLogsResponse`
- API: `api.admin.logs.{list, stats, purge}`
- Hooks: `useAdminLogs`, `useAdminLogStats`, `useAdminPurgeLogs`
- Dashboard: stat cards, filter controls, paginated log table with expandable rows

### Tests
- 6 new backend tests (logs CRUD + auth)
- 5 frontend tests (renders heading, filters, table headers, purge button, loading state)

## Verification
- Backend: ruff check + format clean, 41 tests pass
- Frontend: tsc --noEmit clean, 25 tests pass
