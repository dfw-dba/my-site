# Observability Reporting Dashboards

**Branch**: Split into 3 PRs (see below)
**Status**: Planning

## Context

The observability data layer (PR 1: db-metrics, PR 2: visitor-analytics) is fully implemented — database tables, stored functions, backend API endpoints, and the frontend analytics tracker are all in place. However, there is no UI to visualize this data. The admin Dashboard currently only shows logs and threat detection.

This plan adds:
1. **Admin Dashboard sub-tabs** — DB Performance and Visitor Analytics tabs alongside the existing Logs tab
2. **Public Site Stats page** — employer-facing metrics showcasing database engineering skill, added to the hamburger menu

### PR Strategy
- **PR 1** (`feature/admin-dashboard-tabs`): Refactor Dashboard.tsx into tabs, extract LogsTab, build DbPerformanceTab and VisitorAnalyticsTab with recharts
- **PR 2** (`feature/public-site-stats`): New public `/api/stats` endpoint + SiteStats page + hamburger menu link

PR 1 is larger but self-contained (admin-only). PR 2 is smaller and depends on PR 1 only for the recharts dependency.

---

## PR 1: Admin Dashboard Tabs (`feature/admin-dashboard-tabs`)

### 1.1 Install recharts
**File:** `frontend/package.json`

- `npm install recharts` — React-native composable chart library with TypeScript support
- Rationale: tree-shakeable, JSX-based API (no canvas imperative code), widely adopted, dark-theme friendly

### 1.2 Add TypeScript types for metrics and analytics API responses
**File:** `frontend/src/types/index.ts`

Add interfaces matching the JSONB shapes returned by existing stored functions:
- `DbOverview` — from `api.get_db_overview()`: cache_hit_ratio, numbackends, xact_commit/rollback, deadlocks, temp_files, tup_* counts, delta object
- `SlowQuery` — from `api.get_slow_queries()`: queryid, query, calls, total/mean/min/max/stddev exec_time, rows, shared_blks_hit/read, cache_hit_ratio
- `UnstableQuery` — from `api.get_plan_instability()`: queryid, query, calls, mean/stddev/min/max exec_time, instability_ratio, max_mean_ratio
- `TableStat` — from `api.get_table_stats()`: schemaname, relname, seq_scan, idx_scan, n_live_tup, n_dead_tup, last_vacuum, last_analyze
- `IndexStat` — from `api.get_index_usage()`: schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch, is_unused
- `FunctionStat` — from `api.get_function_stats()`: schemaname, funcname, calls, total_time, self_time
- `AnalyticsSummary` — from `api.get_analytics_summary()`: total_page_views, unique_visitors, unique_sessions, top_pages[], top_referrers[], devices[], browsers[], os_breakdown[]
- `AnalyticsVisitors` — from `api.get_analytics_visitors()`: avg_pages_per_session, total_sessions, return_visitors[]
- `AnalyticsGeo` — from `api.get_analytics_geo()`: countries[], regions[], cities[]
- `AnalyticsTimeseries` — new (see 1.6): daily[] with date, views, unique_visitors

**Note:** Verify exact field names by reading the return shapes in `database/init/03_functions.sql` during implementation.

### 1.3 Add API service methods
**File:** `frontend/src/services/api.ts`

Add to `api.admin` object:
```typescript
metrics: {
  overview: async () => { /* GET /api/admin/metrics/overview with adminHeaders */ },
  queries: async (params) => { /* GET /api/admin/metrics/queries?sort_by&limit&min_calls */ },
  planInstability: async (params) => { /* GET /api/admin/metrics/plan-instability?limit&min_calls */ },
  tables: async () => { /* GET /api/admin/metrics/tables */ },
  indexes: async () => { /* GET /api/admin/metrics/indexes */ },
  functions: async () => { /* GET /api/admin/metrics/functions */ },
  capture: async () => { /* POST /api/admin/metrics/capture */ },
},
analytics: {
  summary: async (params) => { /* GET /api/admin/analytics/summary?start_date&end_date&page_path&exclude_bots */ },
  visitors: async (params) => { /* GET /api/admin/analytics/visitors?start_date&end_date&exclude_bots */ },
  geo: async (params) => { /* GET /api/admin/analytics/geo?start_date&end_date&exclude_bots */ },
  timeseries: async (params) => { /* GET /api/admin/analytics/timeseries?start_date&end_date&exclude_bots */ },
},
```

All follow existing pattern: `adminHeaders()` → `URLSearchParams` → `request<T>()`.

### 1.4 Add TanStack Query hooks
**File:** `frontend/src/hooks/useAdminApi.ts`

