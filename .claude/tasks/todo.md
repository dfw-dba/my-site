# Personal Website / PWA — Implementation Tracker

_Completed sprints are archived in `todo-archive.md`. Only the last 3 completed sprints are kept here for context._

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

## Sprint 56: Public Visitor Analytics

### Backend
- [x] 56.1 Add public GET endpoints (`/api/analytics/summary`, `/visitors`, `/geo`, `/timeseries`) in `analytics.py`
  - Rate limited 30/min, no auth required
  - Strip `top_sessions`/`return_visitors` from public visitors response
  - Extract shared `_build_analytics_filters` helper

### Frontend
- [x] 56.2 Add `api.analytics.*` public API client in `api.ts` (no auth headers)
- [x] 56.3 Create `useAnalyticsData.ts` with public analytics hooks
- [x] 56.4 Create `Analytics.tsx` page with light/dark theme support
- [x] 56.5 Add `/analytics` route in `routes/index.tsx`
- [x] 56.6 Add "Visitor Analytics" link in `HamburgerMenu.tsx`

### Verification
- [x] 56.7 Backend lint + tests pass (41/41)
- [x] 56.8 Frontend type check + tests pass (25/25)

---

## Sprint 57: Fix Analytics Date Filter + Timezone Support

### Database
- [x] 57.1 Fix date range in all 4 analytics functions: `BETWEEN` -> half-open `>= / <`, add `v_tz` timezone variable
- [x] 57.2 Fix timeseries grouping to use `date(created_at at time zone v_tz)`
- [x] 57.3 Bump CDK migration version 23 -> 24

### Backend
- [x] 57.4 Add `timezone` param to `_build_analytics_filters` in `analytics.py`
- [x] 57.5 Add `timezone` query param to all 4 public analytics endpoints
- [x] 57.6 Add `timezone` query param to all 4 admin analytics endpoints in `admin.py`

### Frontend
- [x] 57.7 Add `timezone` to `AnalyticsFilters` type
- [x] 57.8 Fix `defaultDateRange()` to use local dates (not UTC) in both pages
- [x] 57.9 Send `timezone` from `Intl.DateTimeFormat` in both pages

### Verification
- [x] 57.10 Backend lint + tests pass (41/41)
- [x] 57.11 Frontend type check + tests pass (25/25)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory
