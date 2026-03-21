# Add client_ip Filter to Dashboard Threat Detection & Log Detail

**Branch**: `feature/dashboard-ip-filter`
**Status**: Planning

## Context

The admin dashboard shows threat detection data and log details but has no way to filter by IP address. When investigating a suspicious IP in the threat detection section, the user must manually cross-reference with the log table. This feature adds a clickable IP filter that works across both sections, plus a "Log Detail" heading for clarity.

## Changes

### 1. SQL — Add `client_ip` filter to both stored functions
**File(s):** `database/init/03_functions.sql`, `database/migrations/004_add_client_ip_filter.sql`

- Add `v_client_ip text := p_filters->>'client_ip';` to declare block of both `api.get_app_logs` (line 458) and `api.get_threat_detections` (line 554)
- **`api.get_app_logs`**: Add `and (v_client_ip is null or al.client_ip = v_client_ip)` to both WHERE clauses (count at line 470 and fetch at line 495)
- **`api.get_threat_detections`**: Add the same filter to:
  - `threat_patterns` CTE (after line 577)
  - `brute_force_ips` CTE (after line 584)
  - brute_force branch of `all_threats` UNION ALL (after line 601)
- Create migration `004_add_client_ip_filter.sql` with `CREATE OR REPLACE FUNCTION` for both functions
- Bump CDK migration version from `"8"` to `"9"` in `infrastructure/cdk/lib/data-stack.ts:147`

### 2. Backend — Add `client_ip` query parameter to endpoints
**File(s):** `backend/src/app/routers/admin.py`

- `get_logs` (line 119): Add `client_ip: str | None = None` parameter, include in filters dict
- `get_threat_detections` (line 148): Add `client_ip: str | None = None` parameter, include in filters dict

No changes to `db_functions.py` — it already passes filters as arbitrary JSONB dict.

### 3. Frontend API service — Pass `client_ip` in requests
**File(s):** `frontend/src/services/api.ts`

- `logs.list` (line 74): Add `client_ip?: string` to params type, add `if (params.client_ip) qs.set("client_ip", params.client_ip);`
- `logs.threats` (line 96): Change signature from `(days: number = 30)` to `(params: { days?: number; client_ip?: string } = {})`, build URL with URLSearchParams

### 4. Frontend hooks — Accept `client_ip` in filter types
**File(s):** `frontend/src/hooks/useAdminApi.ts`

- `useAdminLogs` (line 19): Add `client_ip?: string` to filters type
- `useAdminThreatDetections` (line 40): Change from `(days: number = 30)` to `(params: { days?: number; client_ip?: string } = {})`, update queryKey and queryFn

### 5. Frontend Dashboard — IP filter state, clickable IPs, heading, clear button
**File(s):** `frontend/src/pages/admin/Dashboard.tsx`

- **Add state**: `const [clientIpFilter, setClientIpFilter] = useState<string | null>(null);` in `Dashboard` component
- **Pass to logs query**: Add `...(clientIpFilter ? { client_ip: clientIpFilter } : {})` to `filters` object (line 278)
- **ThreatDetectionSection**: Add props `clientIpFilter: string | null` and `onIpClick: (ip: string) => void`. Pass `client_ip` to `useAdminThreatDetections`.
- **ThreatDetailRow**: Add `onIpClick` prop. Make `client_ip` cell a clickable blue link button with `e.stopPropagation()`.
- **LogDetailRow**: Add `onIpClick` prop. Make `client_ip` text a clickable blue link button.
- **IP filter indicator**: Between threat detection and log sections, show a blue banner with the filtered IP and a "Clear" button when filter is active. Clearing resets page to 0.
- **"Log Detail" heading**: Add `<h2>` with text "Log Detail" above the filter bar (before line 354)
- **Reset pagination**: When setting IP filter, also `setPage(0)`

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/init/03_functions.sql` | Edit | Add `client_ip` filter to `get_app_logs` and `get_threat_detections` |
| `database/migrations/004_add_client_ip_filter.sql` | Create | Migration with updated function definitions |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Bump migration version `"8"` → `"9"` |
| `backend/src/app/routers/admin.py` | Edit | Add `client_ip` query param to logs and threats endpoints |
| `frontend/src/services/api.ts` | Edit | Pass `client_ip` in API calls |
| `frontend/src/hooks/useAdminApi.ts` | Edit | Accept `client_ip` in hook filter types |
| `frontend/src/pages/admin/Dashboard.tsx` | Edit | IP filter state, clickable IPs, clear button, "Log Detail" heading |

## Security Notes

- `client_ip` is passed as a JSONB string filter and compared with `=` — no SQL injection risk
- Both endpoints already require `Depends(get_admin_auth)` — no additional auth needed
- No user-supplied input is rendered as HTML — React escapes by default

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check` — lint passes
2. `cd backend && uv run pytest` — backend tests pass
3. `cd frontend && npx tsc --noEmit` — TypeScript compiles
4. `cd frontend && npx vitest run` — frontend tests pass
5. Manual: Open admin dashboard, expand threat detection, click an IP → both sections filter to that IP
6. Manual: Click "Clear" → filter removed, both sections show all data
7. Manual: "Log Detail" heading visible above the log filter bar
8. Manual: Expand a log row, click IP in detail → same filter behavior
