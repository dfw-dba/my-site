# Public Visitor Analytics in Hamburger Menu

**Branch**: `feature/public-visitor-analytics`
**Status**: In Progress

## Context

The resume page has a hamburger menu with only a "Resume" link. The user wants to add a "Visitor Analytics" section that displays the same analytics dashboard currently only available in the admin panel. Analytics data should be publicly accessible (no auth required).

## Changes

### 1. Add public analytics API endpoints (backend)
**File:** `backend/src/app/routers/analytics.py`

Add 4 new GET endpoints to the existing public analytics router (which already has `POST /event`):
- `GET /summary` — calls `db.get_analytics_summary(filters)`
- `GET /visitors` — calls `db.get_analytics_visitors(filters)`
- `GET /geo` — calls `db.get_analytics_geo(filters)`
- `GET /timeseries` — calls `db.get_analytics_timeseries(filters)`

No auth, rate limit 30/min. Strip sensitive fields (top_sessions, return_visitors) from public visitors response.

### 2. Add public analytics API client functions (frontend)
**File:** `frontend/src/services/api.ts`

Add `api.analytics.*` public API client functions (no auth headers).

### 3. Add public analytics React Query hooks
**File:** `frontend/src/hooks/useAnalyticsData.ts` (new)

4 hooks calling `api.analytics.*` with unique query keys.

### 4. Create public VisitorAnalytics page
**File:** `frontend/src/pages/Analytics.tsx` (new)

Same UI as `VisitorAnalyticsTab.tsx` but with public hooks and light/dark theme support.

### 5. Add route for analytics page
**File:** `frontend/src/routes/index.tsx`

Add `/analytics` route under MainLayout.

### 6. Add link in hamburger menu
**File:** `frontend/src/components/HamburgerMenu.tsx`

Add "Visitor Analytics" link.

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/src/app/routers/analytics.py` | Edit | Add 4 public GET endpoints |
| `frontend/src/services/api.ts` | Edit | Add public analytics API client |
| `frontend/src/hooks/useAnalyticsData.ts` | Create | Public analytics hooks |
| `frontend/src/pages/Analytics.tsx` | Create | Public analytics page |
| `frontend/src/routes/index.tsx` | Edit | Add /analytics route |
| `frontend/src/components/HamburgerMenu.tsx` | Edit | Add menu link |

## Verification

1. Backend lint + tests pass
2. Frontend type check + tests pass
3. Local dev: hamburger menu → Visitor Analytics → dashboard loads
4. Light/dark theme works on analytics page
