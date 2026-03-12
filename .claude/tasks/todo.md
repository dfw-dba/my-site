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

## Fix: Remove "About" Section from Resume Admin & Database

- [x] 13.1 Remove `"about"` from admin Resume Editor section type array — `frontend/src/pages/admin/ResumeEditor.tsx`
- [x] 13.2 Remove `'about'` from CHECK constraint in DB schema — `database/init/02_tables.sql`
- [x] 13.3 Update comment in backend schema to list `recommendations` instead of `about` — `backend/src/app/schemas/resume.py`
- [x] 13.4 Delete `about` row from live database and update CHECK constraint
- [x] 13.5 Verify: 54 backend tests pass, no `about` row in `internal.resume_sections`

---

## Sprint 14: Performance Review Carousels

- [x] 14.1 Add `performance_reviews` table to database schema — `database/init/02_tables.sql`
- [x] 14.2 Add `updated_at` trigger for `performance_reviews` — `database/init/02_tables.sql`
- [x] 14.3 Modify `api.get_resume()` with lateral join for performance reviews — `database/init/03_functions.sql`
- [x] 14.4 Add seed data (12 reviews: 3 Verra, 4 StoneEagle, 5 GameStop) — `database/init/05_seed_data.sql`
- [x] 14.5 Add `PerformanceReview` interface and extend `ProfessionalEntry` — `frontend/src/types/index.ts`
- [x] 14.6 Create `PerformanceReviewCarousel` component — `frontend/src/components/PerformanceReviewCarousel.tsx`
- [x] 14.7 Integrate carousel into `TimelineCard` — `frontend/src/components/Timeline.tsx`
- [x] 14.8 Update test fixtures with `performance_reviews: []` — Timeline + Resume tests
- [x] 14.9 All 56 frontend tests pass

---

## Sprint 15: Refactor PostgreSQL Database to Match DB Rules

- [x] 15.1 `database/init/00_extensions.sql` — Remove `uuid-ossp` and `pgcrypto` extensions, lowercase keywords
- [x] 15.2 `database/init/01_schemas.sql` — Lowercase keywords
- [x] 15.3 `database/init/02_tables.sql` — Full rewrite
  - PK: UUID → `int4 generated always as identity` (6 tables), `int2` for `resume_sections`
  - FK columns: UUID → `int4`
  - `varchar(N)` → `text`
  - All keywords lowercase
  - Add `comment on table` + `comment on column` for all tables
  - Remove `set_updated_at()` trigger function + all 7 triggers
- [x] 15.4 `database/init/03_functions.sql` — Full rewrite
  - Lowercase all SQL keywords
  - UUID variable types → `int4` (or `int2` for resume_sections)
  - Remove `uuid_generate_v4()` calls and `id` from INSERT column lists
  - `professional_entries` upsert: switch from ON CONFLICT (id) to IF/ELSE
  - Add `updated_at = now()` in every UPDATE SET clause
- [x] 15.5 `database/init/04_permissions.sql` — Lowercase all keywords
- [x] 15.6 `database/init/05_seed_data.sql` — Lowercase all keywords
- [x] 15.7 Backend Python changes
  - `db_functions.py`: `delete_professional_entry` param str→int, remove CAST AS uuid
  - `admin.py`: `entry_id: str` → `entry_id: int`
  - `schemas/resume.py`: `id: str|None` → `int|None`, `entry_id: str` → `int`
  - `schemas/blog.py`: `showcase_item_id: str|None` → `int|None`
  - `schemas/media.py`: `album_id: str|None` → `int|None`, `cover_image_id: str|None` → `int|None`
- [x] 15.8 `backend/tests/test_db_functions.py` — Remove `CAST(:id AS uuid)` + fix test_admin.py UUID→int
- [x] 15.9 Verification: Docker rebuild, all 54 tests pass, spot-checks clean

---

## Sprint 16: Repo Structure Optimization for Token Efficiency

