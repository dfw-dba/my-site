# Admin UI Implementation Plan

## Context
The site has a fully implemented backend admin API (`/api/admin/*`) with tested endpoints for blog, showcase, resume, media, and albums. The frontend has route stubs but no actual admin functionality. This plan builds the complete admin UI across 6 sprints.

## Decisions
- **Scope**: All editors (Dashboard, Blog, Showcase, Resume, Media/Albums)
- **Blog editing**: Markdown textarea + live preview (split pane, reuses existing `MarkdownRenderer`)
- **Auth**: Hardcode dev key for now (single-point-of-change later)
- **Layout**: Collapsible sidebar navigation
- **Form state**: Plain `useState` (no form library)
- **Hooks**: Separate `useAdminApi.ts` file to keep admin/public hooks separated

## Backend Gaps to Close (Sprint 1)
1. **No "list all blog posts" admin endpoint** — public `get_blog_posts` filters `WHERE published = TRUE`. Need `api.admin_get_blog_posts` SQL function + `GET /api/admin/blog` endpoint.
2. **No "list all media" endpoint** — `get_media_by_category` requires a category. Need `api.admin_get_all_media` SQL function + `GET /api/admin/media` endpoint.
3. **No `DELETE /resume/entry/{id}`** — SQL function exists but router doesn't expose it. One-line addition.

---

## Sprint 1: Foundation

### 1a. Backend Fixes
| File | Change |
|------|--------|
| `database/init/03_functions.sql` | Add `api.admin_get_blog_posts(p_limit, p_offset)` and `api.admin_get_all_media(p_limit, p_offset)` |
| `backend/src/app/services/db_functions.py` | Add corresponding methods |
| `backend/src/app/routers/admin.py` | Add `GET /blog`, `GET /media`, `DELETE /resume/entry/{id}` |
| `backend/tests/test_admin.py` | Tests for new endpoints |

### 1b. Frontend API Layer
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add request types: `BlogPostCreate`, `ShowcaseItemCreate`, `ResumeEntryCreate`, `ResumeSectionCreate`, `UploadUrlRequest`, `UploadUrlResponse`, `MediaRegister`, `AlbumCreate`, plus admin list response types |
| `frontend/src/services/api.ts` | Add `admin` namespace with all CRUD methods + `adminHeaders()` helper |
| `frontend/src/hooks/useAdminApi.ts` (NEW) | Query hooks for admin lists, mutation hooks for all upsert/delete operations |

### 1c. Shared Admin Components (all NEW in `frontend/src/components/admin/`)
| Component | Purpose |
|-----------|---------|
| `AdminSidebar.tsx` | Collapsible sidebar nav (Dashboard, Blog, Showcase, Resume, Media). Dark theme, active link highlighting, localStorage collapse state, "Back to Site" link |
| `FormInput.tsx` | Labeled text input with dark mode |
| `FormTextarea.tsx` | Labeled textarea |
| `FormSelect.tsx` | Labeled dropdown |
| `FormToggle.tsx` | Toggle switch (for published boolean) |
| `TagInput.tsx` | Multi-value input for tags/technologies (Enter/comma to add, pill display, removable) |
| `ListInput.tsx` | Ordered list editor for highlights (add/remove items) |
| `DataTable.tsx` | Generic table with columns config + action buttons. Cards on mobile |
| `ConfirmModal.tsx` | Delete confirmation dialog |
| `StatCard.tsx` | Dashboard overview card with count |
| `SaveBar.tsx` | Sticky bottom bar: Save/Cancel/Delete buttons |

### 1d. Layout & Routes
| File | Change |
|------|--------|
| `frontend/src/pages/admin/AdminLayout.tsx` | Rewrite: sidebar + content area layout with `<AdminSidebar />` + `<Outlet />` |
| `frontend/src/routes/index.tsx` | Add nested routes: `admin/blog/new`, `admin/blog/:slug`, `admin/showcase/new`, `admin/showcase/:slug`, `admin/albums` |

**Acceptance**: Backend tests pass, sidebar renders with working nav, API methods compile, shared components render.

---

## Sprint 2: Dashboard + Blog Editor

### Dashboard (`Dashboard.tsx` rewrite)
- StatCards grid: Blog Posts count, Showcase Items count, Albums count
- Quick action buttons linking to create routes

