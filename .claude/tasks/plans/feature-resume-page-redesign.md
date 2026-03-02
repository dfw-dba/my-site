# Sprint 9 — Resume Page Redesign

## Context
The Resume page needs layout and UX improvements: center the profile photo, replace text contact links with icon links below the photo, remove the Contact section heading, rename DEVOPS_CLOUD to DEVOPS, and make skill groups collapsible (defaulting to collapsed).

## Changes

### 9.1 Center profile image at top of page
- **File**: `frontend/src/pages/Resume.tsx` (lines 153-163, header section)
- **Current**: Photo is absolutely positioned `-left-44` on desktop, inline on mobile
- **Change**: Remove absolute positioning. Center the image horizontally at the top of the page using flex centering. Remove the separate mobile/desktop rendering — use a single centered `<ProfileImage />`.
- **Acceptance**: Photo appears centered above the "Resume" title on all screen sizes.

### 9.2 Add social/contact icons below profile image
- **Files**: `frontend/src/pages/Resume.tsx`, new inline SVGs or install `lucide-react`
- **Current**: LinkedIn and GitHub are rendered as text links in the ContactSection. No email link exists.
- **Change**:
  - Install `lucide-react` for icons (LinkedIn, GitHub, Mail) — or use inline SVGs to avoid a dependency. **Decision: use inline SVGs** to keep dependencies minimal (only 3 icons needed).
  - Render a row of icon links directly below the profile image in the header: LinkedIn (links to existing URL), GitHub (links to existing URL), Email (mailto:email@jasonrowland.me).
  - Icons should be ~24px, spaced evenly, with hover effects matching the dark/light theme.
- **Acceptance**: Three icons (LinkedIn, GitHub, Email) render centered below the photo. Clicking each navigates to the correct URL/mailto.

### 9.3 Remove "Contact" section from page
- **File**: `frontend/src/pages/Resume.tsx` (line ~166)
- **Current**: `{sections.contact && <ContactSection content={sections.contact} />}` renders a "Contact" heading with text links.
- **Change**: Remove the ContactSection render call entirely. The contact info is now handled by icons in the header (9.2). The `ContactSection` component itself can remain in the codebase for potential future use.
- **Acceptance**: No "Contact" heading or text links appear on the page.

### 9.4 Rename DEVOPS_CLOUD to DEVOPS in skills
- **File**: `database/init/04_seed.sql` (the skills seed data)
- **Current**: Key is `"devops_cloud"` which renders as `DEVOPS_CLOUD` due to Tailwind `uppercase` class.
- **Change**: Rename the key from `"devops_cloud"` to `"devops"` in the seed data. Rebuild database to apply.
- **Acceptance**: Skills section shows "DEVOPS" instead of "DEVOPS_CLOUD".

### 9.5 Make skill groups collapsible (default collapsed)
- **File**: `frontend/src/pages/Resume.tsx` (SkillsSection component, ~lines 60-100)
- **Current**: Each skill group renders as an `<h3>` header followed by pill badges, all visible.
- **Change**:
  - Add expand/collapse toggle per skill group using React `useState`. Track which groups are expanded (default: none expanded = all collapsed).
  - Each group header becomes clickable with a chevron indicator (▶ collapsed, ▼ expanded).
  - When collapsed, only the group name shows. When expanded, the pill badges appear below.
  - Use simple inline SVG chevrons (no library needed).
- **Acceptance**: Skills section shows category names only by default. Clicking a category expands it to show the skill pills. Clicking again collapses it.

## Files to Modify
- `frontend/src/pages/Resume.tsx` — header layout, remove ContactSection, collapsible skills
- `database/init/04_seed.sql` — rename devops_cloud to devops

## Verification
- Visit `localhost:5173` and verify:
  - Photo centered at top
  - Three icons (LinkedIn, GitHub, Email) below photo, all clickable
  - No "Contact" section visible
  - Skills shows DEVOPS (not DEVOPS_CLOUD)
  - Skill groups are collapsed by default, expand/collapse on click
- Run frontend tests: `cd frontend && npx vitest run`
- Run backend tests if seed data changed: rebuild DB with `docker compose down db && docker compose up -d`
