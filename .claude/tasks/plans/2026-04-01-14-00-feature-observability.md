# Observability: Database Performance Metrics + Visitor Analytics

**Branch**: Split into `feature/db-metrics` and `feature/visitor-analytics`
**Status**: Planning

## Context

The site has basic request logging (`internal.app_logs`) and threat detection, but no database performance monitoring or visitor analytics. The goal is to build a PostgreSQL equivalent of SQL Server Query Store (query history, plan tracking via auto_explain, table/index stats, function metrics) plus a self-hosted, privacy-respecting visitor analytics system — all stored in the existing PostgreSQL database and surfaced through the admin dashboard.

### Decisions Made
- **GeoIP**: PostgreSQL IP range lookup table (no external dependencies, queryable in-DB)
- **Query params**: `auto_explain` (500ms threshold) captures plans + parameter values for slow queries; `pg_stat_statements` stddev analysis flags plan instability. No pgaudit.
- **PR split**: Two PRs — DB metrics first, visitor analytics second
- **auto_explain threshold**: 500ms initial, configurable via RDS parameter group or per-session

### Key Constraints
- **Lambda in VPC, no NAT Gateway** — cannot call external APIs
- **RDS t4g.micro** (1GB RAM) — `pg_stat_statements.max` default of 5000 is fine (~5-10MB shared memory)
- **20GB storage cap** — snapshot and analytics tables need retention policies
- **No cookies** — visitor tracking uses fingerprinting + sessionStorage only
- **Public analytics endpoint** — must be heavily rate-limited to prevent abuse

### How Parameter-Driven Plan Changes Are Detected
PostgreSQL doesn't have SQL Server Query Store's built-in plan regression tracking, but the combination of two tools provides equivalent visibility:

1. **`auto_explain`** (500ms threshold): When a query is slow, PostgreSQL logs the **full execution plan with actual parameter values**, actual vs estimated row counts, buffer usage, and timing per plan node. This goes to CloudWatch Logs in JSON format. A mismatch between estimated and actual rows is the smoking gun for a bad plan choice caused by parameter values.

2. **`pg_stat_statements` stddev analysis**: Queries where `stddev_exec_time > mean_exec_time` or `max_exec_time >> min_exec_time` indicate plan instability — some executions are dramatically slower than others. The snapshot system tracks this over time so you can see when instability began.

3. **Investigation workflow**: High stddev flags a query → check CloudWatch Logs for auto_explain output on that query → see the actual parameter values and plan that caused the slowdown → adjust (add index, rewrite query, update statistics).

The threshold is configurable: start at 500ms, lower to 50ms temporarily via bastion (`SET auto_explain.log_min_duration = '50ms';`) when investigating a specific function.

---

## PR 1: Database Performance Metrics (`feature/db-metrics`)

### 1.1 RDS Parameter Group Changes
**File:** `infrastructure/cdk/lib/data-stack.ts`

Add to the existing `parameterGroup` `parameters` block (currently only has `rds.force_ssl`):
```
"shared_preload_libraries": "pg_stat_statements,auto_explain",
"pg_stat_statements.track": "all",
"track_functions": "all",
"auto_explain.log_min_duration": "500",
"auto_explain.log_analyze": "true",
"auto_explain.log_buffers": "true",
"auto_explain.log_format": "json"
```

**Note**: Changing `shared_preload_libraries` requires an RDS reboot. CDK will handle this during deploy, but there will be brief downtime (~30-60 seconds for a micro instance).

### 1.2 Enable pg_stat_statements Extension
**File:** `database/init/00_extensions.sql`

```sql
create extension if not exists pg_stat_statements;
```

### 1.3 Snapshot Tables
**File:** `database/init/02_tables.sql` (append new tables)

All tables in `internal` schema with `comment on table` statements:

