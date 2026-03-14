# Plan: Generic Seed Data, Optional Seeding, and Resume Title

## Context

The seed data in `database/init/05_seed_data.sql` contains real personal information (real companies, real people's names, real contact info). This needs to be replaced with generic fictional data so the repo can be shared or forked without exposing personal details. Additionally, seed data should be optional in deployments (default: excluded), and a new `resume_title` table should be added with full-stack admin support.

**Branch:** `feature/generic-seed-and-resume-title`

---

## Task 1: Replace Personal Seed Data with Generic Data

**File:** `database/init/05_seed_data.sql` (moves to `database/seed/` in Task 2)

Replace all real personal data with fictional equivalents while preserving the same structure and volume:

- **Professional entries (5):** Replace company names (Verra Mobility -> Acme Technologies, etc.), titles, descriptions, highlights, technologies
- **Performance reviews (12):** Replace reviewer names with generic names, update review text, update org subquery references to match new company names
- **Resume summary:** Generic professional summary
- **Resume contact:** `jane.doe@example.com`, `https://www.linkedin.com/in/jane-doe`, `https://github.com/jane-doe`
- **Recommendations (4):** Replace all real names (Eduardo Camacho, etc.) with generic names, update titles and text

---

## Task 2: Make Seed Data Optional (Default: Exclude)

### Step 2a: Relocate seed file
- `git mv database/init/05_seed_data.sql database/seed/05_seed_data.sql`

### Step 2b: Create `dev.sh` script
Wrapper script for `docker compose up` with a `--seed` flag (or `SEED_DATA=true` env var).
When enabled, waits for DB health then runs `database/seed/05_seed_data.sql` via psql.
Usage: `./dev.sh --seed` or `SEED_DATA=true ./dev.sh`.

### Step 2c: Update CI workflow — `.github/workflows/ci.yml`
- Add `workflow_dispatch` trigger with `seed_data` input (default: `false`)
- Add conditional "Load seed data" step after init scripts, gated on `inputs.seed_data == 'true'`

### Step 2d: CDK — No changes needed
Lambda bundling only copies from `database/init/`. Production naturally excludes seed data after the move.

### Step 2e: Update migration handler docstring
`infrastructure/cdk/lib/migration-handler/index.py` line 3: change "(00–05)" to "(00–04)".

---

## Task 3: Add `resume_title` Table with Full-Stack Support

Follows the established `resume_summary` / `resume_contact` single-row table pattern.

### Step 3a: Database table — `database/init/02_tables.sql`
Add after `resume_summary` table:
```sql
create table if not exists internal.resume_title
(
  id           int4 generated always as identity primary key,
  title        text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
comment on table internal.resume_title is 'Single-row table holding the resume page title';
comment on column internal.resume_title.title is 'The title displayed at the top of the resume page';
```

### Step 3b: Database functions — `database/init/03_functions.sql`

**New function** `api.upsert_resume_title(p_data jsonb)` — follows `upsert_resume_summary` pattern (check exists -> update or insert).

**Modify** `api.get_resume()`:
- Add `v_title jsonb` to declare block
- Query `internal.resume_title` into `v_title`
- Add title to `v_sections` assembly

### Step 3c: Permissions — `database/init/04_permissions.sql`
No changes needed. `grant execute on all functions in schema api` and `alter default privileges` already cover new functions. Table is in `internal` schema (already revoked from `app_user`).

### Step 3d: Seed data — `database/seed/05_seed_data.sql`
Add title seed block:
```sql
do $$
begin
    if not exists (select 1 from internal.resume_title limit 1) then
        insert into internal.resume_title (title) values ('Senior Software Engineer');
    end if;
end
$$;
```

### Step 3e: Backend schema — `backend/src/app/schemas/resume.py`
Add `ResumeTitleCreate(BaseModel)` with field `title: str`.

### Step 3f: Backend DatabaseAPI — `backend/src/app/services/db_functions.py`
Add `upsert_resume_title` method following `upsert_resume_summary` pattern (line 46-52).

### Step 3g: Backend router — `backend/src/app/routers/admin.py`
Add `POST /resume/title` endpoint with `Depends(get_admin_auth)`, following `upsert_resume_summary` pattern (line 57-63).

### Step 3h: Backend tests
- `backend/tests/conftest.py`: Add `mock.upsert_resume_title.return_value = {"success": True}` to `mock_db_api` fixture
- `backend/tests/test_admin.py`: Add `test_upsert_resume_title` test following `test_upsert_resume_summary` pattern

### Step 3i: Frontend types — `frontend/src/types/index.ts`
Add `ResumeTitleCreate` interface with `title: string`.

### Step 3j: Frontend API service — `frontend/src/services/api.ts`
Add `upsertTitle` to `api.admin.resume` object, following `upsertSummary` pattern (line 71-76).

### Step 3k: Frontend hook — `frontend/src/hooks/useAdminApi.ts`
Add `useAdminUpsertResumeTitle` hook following `useAdminUpsertResumeSummary` pattern (line 51-62).

### Step 3l: Frontend admin UI — `frontend/src/pages/admin/ResumeEditor.tsx`
- Add `titleText`/`titleDirty` state variables
- Extract `titleSection` from resume data
- Add reset logic in `resetSectionForms()`
- Add Title form block as first item in "Sections" tab (before Summary), with FormInput and Save button
- Import and instantiate `useAdminUpsertResumeTitle`

### Step 3m: Public resume page — `frontend/src/pages/Resume.tsx`
Display the title from `sections.title.title` as an `<h1>` in the header, before the profile image/summary block.

---

## Implementation Sequence

1. Create branch `feature/generic-seed-and-resume-title`
2. Task 2a: `git mv` seed file to `database/seed/`
3. Task 1: Rewrite seed data with generic content
4. Task 2b-2e: Update docker-compose.yml and migration handler docstring
5. Task 3a-3d: Database changes (table, functions, seed data)
6. Task 3e-3h: Backend changes (schema, DatabaseAPI, router, tests)
7. Task 3i-3m: Frontend changes (types, API, hook, admin UI, public page)

## Files to Modify

| File | Change |
|------|--------|
| `database/init/05_seed_data.sql` | Move to `database/seed/`, rewrite with generic data |
| `database/init/02_tables.sql` | Add `resume_title` table |
| `database/init/03_functions.sql` | Add `upsert_resume_title`, modify `get_resume` |
| `database/seed/05_seed_data.sql` | Add title seed block |
| `dev.sh` | New script: `docker compose up` with `--seed` flag |
| `.github/workflows/ci.yml` | Add `workflow_dispatch` seed_data input and conditional step |
| `infrastructure/cdk/lib/migration-handler/index.py` | Update docstring |
| `backend/src/app/schemas/resume.py` | Add `ResumeTitleCreate` |
| `backend/src/app/services/db_functions.py` | Add `upsert_resume_title` method |
| `backend/src/app/routers/admin.py` | Add POST `/resume/title` endpoint |
| `backend/tests/conftest.py` | Add mock return value |
| `backend/tests/test_admin.py` | Add title endpoint test |
| `frontend/src/types/index.ts` | Add `ResumeTitleCreate` interface |
| `frontend/src/services/api.ts` | Add `upsertTitle` API call |
| `frontend/src/hooks/useAdminApi.ts` | Add `useAdminUpsertResumeTitle` hook |
| `frontend/src/pages/admin/ResumeEditor.tsx` | Add Title form in Sections tab |
| `frontend/src/pages/Resume.tsx` | Display title from API response |

## Verification

1. `cd backend && uv run ruff check && uv run ruff format --check`
2. `cd backend && uv run pytest`
3. `cd frontend && npx tsc --noEmit`
4. `cd frontend && npx vitest run`
5. Confirm `database/init/` no longer contains seed data
6. Confirm `database/seed/05_seed_data.sql` has no personal data
7. `docker compose up` works without seed data
8. Uncommenting the seed mount and re-initializing loads generic seed data
