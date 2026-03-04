# Personal Website / PWA — Implementation Tracker

## Sprint 1: Project Scaffolding & Local Dev Environment
- [x] 1.1 Create directory structure & .gitignore
- [x] 1.2 Config files (site.example.json, .env.example)
- [x] 1.3 Frontend scaffolding (React 19 + Vite + Tailwind + PWA)
- [x] 1.4 Backend scaffolding (FastAPI + SQLAlchemy + asyncpg via uv)
- [x] 1.5 Database init SQL scripts
- [x] 1.6 Docker files (backend, frontend) + docker-compose.yml
- [x] 1.7 GitHub Actions (ci.yml, deploy.yml stubs)
- [x] 1.8 .claude/ commands & .pre-commit-config.yaml
- [x] 1.9 Verify: `docker compose up -d` → all 4 services healthy → health check 200

## Sprint 2: Database "API" Layer
- [x] 2.1 Schema strategy (internal, api, public)
- [x] 2.2 Tables in internal schema
- [x] 2.3 Stored functions in api schema (19 functions)
- [x] 2.4 Permissions (GRANT EXECUTE)
- [x] 2.5 Seed data
- [x] 2.6 DatabaseAPI service class
- [x] 2.7 Alembic setup + initial migration
- [x] 2.8 Verify: stored functions return correct JSONB

## Sprint 3: FastAPI Routers
- [x] 3.1 Public endpoints (health, resume, blog, showcase, media)
- [x] 3.2 Admin endpoints (API-key protected writes)
- [x] 3.3 Pydantic schemas for all request/response models
- [x] 3.4 Presigned URL media upload flow
- [x] 3.5 Verify: all endpoints return correct responses, Swagger UI works

## Sprint 4: React Frontend
- [x] 4.1 Route definitions + MainLayout with hamburger menu
- [x] 4.2 Resume page (landing) with Timeline component
- [x] 4.3 Personal life pages (albums, gallery with lightbox)
- [x] 4.4 Showcase pages (hub, blog listing, blog post, data demos)
- [x] 4.5 Data fetching via @tanstack/react-query
- [x] 4.6 PWA configuration (manifest, service worker)
- [x] 4.7 Responsive design verification
- [x] 4.8 Verify: all pages render, navigation works, PWA installable

## Sprint 5: Testing
- [x] 5.1 Backend test fixtures (conftest.py)
- [x] 5.2 Stored procedure tests (test_db_functions.py)
- [x] 5.3 Router tests (all endpoints)
- [x] 5.4 Frontend component + page tests
- [x] 5.5 Verify: all tests pass

## Sprint 6: Resume Content + Dark Mode + Profile Image
- [x] 6.1 Replace placeholder resume_sections seed data with real content
- [x] 6.2 Replace placeholder professional_entries with real work history
- [x] 6.3 Remove placeholder education entry
- [x] 6.4 Rebuild database and verify API responses
- [x] 6.5 Verify frontend Resume page renders with real data
- [x] 6.6 Run tests to confirm no regressions
- [x] 6.7 Add dark theme with toggle (defaults to dark) — PR #16
- [x] 6.8 Add profile image placeholder to Resume page — PR #17

---

## Sprint 7: Profile Photo
- [x] 7.1 Replace profile placeholder with real photo on Resume page — PR #19
  - Add `profile.jpg` to `frontend/public/`
  - Pass `src="/profile.jpg"` to `<ProfileImage />` in `frontend/src/pages/Resume.tsx`
  - Mount `frontend/public` volume in `docker-compose.yml` so dev container serves static assets
  - Change profile image shape from circle to portrait rounded rectangle (`h-56 w-36 rounded-2xl`) in `ProfileImage.tsx`
  - Position photo to the left of content area (absolute positioned on `lg+`, inline on mobile) so page text alignment is preserved in `Resume.tsx`

---