Add hooks following existing pattern (useQuery with queryKey + refetchInterval):
- `useDbOverview()` — queryKey `["admin-db-overview"]`, refetchInterval 60_000
- `useSlowQueries(params)` — queryKey `["admin-slow-queries", params]`, refetchInterval 60_000
- `usePlanInstability(params)` — queryKey `["admin-plan-instability", params]`
- `useTableStats()` — queryKey `["admin-table-stats"]`
- `useIndexUsage()` — queryKey `["admin-index-usage"]`
- `useFunctionStats()` — queryKey `["admin-function-stats"]`
- `useCaptureMetrics()` — useMutation, invalidates all `admin-db-*` keys on success, shows toast
- `useAnalyticsSummary(params)` — queryKey `["admin-analytics-summary", params]`
- `useAnalyticsVisitors(params)` — queryKey `["admin-analytics-visitors", params]`
- `useAnalyticsGeo(params)` — queryKey `["admin-analytics-geo", params]`
- `useAnalyticsTimeseries(params)` — queryKey `["admin-analytics-timeseries", params]`

### 1.5 Refactor Dashboard.tsx into tab shell + extract components
**File:** `frontend/src/pages/admin/Dashboard.tsx` (currently ~621 lines)

Refactor to thin shell:
- `type DashboardTab = "logs" | "db-performance" | "visitor-analytics"`
- `useState<DashboardTab>("logs")`
- Tab bar: reuse exact pattern from `ResumeEditor.tsx:139-156` (flex gap-1, border-b border-gray-700, border-blue-500 active)
- Tab labels: "Logs", "DB Performance", "Visitor Analytics"
- Conditional render: `{tab === "logs" && <LogsTab />}` etc.

**New file:** `frontend/src/components/admin/dashboard/StatCard.tsx`
- Extract existing `StatCard` component from Dashboard.tsx (lines 14-21)
- Add optional `delta` prop for trend arrows (green up / red down)
- Reused by LogsTab, DbPerformanceTab, and VisitorAnalyticsTab

**New file:** `frontend/src/components/admin/dashboard/LogsTab.tsx`
- Move ALL existing Dashboard.tsx content here verbatim (StatCard refs → import shared)
- All inline components (LogDetailRow, ThreatBadge, ThreatDetectionSection, TopThreatsByIp) stay as local helpers
- All state management (filters, pagination, expanded rows) stays in this component
- Zero behavior change — pure extraction refactor

**New file:** `frontend/src/components/admin/dashboard/DbPerformanceTab.tsx`

Sections (top to bottom):
1. **Overview cards row** (4 cards): Cache Hit Ratio (% with green/yellow/red), Active Connections, Transactions (with delta), Deadlocks (red accent if > 0)
2. **Manual Capture button** — top-right, calls `useCaptureMetrics()`, shows "Capturing..." while pending
3. **Slow Queries** — sortable table (Query truncated ~80 chars, Total Time ms, Mean Time ms, Calls, Rows, Cache Hit %). Recharts horizontal `BarChart` for top 10 by total time
4. **Plan Instability** — table with instability_ratio column, yellow warning badge if > 1, red if > 3
5. **Table Stats** — table (Table Name, Seq Scans, Idx Scans, Dead Tuples, Last Vacuum). Highlight rows where dead tuples > 1000. Recharts stacked bar for seq vs idx scans
6. **Index Usage** — split: "Unused Indexes" (warning badge) + "Most Used" (top 10)
7. **Function Stats** — sortable table (Function, Schema, Calls, Total Time, Self Time)

**New file:** `frontend/src/components/admin/dashboard/VisitorAnalyticsTab.tsx`

Sections (top to bottom):
1. **Date range filter** — two date inputs (start/end), default last 30 days. Passed to all hooks
2. **Overview cards row** (4 cards): Total Page Views, Unique Visitors, Unique Sessions, Avg Pages/Session
3. **Page Views time series** — recharts `AreaChart` (daily data from timeseries endpoint)
4. **Top Pages** — table (Page Path, Views, Unique Visitors)
5. **Top Referrers** — table (Referrer, Views)
6. **Device Type** — recharts `PieChart` (donut style, innerRadius)
7. **Browser / OS** — two side-by-side recharts horizontal `BarChart`s
8. **Geographic** — country table (Country, Views, Unique Visitors) from geo endpoint

### 1.6 New database function: analytics timeseries
**File:** `database/init/03_functions.sql` (add after existing analytics functions)
**File:** `database/migrations/006_add_analytics_timeseries.sql`

```sql
create or replace function api.get_analytics_timeseries(p_filters jsonb default '{}')
returns jsonb
```
- Groups `internal.page_views` by `date(created_at)`
- Returns `{ daily: [{ date, views, unique_visitors }] }`
- Respects filters: start_date, end_date, exclude_bots (default true)
- Needed to avoid N+1 API calls for time series chart

**File:** `backend/src/app/services/db_functions.py`
- Add `get_analytics_timeseries(filters)` method