### Blog List (`BlogEditor.tsx` rewrite)
- `useAdminBlogPosts()` hook for all posts including drafts
- DataTable: title, slug, published badge, tags pills, updated_at, Edit/Delete actions
- "New Post" button, delete via ConfirmModal

### Blog Form (`BlogEditForm.tsx` NEW)
- Route: `/admin/blog/new` (blank) and `/admin/blog/:slug` (pre-filled)
- Fields: title, slug (auto-gen from title), excerpt, content (markdown textarea, rows=20), tags (TagInput), published (FormToggle)
- Split pane: form left, `<MarkdownRenderer>` preview right (`grid-cols-2` on lg+, stacked on smaller)
- SaveBar with Save/Cancel/Delete
- Slug auto-gen: `title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`

**Acceptance**: Dashboard shows live counts. Blog CRUD works end-to-end. Markdown preview updates live. Published toggle works.

---

## Sprint 3: Showcase Editor

### List (`ShowcaseEditor.tsx` rewrite)
- Uses existing `useShowcaseItems()` (public endpoint returns all)
- DataTable: title, slug, category badge, technologies pills, sort_order, actions

### Form (`ShowcaseEditForm.tsx` NEW)
- Fields: title, slug, description, content (markdown), category (select), technologies (TagInput), demo_url, repo_url, sort_order
- SaveBar

**Acceptance**: Showcase CRUD works end-to-end.

---

## Sprint 4: Resume Editor

### Main View (`ResumeEditor.tsx` rewrite)
- Two tabs: "Sections" and "Professional Entries"
- Uses `useResume()` for all data

### Sections Tab
- Cards per section type (summary, skills, contact, about)
- Inline editors: textarea for summary/about, structured fields for skills/contact
- Save via `useAdminResumeUpsertSection`

### Entries Tab
- DataTable: title, organization, entry_type badge, dates, actions
- "New Entry" button, delete via ConfirmModal

### Entry Form (`ResumeEntryForm.tsx` NEW — modal)
- Fields: entry_type (select), title, organization, location, start_date, end_date, description, highlights (ListInput), technologies (TagInput), sort_order
- Save via `useAdminResumeUpsertEntry`

**Acceptance**: Section editing works. Entry CRUD works. Highlights list editor and date pickers functional.

---

## Sprint 5: Media Manager + Albums

### Media Grid (`MediaManager.tsx` rewrite)
- Two tabs: "Media" and "Albums"
- Media tab: grid of items via `useAdminMediaList()` with thumbnails
- Click to select: caption editing, album assignment, sort_order
- Upload zone: drag-and-drop + file picker
  - Flow: `getUploadUrl` → S3 PUT → `register` (reads image dimensions via `createImageBitmap`)

### Albums (`AlbumEditor.tsx` NEW, or tab within MediaManager)
- Album list with DataTable
- Create/edit form: title, slug, description, category select, sort_order, cover image selector
- Delete via ConfirmModal

**Acceptance**: Upload works end-to-end. Media grid with thumbnails. Album CRUD works. Media assignable to albums.

---

## Sprint 6: Polish + Testing

- Error handling: inline/toast errors on mutation failures, form validation
- Unsaved changes warning (route blocker / `beforeunload`)
- Responsive verification: mobile sidebar overlay, stacked split pane, card-based tables
- Frontend tests in `frontend/tests/admin/` for all admin pages

---

## File Summary

**Backend** (4 files modified): `03_functions.sql`, `db_functions.py`, `admin.py`, `test_admin.py`

**Frontend new files** (16):
- `hooks/useAdminApi.ts`
- `components/admin/` — 11 shared components
- `pages/admin/BlogEditForm.tsx`, `ShowcaseEditForm.tsx`, `ResumeEntryForm.tsx`, `AlbumEditor.tsx`

**Frontend modified files** (9):
- `types/index.ts`, `services/api.ts`, `routes/index.tsx`
- `pages/admin/AdminLayout.tsx`, `Dashboard.tsx`, `BlogEditor.tsx`, `ShowcaseEditor.tsx`, `ResumeEditor.tsx`, `MediaManager.tsx`

## Verification
- Backend: `pytest backend/tests/test_admin.py`
- Frontend: `cd frontend && npm run build && npm run test`
- Manual: Start dev stack (`docker compose up`), navigate to `/admin`, test each editor CRUD flow
- Each sprint verified independently before proceeding to next