- **`internal.metric_snapshots`** — metadata: `id` (int8 identity PK), `captured_at` (timestamptz default now()), `snapshot_type` (text check in 'scheduled','manual')
- **`internal.stat_statements_history`** — `id` (int8 identity PK), `snapshot_id` (int8 FK → metric_snapshots on delete cascade), `queryid` (int8), `query` (text), `calls` (int8), `total_exec_time` (float8), `mean_exec_time` (float8), `min_exec_time` (float8), `max_exec_time` (float8), `stddev_exec_time` (float8), `rows` (int8), `shared_blks_hit` (int8), `shared_blks_read` (int8), `temp_blks_written` (int8), `wal_bytes` (int8)
- **`internal.stat_tables_history`** — `id` (int8 identity PK), `snapshot_id` FK, `schemaname` (text), `relname` (text), `seq_scan` (int8), `seq_tup_read` (int8), `idx_scan` (int8), `idx_tup_fetch` (int8), `n_tup_ins` (int8), `n_tup_upd` (int8), `n_tup_del` (int8), `n_dead_tup` (int8), `last_vacuum` (timestamptz), `last_autovacuum` (timestamptz), `last_analyze` (timestamptz), `last_autoanalyze` (timestamptz)
- **`internal.stat_indexes_history`** — `id` (int8 identity PK), `snapshot_id` FK, `schemaname` (text), `relname` (text), `indexrelname` (text), `idx_scan` (int8), `idx_tup_read` (int8), `idx_tup_fetch` (int8)
- **`internal.stat_functions_history`** — `id` (int8 identity PK), `snapshot_id` FK, `schemaname` (text), `funcname` (text), `calls` (int8), `total_time` (float8), `self_time` (float8)
- **`internal.stat_database_history`** — `id` (int8 identity PK), `snapshot_id` FK, `numbackends` (int4), `xact_commit` (int8), `xact_rollback` (int8), `blks_read` (int8), `blks_hit` (int8), `tup_returned` (int8), `tup_fetched` (int8), `tup_inserted` (int8), `tup_updated` (int8), `tup_deleted` (int8), `deadlocks` (int8), `temp_files` (int8), `temp_bytes` (int8)

### 1.4 Capture Function
**File:** `database/init/03_functions.sql` (append)

- **`api.capture_db_metrics(p_type text default 'scheduled')`** — Creates a `metric_snapshots` row, then bulk-inserts from live stat views (`pg_stat_statements`, `pg_stat_user_tables`, `pg_stat_user_indexes`, `pg_stat_user_functions`, `pg_stat_database`) into history tables using that snapshot_id. Returns `{snapshot_id, success, counts: {statements, tables, indexes, functions, database}}`.

### 1.5 Query/Dashboard Functions
**File:** `database/init/03_functions.sql` (append)

- **`api.get_db_overview(p_filters jsonb default '{}')`** — Database-level stats from latest snapshot: cache hit ratio (`blks_hit / (blks_hit + blks_read)`), transaction rates, deadlocks, temp file usage. Includes delta vs previous snapshot.
- **`api.get_slow_queries(p_filters jsonb default '{}')`** — Top N queries by total_exec_time or mean_exec_time from latest snapshot. Includes stddev_exec_time for plan instability detection. Filterable by min calls, sort order, limit.
- **`api.get_plan_instability(p_filters jsonb default '{}')`** — Queries where `stddev_exec_time > mean_exec_time` OR `max_exec_time > 10 * mean_exec_time`. These are candidates for parameter-driven plan changes. Shows trend across snapshots.
- **`api.get_table_stats(p_filters jsonb default '{}')`** — Table access patterns: seq_scan vs idx_scan ratio, dead tuple counts, vacuum/analyze timestamps. Flags tables with high seq_scan counts (missing indexes).
- **`api.get_index_usage(p_filters jsonb default '{}')`** — Index scan counts, unused index detection (`idx_scan = 0` across multiple snapshots), index efficiency.
- **`api.get_function_stats(p_filters jsonb default '{}')`** — Function call counts, total/self time, avg time per call. Sorted by total time.
- **`api.purge_metric_snapshots(p_days int default 30)`** — Cascade-deletes snapshots older than N days.

### 1.6 Scheduled Capture via EventBridge
**File:** `infrastructure/cdk/lib/app-stack.ts`

Add a second EventBridge rule (hourly) with a custom input payload to distinguish from log maintenance:
```typescript
new events.Rule(this, "MetricsCaptureSchedule", {
  ruleName: `${namePrefix}mysite-metrics-capture`,
  description: "Hourly database performance metrics snapshot",
  schedule: events.Schedule.rate(cdk.Duration.hours(1)),
  targets: [new eventsTargets.LambdaFunction(backendFn, {
    event: events.RuleTargetInput.fromObject({
      source: "mysite.scheduled",
      action: "capture_metrics",
    }),
  })],
});
```

