# Plan: Dynamic Contact Links from Database

## Context
The `SocialIcons` component (`frontend/src/components/SocialIcons.tsx`) hard-codes LinkedIn, GitHub, and email URLs. The database already stores contact data in `internal.resume_sections` (section_type = `'contact'`), but the component doesn't use it. This change wires the component to fetch contact links from the database.

## Current State
- **Seed data** (`database/init/05_seed_data.sql:205-211`): Has `linkedin` and `github` URLs but **no email**
- **DB function** `api.get_resume()` returns all sections including contact, but it's heavy (includes all entries, reviews, etc.)
- **SocialIcons** is rendered in `MainLayout.tsx` on every page — needs a lightweight data source

## Changes

### 1. Add email to seed data
**File:** `database/init/05_seed_data.sql`
- Add `"email": "email@jasonrowland.me"` to the contact section JSONB

### 2. New DB function: `api.get_contact_info()`
**File:** `database/init/03_functions.sql`
- Simple function that returns `content` from `internal.resume_sections` where `section_type = 'contact'`
- Returns `jsonb`

### 3. New backend route
**File:** `backend/src/app/services/db_functions.py` — add `get_contact_info()` method to `DatabaseAPI`
**File:** `backend/src/app/routers/resume.py` — add `GET /api/resume/contact` endpoint

### 4. Frontend API + types
**File:** `frontend/src/services/api.ts` — add `api.resume.contact()` method
**File:** `frontend/src/types/index.ts` — add `ContactInfo` interface

### 5. Update SocialIcons component
**File:** `frontend/src/components/SocialIcons.tsx`
- Use TanStack Query to fetch contact info via `api.resume.contact()`
- Render links conditionally based on what's returned
- Return null while loading
- `staleTime: Infinity` since contact info rarely changes

## Verification
1. `cd backend && uv run ruff check && uv run ruff format --check`
2. `cd frontend && npx tsc --noEmit`
3. `cd frontend && npx vitest run`
4. Manual: verify icons render with correct hrefs from DB data
5. Manual: verify removing a key from DB contact JSONB hides that icon