## Sprint 8: Claude Workflow Improvements
- [x] 8.1 Sync stale GitHub Project items with todo.md
  - Mark Sprint 6 sub-items 6.7-6.19 as Done in GitHub Project (completed in PRs #16, #17)
  - Confirm backlog items (AWS CDK, CI/CD, MCP, Admin UI) remain Todo
- [x] 8.2 Update CLAUDE.md Task Management rules
  - Add "create branch immediately" as step 1 (before any planning)
  - Add "create plan file named after branch" at `.claude/tasks/plans/<branch-name>.md`
  - Add "finalize plan before implementation" rule
  - Add "add todo items after plan is finalized" with detail requirement
  - Add explicit Sync Rules subsection for todo.md ↔ GitHub Project
- [x] 8.3 Update lessons.md with new workflow patterns
  - Plan files named after branches, GitHub Project detail, sync at every state change, branch before planning
- [x] 8.4 Create plans directory with plan file for this sprint
  - `.claude/tasks/plans/feature-claude-workflow-improvements.md` created during planning phase

---

## Sprint 9: Resume Page Redesign
- [x] 9.1 Center profile image at top of page
  - Remove absolute left positioning, use flex centering in header — `Resume.tsx`
- [x] 9.2 Add social/contact icons below profile image
  - Inline SVGs for LinkedIn, GitHub, Mail icons with links — `Resume.tsx`
  - LinkedIn → existing URL, GitHub → existing URL, Email → mailto:email@jasonrowland.me
- [x] 9.3 Remove Contact section from page
  - Remove `<ContactSection>` render call — contact info now in header icons — `Resume.tsx`
- [x] 9.4 Rename DEVOPS_CLOUD to DEVOPS in skills
  - Change key `"devops_cloud"` to `"devops"` in seed data — `05_seed_data.sql`
  - Rebuild DB to apply; add `formatGroupName` to replace underscores in display
- [x] 9.5 Make skill groups collapsible (default collapsed)
  - Add `useState` for expanded state, chevron toggle per group — `Resume.tsx` SkillsSection
  - Default: all collapsed. Click to expand/collapse individual groups.
- [x] 9.6 Center the Skills section
  - Add `flex flex-col items-center` to SkillsSection wrapper, constrain group list width — `Resume.tsx`
- [x] 9.7 Remove "Resume" title text and accent bar from header
  - Delete `<h1>Resume</h1>` and accent bar div from header — `Resume.tsx`
- [x] 9.8 Center "Professional Timeline" heading
  - Add `text-center` to the h2 — `Resume.tsx`
- [x] 9.9 Move theme toggle to top-right corner of page
  - Remove ThemeToggle from HamburgerMenu drawer, add to MainLayout as fixed top-right element
- [x] 9.10 Remove "Skills" heading text
  - Delete `<h2>Skills</h2>` from SkillsSection — `Resume.tsx`
- [x] 9.11 Left-align collapsible skill groups
  - Remove centering classes from SkillsSection, use default left alignment — `Resume.tsx`

---

## Sprint 10: Fix Scroll Under Header + Update Planning Workflow

- [x] 10.1 Update CLAUDE.md §1 with strict numbered planning procedure
  - Rewrite §1 as a 7-step numbered checklist: branch → plan mode → plan file → finalize → todos → GitHub sync → prompt user
  - Ensures no planning steps are skipped in future sessions
- [x] 10.2 Add lesson to `.claude/tasks/lessons.md` about planning checklist
  - Document that the planning steps must be followed in strict order
- [x] 10.3 Convert MainLayout from fixed-positioned controls to flex-column layout
  - Root: `flex flex-col h-screen`, header in normal flow, `<main>` with `overflow-y-auto` — `MainLayout.tsx`
- [x] 10.4 Remove `fixed` positioning from HamburgerMenu toggle button
  - Change button from `fixed top-4 left-4 z-50` to normal flow — `HamburgerMenu.tsx`
  - Drawer and backdrop remain `fixed` for overlay behavior
- [x] 10.5 Verify scroll clipping and layout on mobile and desktop
  - Narrow viewport: content clips below header controls when scrolling
  - Hamburger drawer still works, theme toggle still works
  - Desktop layout unchanged
  - Run frontend tests: `cd frontend && npx vitest run` — 35/35 pass

---

## Sprint 11: LinkedIn Recommendations Carousel + Global Social Icons

- [x] 11.1 Add `'recommendations'` to `resume_sections` CHECK constraint — `database/init/02_tables.sql`
- [x] 11.2 Add 4 LinkedIn recommendations as seed data — `database/init/05_seed_data.sql`
- [x] 11.3 Create `RecommendationCarousel` component with slide-in-from-right animation, 8s rotation, random non-repeating selection — `frontend/src/components/RecommendationCarousel.tsx`
- [x] 11.4 Add slide-in-right keyframe animation — `frontend/src/styles/globals.css`
- [x] 11.5 Render carousel on Resume page between profile image and summary/skills — `frontend/src/pages/Resume.tsx`
- [x] 11.6 Extract social icons (LinkedIn, GitHub, Mail) into shared `SocialIcons` component — `frontend/src/components/SocialIcons.tsx`
- [x] 11.7 Move social icons to global header bar, centered between hamburger menu and theme toggle — `frontend/src/layouts/MainLayout.tsx`
- [x] 11.8 Remove social icons from Resume page header — `frontend/src/pages/Resume.tsx`
- [x] 11.9 Rebuild database with new seed data, verify API returns recommendations, all 35 tests pass

---

## Sprint 12: Admin UI

- [x] 12.1 Backend: Add `admin_get_blog_posts`, `admin_get_all_media` SQL functions + `GET /blog`, `GET /media`, `DELETE /resume/entry/{id}` admin endpoints
- [x] 12.2 Frontend API layer: admin types, `api.admin` namespace, `useAdminApi.ts` hooks
- [x] 12.3 Shared admin components (11): AdminSidebar, FormInput, FormTextarea, FormSelect, FormToggle, TagInput, ListInput, DataTable, ConfirmModal, StatCard, SaveBar
- [x] 12.4 AdminLayout rewrite (sidebar + content area) + nested routes for blog/showcase editors
- [x] 12.5 Dashboard with Blog group (Posts/Drafts counts), Unpublished Drafts section, quick actions
- [x] 12.6 Blog editor: list with All/Drafts/Published filter tabs, create/edit form with markdown preview
- [x] 12.7 Showcase editor: list + create/edit form
- [x] 12.8 Resume editor: Sections tab (JSON editor) + Entries tab (DataTable + modal form)
- [x] 12.9 Media manager: upload zone (drag-and-drop + file picker), media grid, Albums tab with CRUD
- [x] 12.10 Frontend tests for all admin pages (5 test files, 19 tests)
- [x] 12.11 Fix: Add `admin_get_blog_post` endpoint so draft posts can be edited (was using public endpoint filtered to published only)
- [x] 12.12 Add toast/inline error handling on mutation failures across all admin editors
- [x] 12.13 Add unsaved changes warning (beforeunload + route blocker) on admin forms
- [x] 12.14 Add mobile sidebar overlay (slide-in drawer with backdrop on small screens)

---

## Sprint Future Work: AWS CDK, CI/CD

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory