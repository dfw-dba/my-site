# Sprint 6 — Resume Content + Dark Mode + Profile Image

## Tasks

- [x] 6.1 Replace placeholder resume_sections seed data with real content
- [x] 6.2 Replace placeholder professional_entries with real work history
- [x] 6.3 Remove placeholder education entry
- [x] 6.4 Rebuild database and verify API responses
- [x] 6.5 Verify frontend Resume page renders with real data
- [x] 6.6 Run tests to confirm no regressions
- [x] 6.7 Add dark theme with toggle (defaults to dark) — PR #16
- [x] 6.8 Add profile image placeholder to Resume page — PR #17

---

# Sprint 7 — Profile Photo

## Tasks

- [x] 7.1 Replace profile placeholder with real photo on Resume page — PR #19
  - Add `profile.jpg` to `frontend/public/`
  - Pass `src="/profile.jpg"` to `<ProfileImage />` in `frontend/src/pages/Resume.tsx`
  - Mount `frontend/public` volume in `docker-compose.yml` so dev container serves static assets
  - Change profile image shape from circle to portrait rounded rectangle (`h-56 w-36 rounded-2xl`) in `ProfileImage.tsx`
  - Position photo to the left of content area (absolute positioned on `lg+`, inline on mobile) so page text alignment is preserved in `Resume.tsx`

---

# Sprint 8 — Claude Workflow Improvements

## Tasks

- [x] 8.1 Sync stale GitHub Project items with todo.md
  - Mark Sprint 6 sub-items 6.7-6.19 as Done in GitHub Project (completed in PRs #16, #17)
  - Confirm backlog items (AWS CDK, CI/CD, MCP, Admin UI) remain Todo
- [x] 8.2 Update CLAUDE.md Task Management rules
  - Add "create branch immediately" as step 1 (before any planning)
  - Add "create plan file named after branch" at `tasks/plans/<branch-name>.md`
  - Add "finalize plan before implementation" rule
  - Add "add todo items after plan is finalized" with detail requirement
  - Add explicit Sync Rules subsection for todo.md ↔ GitHub Project
- [x] 8.3 Update tasks/lessons.md with new workflow patterns
  - Plan files named after branches, GitHub Project detail, sync at every state change, branch before planning
- [x] 8.4 Create tasks/plans/ directory with plan file for this sprint
  - `tasks/plans/feature-claude-workflow-improvements.md` created during planning phase

---

# Sprint 9 — Resume Page Redesign

## Tasks

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
