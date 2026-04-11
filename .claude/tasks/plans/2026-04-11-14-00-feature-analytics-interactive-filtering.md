# Analytics Dashboard: Interactive Filtering + New Metrics

## Context

The visitor analytics dashboard currently shows static data with only date range filtering. The user wants:
1. Two new metrics: **Avg Session Duration** and **Avg Scroll Depth**
2. **Interactive click-to-filter** on all charts and geo tables — clicking a segment/bar/row filters the entire page
3. **Multi-layered stacking** — e.g., click Chrome, then Windows, then US progressively narrows results
4. **Clear filters UI** — visible chips with individual remove and clear-all

## Files to Modify

| File | Change |
|------|--------|
| `database/init/03_functions.sql` | Add dimensional filters to all 4 functions; add avg_session_duration + avg_scroll_depth to `get_analytics_visitors` |
| `infrastructure/cdk/lib/data-stack.ts` | Bump DbMigration version `"22"` → `"23"` |
| `backend/src/app/routers/admin.py` | Add 6 filter query params to all 4 analytics endpoints |
| `frontend/src/types/index.ts` | Add `AnalyticsFilters` type; update `AnalyticsVisitors` with new fields |
| `frontend/src/services/api.ts` | Refactor 4 analytics API methods to use generic filter params |
| `frontend/src/hooks/useAdminApi.ts` | Update 4 hooks to accept `AnalyticsFilters` |
| `frontend/src/components/admin/charts/DonutChart.tsx` | Add `onSegmentClick` + `activeSegment` props |
| `frontend/src/components/admin/charts/HorizontalBarChart.tsx` | Add `onBarClick` + `activeBar` props |
| `frontend/src/components/admin/dashboard/VisitorAnalyticsTab.tsx` | Filter state, wire click handlers, new StatCards, ActiveFilters UI |

## Implementation Steps

### 1. Database — Extend All 4 Stored Functions

Add 6 filter variables to each function's declare block:
```sql
v_device_type text := p_filters->>'device_type';
v_browser     text := p_filters->>'browser';
v_os          text := p_filters->>'os';
v_country     text := p_filters->>'country_code';
v_region      text := p_filters->>'region';
v_city        text := p_filters->>'city';
```

Append to every WHERE clause (all sub-queries in all 4 functions):
```sql
and (v_device_type is null or device_type = v_device_type)
and (v_browser is null or browser = v_browser)
and (v_os is null or os = v_os)
and (v_country is null or country_code = v_country)
and (v_region is null or region = v_region)
and (v_city is null or city = v_city)
```

**Sub-queries to update:**
- `get_analytics_summary`: totals, top_pages, top_referrers, devices, browsers, os_breakdown (6 sub-queries)
- `get_analytics_visitors`: session_stats, top_sessions, return_visitors (3 sub-queries)
- `get_analytics_geo`: countries, regions, cities (3 sub-queries)
- `get_analytics_timeseries`: daily (1 sub-query)

### 2. Database — Add avg_session_duration to `get_analytics_visitors`

Modify session_stats sub-query (line 1441-1451) to also compute duration:
```sql
select jsonb_build_object(
    'avg_pages_per_session', coalesce(round(avg(page_count), 1), 0),
    'avg_session_duration', coalesce(round(avg(duration_seconds), 1), 0),
    'total_sessions', count(*)
) into v_session_stats
from (
    select session_id,
           count(*) as page_count,
           extract(epoch from max(created_at) - min(created_at))::numeric as duration_seconds
      from internal.page_views
     where created_at between v_start and v_end
       and (not v_exclude_bots or is_bot = false)
       -- + 6 dimensional filters
     group by session_id
) as s;
```

### 3. Database — Add avg_scroll_depth to `get_analytics_visitors`

Add new variable `v_scroll_depth jsonb` and query block:
```sql
select jsonb_build_object(
    'avg_scroll_depth', coalesce(round(avg(max_depth), 1), 0)
) into v_scroll_depth
from (
    select ve.session_id, max((ve.event_data->>'depth')::numeric) as max_depth
      from internal.visitor_events as ve
     where ve.event_type = 'scroll'
       and ve.created_at between v_start and v_end
       and exists (
           select 1 from internal.page_views as pv
            where pv.session_id = ve.session_id
              and pv.created_at between v_start and v_end
              and (not v_exclude_bots or pv.is_bot = false)
              -- + 6 dimensional filters on pv
       )
     group by ve.session_id
) as sd;
```

Merge into return: `return v_session_stats || v_scroll_depth || jsonb_build_object(...)`.

