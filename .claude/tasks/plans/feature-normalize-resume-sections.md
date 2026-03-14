# Normalize `resume_sections` Table & Add Summary Form Editor

## Context
The resume editor's Sections tab uses a raw JSON textarea for all section types. This breaks when entering line breaks in the summary text (literal newlines are invalid JSON). Beyond fixing that, the user wants to normalize the polymorphic `resume_sections` table (which stores different structures in a single `jsonb` column) into properly typed tables per section type.

## Scope of Changes

### 1. Database Tables — `database/init/02_tables.sql`
Remove `internal.resume_sections` and replace with three typed tables:

- **`internal.resume_summary`** — single-row: `headline text`, `text text not null`, timestamps
- **`internal.resume_contact`** — single-row: `linkedin text`, `github text`, `email text`, timestamps
- **`internal.resume_recommendations`** — multi-row: `author text not null`, `title text not null`, `text text not null`, `sort_order int4`, timestamps

All with `identity` PKs and table/column comments per project conventions.

### 2. Database Functions — `database/init/03_functions.sql`
- **`api.get_resume()`** — Rewrite sections aggregation to query the three tables individually, build the **same output shape** (`{ sections: { summary: {...}, contact: {...}, recommendations: {...} }, entries: {...} }`) so the public Resume page needs minimal changes.
- **`api.get_contact_info()`** — Query `resume_contact` directly.
- **Remove `api.upsert_resume_section()`** — Replace with three typed functions:
  - `api.upsert_resume_summary(p_data jsonb)` — upsert single row
  - `api.upsert_resume_contact(p_data jsonb)` — upsert single row
  - `api.replace_resume_recommendations(p_items jsonb)` — delete-all + insert from array

### 3. Seed Data — `database/init/05_seed_data.sql`
Replace the `resume_sections` insert block with three separate inserts into the new tables.

### 4. Production Migration — `database/migrations/001_normalize_resume_sections.sql`
One-time migration script that creates new tables, migrates data from `resume_sections`, drops old table, and replaces functions.

### 5. Backend Schemas — `backend/src/app/schemas/resume.py`
Replace `ResumeSectionCreate` with:
- `ResumeSummaryCreate` — `headline: str | None`, `text: str`
- `ResumeContactCreate` — `linkedin: str | None`, `github: str | None`, `email: str | None`
- `ResumeRecommendationsReplace` — `items: list[ResumeRecommendationItem]`

### 6. Backend DatabaseAPI — `backend/src/app/services/db_functions.py`
Replace `upsert_resume_section()` with `upsert_resume_summary()`, `upsert_resume_contact()`, `replace_resume_recommendations()`.

### 7. Backend Router — `backend/src/app/routers/admin.py`
Replace `POST /resume/section` with:
- `POST /resume/summary`
- `POST /resume/contact`
- `POST /resume/recommendations`

### 8. Frontend Types — `frontend/src/types/index.ts`
Replace `ResumeSectionCreate` / `ResumeSection` with `ResumeSummaryCreate`, `ResumeContactCreate`, `ResumeRecommendationsReplace`. Keep `ResumeData` unchanged (same shape from API).

### 9. Frontend API — `frontend/src/services/api.ts`
Replace `upsertSection` with `upsertSummary`, `upsertContact`, `replaceRecommendations`.

### 10. Frontend Hooks — `frontend/src/hooks/useAdminApi.ts`
Replace `useAdminUpsertResumeSection` with `useAdminUpsertResumeSummary`, `useAdminUpsertResumeContact`, `useAdminReplaceRecommendations`.

### 11. Frontend Admin Editor — `frontend/src/pages/admin/ResumeEditor.tsx`
Replace the JSON textarea modal with inline typed forms:
- **Summary**: `FormInput` for headline + `FormTextarea` for text (plain text, line breaks preserved naturally)
- **Contact**: `FormInput` for linkedin, github, email
- **Recommendations**: Keep JSON textarea for now (batch replace via `replaceRecommendations`)
- Remove: `editingSectionType`, `sectionContent`, `openSectionEditor`, `saveSectionContent` state/modal

### 12. Frontend Resume Display — `frontend/src/pages/Resume.tsx`
Add `whitespace-pre-line` to the summary text `<p>` tag so `\n` characters render as line breaks.

### 13. Tests
- Backend: Replace `test_create_resume_section` with tests for each new endpoint
- Frontend: Update `ResumeEditor.test.tsx` mocks/assertions for new hooks and form elements

## Implementation Order
1. Database tables + seed data
2. Database functions
3. Migration script
4. Backend schemas → DatabaseAPI → router
5. Frontend types → API → hooks → editor component → Resume page
6. Tests
7. Verification

## Verification
1. `docker compose down -v && docker compose up` — verify tables, seed data, `SELECT api.get_resume()` returns same shape
2. `cd backend && uv run ruff check && uv run ruff format --check`
3. `cd backend && uv run pytest`
4. `cd frontend && npx tsc --noEmit`
5. `cd frontend && npx vitest run`
6. Manual: Admin → Sections → verify Summary form (headline + text with line breaks), Contact form, save each
7. Manual: Public `/resume` page → verify summary line breaks render correctly
8. API: Verify `/api/resume/` returns `{ sections: { summary, contact, recommendations }, entries }` unchanged