### 1.7 Lambda Handler Updates
**File:** `backend/src/lambda_handler.py`

Extend EventBridge handling to dispatch on `action`:
- No `action` field (existing EventBridge rule) → `_run_maintenance()`
- `action: "capture_metrics"` → new `_run_metrics_capture()` that calls `api.capture_db_metrics()` + purges old snapshots (>30 days)

Also extend `_run_maintenance()` to VACUUM metric snapshot tables.

### 1.8 Admin API Endpoints
**File:** `backend/src/app/routers/admin.py` (or new `backend/src/app/routers/metrics.py`)

All require `Depends(get_admin_auth)`:
- `GET /api/admin/metrics/overview` → `api.get_db_overview()`
- `GET /api/admin/metrics/queries` → `api.get_slow_queries()`
- `GET /api/admin/metrics/plan-instability` → `api.get_plan_instability()`
- `GET /api/admin/metrics/tables` → `api.get_table_stats()`
- `GET /api/admin/metrics/indexes` → `api.get_index_usage()`
- `GET /api/admin/metrics/functions` → `api.get_function_stats()`
- `POST /api/admin/metrics/capture` → `api.capture_db_metrics('manual')`

### 1.9 DatabaseAPI Methods
**File:** `backend/src/app/services/db_functions.py`

Add methods matching each function above.

### 1.10 Permissions
**File:** `database/init/04_permissions.sql`

The capture function runs as `security definer` (owned by DB owner `mysite` who has superuser). `pg_stat_statements` view is readable by superuser by default. No additional grants needed for the function itself. The `app_user` role only calls `api.*` functions — no direct access to stat views.

### 1.11 CDK Migration Version Bump
**File:** `infrastructure/cdk/lib/data-stack.ts`

Bump `version` from `"11"` to `"12"` in the `DbMigration` custom resource.

---

## PR 2: Visitor Analytics (`feature/visitor-analytics`)

### 2.1 Analytics Tables
**File:** `database/init/02_tables.sql` (append)

- **`internal.page_views`** — `id` (int8 identity PK), `visitor_hash` (text not null), `session_id` (text not null), `page_path` (text not null), `page_title` (text), `referrer` (text), `utm_source` (text), `utm_medium` (text), `utm_campaign` (text), `device_type` (text check in 'desktop','mobile','tablet'), `browser` (text), `os` (text), `screen_width` (int2), `screen_height` (int2), `language` (text), `timezone` (text), `client_ip` (text), `country_code` (text), `country_name` (text), `region` (text), `city` (text), `is_bot` (boolean default false), `created_at` (timestamptz default now())
- **`internal.visitor_events`** — `id` (int8 identity PK), `visitor_hash` (text not null), `session_id` (text not null), `event_type` (text not null check in 'click','scroll','print','visibility_change'), `event_data` (jsonb default '{}'), `page_path` (text not null), `created_at` (timestamptz default now())

Indexes: `page_views(created_at)`, `page_views(visitor_hash)`, `page_views(session_id)`, `visitor_events(created_at)`, `visitor_events(session_id)`

### 2.2 GeoIP Lookup Table
**File:** `database/init/02_tables.sql` (append)

- **`internal.geoip_ranges`** — `id` (int8 identity PK), `ip_start` (inet not null), `ip_end` (inet not null), `country_code` (text), `country_name` (text), `region` (text), `city` (text), `updated_at` (timestamptz default now())

Index: `geoip_ranges` using `gist` on an IP range (or btree on `ip_start, ip_end` with a range query pattern).

**Data loading**: Create a migration script or admin endpoint to import GeoLite2 CSV data. MaxMind provides free GeoLite2-City-Blocks-IPv4.csv and GeoLite2-City-Locations-en.csv. The import can be done via bastion host initially, with periodic updates.

**Lookup function**: `api.geoip_lookup(p_ip text)` — returns country, region, city for a given IP using the range table.

### 2.3 Analytics Functions
**File:** `database/init/03_functions.sql` (append)

