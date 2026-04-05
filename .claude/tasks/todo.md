# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

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

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