**File:** `backend/src/app/routers/admin.py`
- Add `GET /api/admin/analytics/timeseries` endpoint (admin auth, rate-limited 60/min)
- Query params: start_date, end_date, exclude_bots

**File:** `infrastructure/cdk/lib/data-stack.ts`
- Bump `DbMigration` version (mandatory per aws-cdk rule)

### 1.7 Recharts chart wrappers (consistent dark theme)
**New file:** `frontend/src/components/admin/charts/DonutChart.tsx`
- Thin wrapper around recharts `PieChart` with dark-theme defaults (gray-800 bg, gray-300 text)
- Props: `data: {name, value}[]`, optional `colors` array
- Default palette: `["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]`

**New file:** `frontend/src/components/admin/charts/TimeSeriesChart.tsx`
- Wrapper around recharts `AreaChart` with ResponsiveContainer
- Props: `data: {date, value}[]`, `color`, `label`

**New file:** `frontend/src/components/admin/charts/HorizontalBarChart.tsx`
- Wrapper around recharts `BarChart` with `layout="vertical"`
- Props: `data: {name, value}[]`, `color`

---

## PR 2: Public Site Stats (`feature/public-site-stats`)

### 2.1 New database function: public stats
**File:** `database/init/03_functions.sql`
**File:** `database/migrations/007_add_public_stats.sql`

```sql
create or replace function api.get_public_stats()
returns jsonb
```
Returns ONLY aggregated, non-sensitive data:
- `total_page_views` — count(*) from page_views where is_bot = false
- `unique_visitors` — count(distinct visitor_hash)
- `countries_reached` — count(distinct country_code)
- `top_countries` — top 10 by unique visitors (country_name + count only)
- `cache_hit_ratio` — from latest stat_database_history snapshot
- `avg_query_time_ms` — avg mean_exec_time from latest stat_statements_history
- `uptime_days` — extract(epoch from now() - pg_postmaster_start_time()) / 86400
- `total_functions` — count of tracked functions
- `total_queries_served` — sum of calls from stat_statements_history

Does NOT return: visitor hashes, IPs, sessions, page paths, referrers, query text, or anything identifying.

### 2.2 New backend router: public stats
**New file:** `backend/src/app/routers/stats.py`

```python
@router.get("/stats")
@limiter.limit("30/minute")
async def get_public_stats(request, db):
    return await db.get_public_stats()
```
- No admin auth — public endpoint
- Rate-limited to 30/min to prevent abuse

**File:** `backend/src/app/services/db_functions.py`
- Add `get_public_stats()` method

**File:** `backend/src/app/main.py`
- Register stats router: `application.include_router(stats.router, prefix="/api", tags=["stats"])`

### 2.3 Frontend API + hook
**File:** `frontend/src/services/api.ts`
- Add `stats: { get: () => request<PublicSiteStats>("/api/stats") }` at top level of `api` object (no admin headers)

**File:** `frontend/src/types/index.ts`
- Add `PublicSiteStats` interface matching the function return shape