- [x] 16.1 Add `globs` frontmatter to `postgresql_database.md` — scoped to `database/**` and `**/*.sql`
- [x] 16.2 Create `.claude/rules/frontend.md` — path-scoped to `frontend/**`
- [x] 16.3 Create `.claude/rules/backend.md` — path-scoped to `backend/**`
- [x] 16.4 Populate `database-engineer.md` agent — tools, DB architecture, patterns, key files
- [x] 16.5 Populate `backend-engineer.md` agent — tools, router pattern, key files, commands
- [x] 16.6 Populate `uiux-engineer.md` agent — tools, React stack, component/page structure, commands
- [x] 16.7 Populate `test-engineer.md` agent — tools, pytest/vitest patterns, test counts, CI
- [x] 16.8 Populate `aws-architect.md` agent — tools, docker-compose, CI/CD, future AWS target
- [x] 16.9 Trim CLAUDE.md — remove redundant PostgreSQL line, compress sections 4/5/6, renumber

---

## Sprint Future Work: AWS CDK, CI/CD

---

## Feature: Editable Highlights in Resume Entry Form

- [x] 17.1 Replace static `<span>` with `<input>` in `ListInput.tsx` for inline editing
- [x] 17.2 Verify: `npx tsc --noEmit` passes, frontend tests pass (56/56)
- [x] 17.3 Manual test: edit highlight text, save, confirm persistence

---

## Sprint 18: Cognito Auth Integration

### Backend
- [x] 18.1 Add PyJWT dependency to pyproject.toml
- [x] 18.2 Add Cognito settings to config.py
- [x] 18.3 Create cognito.py JWT verifier service
- [x] 18.4 Update dependencies.py for dual-mode auth (Bearer + API key fallback)
- [x] 18.5 Update conftest.py for new auth pattern
- [x] 18.6 Add backend tests for Cognito auth (9 tests)
- [x] 18.7 Run ruff check + format check — all pass
- [x] 18.8 Run pytest — 18/18 pass

### Frontend
- [x] 18.9 Install amazon-cognito-identity-js
- [x] 18.10 Create auth.ts service (Cognito SDK wrapper)
- [x] 18.11 Create useAuth.ts hook
- [x] 18.12 Create AuthContext.tsx
- [x] 18.13 Create Login.tsx page
- [x] 18.14 Create ProtectedRoute.tsx component
- [x] 18.15 Update routes/index.tsx with ProtectedRoute
- [x] 18.16 Update api.ts for async Bearer auth
- [x] 18.17 Update main.tsx with AuthProvider
- [x] 18.18 Add AuthState type to types/index.ts
- [x] 18.19 Add frontend tests (Login: 4, ProtectedRoute: 2)
- [x] 18.20 Run tsc --noEmit — passes
- [x] 18.21 Run vitest — 22/22 pass

### Config
- [x] 18.22 Update .env.example with Cognito vars

---

## Sprint 19: AWS CDK Infrastructure + CD Pipeline

### Phase 1: CDK Project Setup
- [x] 19.1 Initialize CDK project (package.json, tsconfig.json, cdk.json)
- [x] 19.2 Create config/index.ts with parameterized deployment values
- [x] 19.3 Implement DnsStack (Route 53 hosted zone)
- [x] 19.4 Implement CertStack (ACM wildcard cert, us-east-1, DNS validation)

### Phase 2: Data Infrastructure
- [x] 19.5 Implement DataStack (default VPC, RDS PG17, Cognito user pool, VPC endpoint, SSM params, ECR repo)

### Phase 3: Lambda Backend Prep
- [x] 19.6 Add mangum dependency to pyproject.toml
- [x] 19.7 Create lambda_handler.py (Mangum wrapper)
- [x] 19.8 Create Dockerfile.lambda (ARM64 Lambda container)

### Phase 4: App Infrastructure
- [x] 19.9 Implement AppStack (S3+CloudFront, Lambda, API Gateway v2, Route 53 records, media bucket, budget alarm)

### Phase 5: CD Pipeline
- [x] 19.10 Implement deploy.yml (3 jobs: infra, backend, frontend — OIDC auth)

### Verification
- [x] 19.11 `npx tsc --noEmit` — CDK compiles clean
- [x] 19.12 `npx cdk synth` — all 4 stacks synthesize
- [x] 19.13 Backend lint passes (ruff check + format)
- [x] 19.14 Frontend type check passes (tsc --noEmit)
- [x] 19.15 Frontend tests pass (22/22)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in `.claude/` directory