- **`api.insert_page_view(p_data jsonb)`** — Insert page view. If GeoIP table has data, enrich country/region/city at insert time via `api.geoip_lookup()`.
- **`api.insert_visitor_event(p_data jsonb)`** — Insert interaction event.
- **`api.get_analytics_summary(p_filters jsonb default '{}')`** — Dashboard overview: total page views, unique visitors, unique sessions, top pages (by views), top referrers, device breakdown, browser breakdown, OS breakdown. Filterable by date range, page_path.
- **`api.get_analytics_visitors(p_filters jsonb default '{}')`** — Visitor-level data: pages per session, estimated session duration (time between first and last event), return visitor detection (visitor_hash seen on multiple days), top visitor hashes.
- **`api.get_analytics_geo(p_filters jsonb default '{}')`** — Geographic breakdown: visitors by country, region, city. Filterable by date range.
- **`api.purge_analytics(p_days int default 90)`** — Delete page_views and visitor_events older than N days.

### 2.4 Bot Detection
In the backend endpoint (not DB function), classify before insert:
- Known bot User-Agent regex patterns (Googlebot, Bingbot, Slurp, DuckDuckBot, Baiduspider, YandexBot, facebookexternalhit, Twitterbot, etc.)
- Headless browser indicators (HeadlessChrome, PhantomJS)
- Missing/empty User-Agent
- The `is_bot` flag is stored on `page_views` so bot traffic can be filtered in/out of analytics queries

### 2.5 Frontend Tracker
**File:** `frontend/src/services/analytics.ts` (new, ~2KB)

Lightweight, privacy-respecting tracker:
- **Visitor fingerprint**: SHA-256 hash of `navigator.userAgent + screen.width + screen.height + navigator.language + timezone + colorDepth`. One-way hash, not reversible.
- **Session ID**: Random UUID stored in `sessionStorage` (new per tab, cleared on close). Regenerated after 30 min inactivity.
- **Page views**: Sent on React Router route changes. Captures: path, title, referrer, UTM params (from URL), device type (derived from screen width), browser/OS (from UA), screen dimensions, language, timezone.
- **Click tracking**: Delegated listener on outbound links (`<a>` with external href or `target="_blank"`). Captures: link URL, link text, page path.
- **Scroll depth**: Intersection Observer on sentinel elements at 25/50/75/100% of page height. Fires once per threshold per page view.
- **Print tracking**: `window.onbeforeprint` event.
- **Batching**: Queues events, sends every 5 seconds or on `visibilitychange` (tab hidden/closed). Uses `navigator.sendBeacon()` for reliability on page unload.
- **Do Not Track**: Respects `navigator.doNotTrack === "1"` — disables all tracking.

**File:** `frontend/src/hooks/useAnalytics.ts` (new)

React hook:
- Initializes tracker on mount
- Listens to React Router location changes, sends page view on each
- Cleans up on unmount

**Integration**: Call `useAnalytics()` in the root layout component.

### 2.6 Analytics API (Public)
**File:** `backend/src/app/routers/analytics.py` (new)

- `POST /api/analytics/event` — **Public**, no auth. Rate-limited: 30/minute per IP. Accepts `{type: "page_view"|"event", data: {...}}`. Validates with Pydantic schema. Sets `client_ip` server-side (never trust client). Runs bot detection. Calls `api.insert_page_view()` or `api.insert_visitor_event()`.

Register in `backend/src/app/main.py`.

### 2.7 Schemas
**File:** `backend/src/app/schemas/analytics.py` (new)

Pydantic models with strict validation:
- Max string lengths (page_path: 2048, referrer: 2048, all others: 256)
- Enum validation on event_type, device_type
- Optional fields properly typed
- Max payload ~4KB enforced

### 2.8 Admin Analytics Endpoints
**File:** `backend/src/app/routers/admin.py` (extend)

All require `Depends(get_admin_auth)`:
- `GET /api/admin/analytics/summary` → `api.get_analytics_summary()`
- `GET /api/admin/analytics/visitors` → `api.get_analytics_visitors()`
- `GET /api/admin/analytics/geo` → `api.get_analytics_geo()`

### 2.9 Skip Analytics in Request Logging
**File:** `backend/src/app/middleware/logging.py`

Add `/api/analytics/event` to `_SKIP_PATHS` to prevent feedback loop.

### 2.10 Analytics Retention
Extend maintenance Lambda to purge analytics data older than 90 days and VACUUM analytics tables.

### 2.11 CDK Migration Version Bump
**File:** `infrastructure/cdk/lib/data-stack.ts`

Bump `version` from `"12"` to `"13"`.

### 2.12 Security Considerations
- **Rate limiting**: 30 events/minute per IP on public endpoint
- **Payload size**: Max 4KB per event, enforced by Pydantic schema
- **No PII**: visitor_hash is a one-way SHA-256 hash
- **IP storage**: Stored for GeoIP enrichment; consider hashing after enrichment in future
- **CSP**: No changes needed (same-origin API calls)
- **CORS**: Already configured for frontend origin
- **Abuse prevention**: Bot detection, rate limiting, payload validation

---

## File Summary

### PR 1: Database Metrics
| File | Action | Description |
|------|--------|-------------|
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Add PG params to parameter group, bump migration to "12" |
| `infrastructure/cdk/lib/app-stack.ts` | Edit | Add hourly EventBridge rule for metrics capture |
| `database/init/00_extensions.sql` | Edit | Enable pg_stat_statements |
| `database/init/02_tables.sql` | Edit | Add 6 metric snapshot tables |
| `database/init/03_functions.sql` | Edit | Add capture + 7 query functions |
| `backend/src/lambda_handler.py` | Edit | Add metrics capture + maintenance dispatch |
| `backend/src/app/routers/admin.py` | Edit | Add 7 metrics admin endpoints |
| `backend/src/app/services/db_functions.py` | Edit | Add 7 DatabaseAPI methods |
| `README.md` | Edit | Document DB metrics feature |

### PR 2: Visitor Analytics
| File | Action | Description |
|------|--------|-------------|
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Bump migration to "13" |
| `database/init/02_tables.sql` | Edit | Add page_views, visitor_events, geoip_ranges tables |
| `database/init/03_functions.sql` | Edit | Add analytics + GeoIP functions |
| `backend/src/app/routers/analytics.py` | Create | Public analytics event endpoint |
| `backend/src/app/routers/admin.py` | Edit | Add 3 analytics admin endpoints |
| `backend/src/app/schemas/analytics.py` | Create | Pydantic models for analytics |
| `backend/src/app/services/db_functions.py` | Edit | Add analytics DatabaseAPI methods |
| `backend/src/app/main.py` | Edit | Register analytics router |
| `backend/src/app/middleware/logging.py` | Edit | Skip analytics path in request logging |
| `backend/src/lambda_handler.py` | Edit | Add analytics purge to maintenance |
| `frontend/src/services/analytics.ts` | Create | Lightweight visitor tracker (~2KB) |
| `frontend/src/hooks/useAnalytics.ts` | Create | React hook for tracker |
| `frontend/src/layouts/*.tsx` | Edit | Wire up useAnalytics hook |
| `README.md` | Edit | Document visitor analytics feature |

## Verification

### PR 1: Database Metrics
1. Deploy and verify RDS reboot completes (check RDS console for "available" status)
2. Connect via bastion: `SELECT * FROM pg_stat_statements LIMIT 5;` returns data
3. Verify function tracking: `SELECT * FROM pg_stat_user_functions;` shows call stats
4. Manual capture: `POST /api/admin/metrics/capture` → verify `internal.metric_snapshots` has a row
5. Verify snapshot data: query `internal.stat_statements_history` has rows matching the snapshot
6. Test plan instability endpoint: `GET /api/admin/metrics/plan-instability`
7. Wait 1 hour, verify automatic snapshot appears
8. Check CloudWatch Logs for auto_explain output (run a slow query via bastion to trigger)

### PR 2: Visitor Analytics
1. Visit frontend, navigate between pages
2. Verify `internal.page_views` has entries via bastion or admin API
3. Click an outbound link → verify `internal.visitor_events` has click event
4. Scroll resume page → verify scroll depth events (25/50/75/100%)
5. `GET /api/admin/analytics/summary` returns visitor counts
6. Bot detection: `curl -X POST .../api/analytics/event -H "User-Agent: Googlebot"` → `is_bot = true`
7. Rate limiting: send 31 events in 1 minute → 429 response
8. Do Not Track: verify tracker doesn't send events when `navigator.doNotTrack === "1"`

### Both PRs
- `cd backend && uv run pytest`
- `cd frontend && npx vitest run`
- `cd frontend && npx tsc --noEmit`
- `cd backend && uv run ruff check && uv run ruff format --check`