**File:** `frontend/src/hooks/useApi.ts` (or create if doesn't exist)
- Add `usePublicStats()` — queryKey `["public-stats"]`, staleTime 120_000, refetchInterval 300_000

### 2.4 Site Stats page
**New file:** `frontend/src/pages/SiteStats.tsx`

Styled to match Resume page (max-w-4xl, dark mode default, cards with rounded-lg):

1. **Hero header** — "Site Stats" h1 + subtitle "Real-time metrics from a self-hosted observability pipeline"

2. **Key Metrics cards** (responsive grid, 2-col mobile, 4-col desktop):
   - Total Page Views (large number)
   - Unique Visitors
   - Countries Reached
   - Database Uptime (days)

3. **Database Performance section** (showcase DB engineering):
   - Cache Hit Ratio — large percentage with a recharts `RadialBarChart` gauge (99%+ is impressive)
   - Avg Query Response Time — in milliseconds
   - Brief text: "PostgreSQL with custom observability — automated vacuum monitoring, query performance tracking, and plan instability detection"

4. **Geographic Reach** — recharts horizontal bar chart of top countries by visitor count

5. **Built With** section (hardcoded constant, rarely changes):
   - Frontend: React 19, TypeScript, Tailwind 4, TanStack Query
   - Backend: Python, FastAPI, SQLAlchemy
   - Database: PostgreSQL 16, pg_stat_statements, custom stored functions
   - Infrastructure: AWS CDK, Lambda, RDS, S3, CloudFront
   - Observability: Custom analytics pipeline, GeoIP enrichment, automated metrics capture

6. **Footer note** — "All metrics are aggregated and anonymized. No individual visitor data is exposed."

### 2.5 Route + hamburger menu
**File:** `frontend/src/routes/index.tsx`
- Add `<Route path="stats" element={<SiteStats />} />` inside the `<Route element={<MainLayout />}>` block (line 13)
- Import SiteStats

**File:** `frontend/src/components/HamburgerMenu.tsx`
- Add "Site Stats" `<li>` after the Resume link (line 73), using same Link styling

### 2.6 Infrastructure
**File:** `infrastructure/cdk/lib/data-stack.ts`
- Bump `DbMigration` version for migration 007

---

## File Summary

| File | Action | PR | Description |
|------|--------|----|-------------|
| `frontend/package.json` | Edit | 1 | Add recharts dependency |
| `frontend/src/types/index.ts` | Edit | 1+2 | Add metrics, analytics, and public stats types |
| `frontend/src/services/api.ts` | Edit | 1+2 | Add metrics, analytics, timeseries, and stats API methods |
| `frontend/src/hooks/useAdminApi.ts` | Edit | 1 | Add all metrics + analytics query hooks |
| `frontend/src/hooks/useApi.ts` | Create | 2 | Public stats hook (or add to existing) |
| `frontend/src/pages/admin/Dashboard.tsx` | Edit | 1 | Refactor to thin tab shell |
| `frontend/src/components/admin/dashboard/StatCard.tsx` | Create | 1 | Extracted shared stat card |
| `frontend/src/components/admin/dashboard/LogsTab.tsx` | Create | 1 | Extracted existing logs content |
| `frontend/src/components/admin/dashboard/DbPerformanceTab.tsx` | Create | 1 | DB metrics visualizations |
| `frontend/src/components/admin/dashboard/VisitorAnalyticsTab.tsx` | Create | 1 | Visitor analytics visualizations |
| `frontend/src/components/admin/charts/DonutChart.tsx` | Create | 1 | Recharts pie/donut wrapper |
| `frontend/src/components/admin/charts/TimeSeriesChart.tsx` | Create | 1 | Recharts area chart wrapper |
| `frontend/src/components/admin/charts/HorizontalBarChart.tsx` | Create | 1 | Recharts bar chart wrapper |
| `database/init/03_functions.sql` | Edit | 1+2 | Add get_analytics_timeseries + get_public_stats |
| `database/migrations/006_add_analytics_timeseries.sql` | Create | 1 | Timeseries function migration |
| `database/migrations/007_add_public_stats.sql` | Create | 2 | Public stats function migration |
| `backend/src/app/services/db_functions.py` | Edit | 1+2 | Add timeseries + public stats methods |
| `backend/src/app/routers/admin.py` | Edit | 1 | Add analytics/timeseries endpoint |
| `backend/src/app/routers/stats.py` | Create | 2 | Public stats endpoint |
| `backend/src/app/main.py` | Edit | 2 | Register stats router |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | 1+2 | Bump DbMigration version |
| `frontend/src/pages/SiteStats.tsx` | Create | 2 | Public site stats page |
| `frontend/src/routes/index.tsx` | Edit | 2 | Add /stats route |
| `frontend/src/components/HamburgerMenu.tsx` | Edit | 2 | Add Site Stats link |

## Verification

### PR 1 (Admin Dashboard Tabs)
1. `cd frontend && npm install` — recharts installs
2. `cd frontend && npx tsc --noEmit` — no type errors
3. `cd frontend && npx vitest run` — all tests pass
4. `cd backend && uv run ruff check && uv run ruff format --check` — lint passes
5. `cd backend && uv run pytest` — all tests pass
6. Manual: open admin dashboard → verify 3 tabs render, Logs tab shows existing content unchanged
7. Manual: click DB Performance tab → verify overview cards, tables, and charts render
8. Manual: click Visitor Analytics tab → verify date filter, overview cards, time series chart, and breakdown charts render
9. Post-deploy: `curl -sf "${API_URL}/api/admin/analytics/timeseries" -H "Authorization: Bearer ..."` returns daily data

### PR 2 (Public Site Stats)
1. `cd frontend && npx tsc --noEmit` — no type errors
2. `cd frontend && npx vitest run` — all tests pass
3. `cd backend && uv run ruff check && uv run ruff format --check`
4. `cd backend && uv run pytest`
5. Manual: hamburger menu shows "Site Stats" link
6. Manual: `/stats` page renders with metrics, charts, and tech stack
7. Post-deploy: `curl -sfL "${API_URL}/api/stats"` returns aggregated public data with no sensitive fields
8. Post-deploy: `curl -sfL "https://${DOMAIN_NAME}/stats"` returns the page (verify CloudFront SPA routing)

### Security Checks
- Public stats endpoint returns NO individual visitor data, IPs, sessions, paths, or query text
- Public stats endpoint is rate-limited (30/min)
- Admin endpoints still require auth
- No new sensitive data exposed through the public API