### 4. CDK Version Bump

`data-stack.ts` line 181: `version: "22"` → `version: "23"`

### 5. Backend — Add Filter Params to All 4 Endpoints

Add to each endpoint in `admin.py`:
```python
device_type: str | None = None,
browser: str | None = None,
os: str | None = None,
country_code: str | None = None,
region: str | None = None,
city: str | None = None,
```

And in each filter dict builder:
```python
for key in ("device_type", "browser", "os", "country_code", "region", "city"):
    val = locals()[key]
    if val:
        filters[key] = val
```

### 6. Frontend Types

Add to `types/index.ts`:
```typescript
export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  page_path?: string;
  exclude_bots?: boolean;
  device_type?: string;
  browser?: string;
  os?: string;
  country_code?: string;
  region?: string;
  city?: string;
}
```

Update `AnalyticsVisitors`:
```typescript
export interface AnalyticsVisitors {
  avg_pages_per_session: number;
  avg_session_duration: number;   // NEW
  avg_scroll_depth: number;       // NEW
  total_sessions: number;
  top_sessions: AnalyticsTopSession[];
  return_visitors: AnalyticsReturnVisitor[];
  date_range: AnalyticsDateRange;
}
```

### 7. Frontend API + Hooks

Refactor all 4 methods in `api.ts` to accept `AnalyticsFilters` and use generic loop:
```typescript
const qs = new URLSearchParams();
for (const [key, val] of Object.entries(params)) {
  if (val !== undefined && val !== null) qs.set(key, String(val));
}
```

Update all 4 hooks in `useAdminApi.ts` to accept `AnalyticsFilters`.

### 8. Chart Components — Add Click Handlers

**DonutChart.tsx**: Add `onSegmentClick?: (name: string) => void` and `activeSegment?: string` props. Wire `onClick` on `<Pie>`, add white stroke on active Cell, cursor pointer.

**HorizontalBarChart.tsx**: Add `onBarClick?: (name: string) => void` and `activeBar?: string` props. Use Recharts `<Cell>` elements inside `<Bar>` to differentiate active bar styling. Wire `onClick` on `<Bar>`.

### 9. VisitorAnalyticsTab — Wire Everything Together

**Filter state:**
```typescript
type DimensionalFilters = Pick<AnalyticsFilters, "device_type" | "browser" | "os" | "country_code" | "region" | "city">;
const [filters, setFilters] = useState<DimensionalFilters>({});
```

**Merge into params:** `const params: AnalyticsFilters = { start_date: startDate, end_date: endDate, ...filters };`

**Toggle logic** (clicking same value removes filter):
```typescript
const toggleFilter = (key: keyof DimensionalFilters, value: string) => {
  setFilters((prev) => {
    if (prev[key] === value) { const next = { ...prev }; delete next[key]; return next; }
    return { ...prev, [key]: value };
  });
};
```

**Active filters bar** — inline in VisitorAnalyticsTab (no separate file needed, it's ~20 lines):
- Render when `Object.keys(filters).length > 0`
- Show chips: `bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-full px-3 py-1 text-sm`
- Each chip shows label + value + X button
- "Clear all" button at end

**New StatCards** — expand grid to `lg:grid-cols-3` (6 cards, 2 rows of 3):
- Avg Session Duration: format seconds as `Xm Ys` or `Xs`
- Avg Scroll Depth: format as `X%`

**Chart onClick wiring:**
- DonutChart: `onSegmentClick={(name) => toggleFilter("device_type", name)}` + `activeSegment={filters.device_type}`
- Browsers bar: `onBarClick={(name) => toggleFilter("browser", name)}` + `activeBar={filters.browser}`
- OS bar: `onBarClick={(name) => toggleFilter("os", name)}` + `activeBar={filters.os}`

**Geo table rows** — add `hover:bg-gray-700/50 cursor-pointer` + onClick:
- Countries: `onClick={() => toggleFilter("country_code", c.country_code)}`
- Regions: `onClick={() => toggleFilter("region", r.region)}`
- Cities: `onClick={() => toggleFilter("city", c.city)}`

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check`
2. `cd frontend && npx tsc --noEmit`
3. `cd frontend && npx vitest run`
4. Manual: run `./dev.sh`, open admin dashboard, verify:
   - New StatCards show avg session duration and scroll depth
   - Clicking a donut segment filters all data
   - Clicking a bar filters all data
   - Clicking a geo row filters all data
   - Filters stack (multi-layer)
   - Filter chips appear with working X and Clear All
   - Clicking same value again removes that filter (toggle)
