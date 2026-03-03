# Sprint 11 — LinkedIn Recommendations Carousel on Resume Page

## Context
The user wants a recommendation tile between the social icons and the collapsible skills section on the Resume page. It displays one LinkedIn recommendation at a time with a slide-in-from-right animation, rotating every 10 seconds. Data is stored in the database seed, consistent with existing resume data patterns.

## Recommendation Data
Four recommendations provided by user:

1. **Eduardo Camacho** — Senior Database Developer/Administrator at TeamHealth
2. **Stephen Swienton** — VP Product Development and Strategy
3. **Ben Gatzke** — CEO at BorrowWorks
4. **Prodip K. Saha, MBA** — Information Security Architect Principal at Fannie Mae

---

## Changes

### 1. Database: Add `recommendations` section type

**`database/migrations/02_tables.sql`** — Add `'recommendations'` to the CHECK constraint:
```sql
CHECK (section_type IN ('summary', 'skills', 'contact', 'about', 'recommendations'))
```

**`database/migrations/05_seed_data.sql`** — Insert recommendations seed data as JSONB with `items` array containing `{ author, title, text }` objects.

**No changes needed** to `api.get_resume()` — it already aggregates all `resume_sections` rows via `jsonb_object_agg`, so `data.sections.recommendations` will appear automatically.

### 2. New component: `RecommendationCarousel.tsx`

**`frontend/src/components/RecommendationCarousel.tsx`** — New file

Behavior:
- Accepts an array of `{ author, title, text }` items
- Picks a random recommendation on mount
- Every 10 seconds, slides the current recommendation out to the left while sliding a new random one in from the right
- Uses CSS transitions (Tailwind + inline styles) — no animation libraries

Implementation:
- Two state slots: `current` (visible) and `next` (incoming)
- A boolean `transitioning` state triggers the slide animation
- When `transitioning` becomes true: current slides out left, next slides in from right via `transform: translateX()` with `transition-transform duration-700`
- After transition completes (`onTransitionEnd`), swap `next` into `current`, clear `next`, reset
- `setInterval` at 10s triggers each rotation
- Random selection avoids repeating the same recommendation consecutively

Visual design:
- Subtle card with italic quote text, em-dash attribution line (name + title)
- Constrained width (`max-w-2xl mx-auto`), centered
- `overflow-hidden` container to clip sliding content

### 3. Resume page: Insert carousel between icons and skills

**`frontend/src/pages/Resume.tsx`** — Import and render `RecommendationCarousel` between `</header>` and `SummarySection`/`SkillsSection`.

### 4. Rebuild database

`docker compose down -v && docker compose up -d` to apply new seed data.

### 5. Move social icons to global header bar

Move the LinkedIn, GitHub, and Mail icon links out of the Resume page `<header>` and into the persistent `MainLayout` header, centered between the hamburger menu (left) and theme toggle (right). They should be visible on every page, always.

**`frontend/src/layouts/MainLayout.tsx`**:
- Import the three icon components (extract them from Resume.tsx or create a shared `SocialIcons` component)
- Render the icons centered in the header between `<HamburgerMenu />` and `<ThemeToggle />`

**`frontend/src/pages/Resume.tsx`**:
- Remove the icon `<a>` links and the icon component definitions (`LinkedInIcon`, `GitHubIcon`, `MailIcon`) from Resume.tsx
- Remove the `<div className="mt-4 flex items-center gap-5">` block from the `<header>`

**`frontend/src/components/SocialIcons.tsx`** (new file):
- Extract the three SVG icon components and their `<a>` wrappers into a reusable component

---

## Files to modify
| File | Change |
|---|---|
| `database/init/02_tables.sql` | Add `'recommendations'` to CHECK constraint |
| `database/init/05_seed_data.sql` | Add recommendations seed row |
| `frontend/src/components/RecommendationCarousel.tsx` | **New file** — carousel component |
| `frontend/src/components/SocialIcons.tsx` | **New file** — extracted social icon links |
| `frontend/src/pages/Resume.tsx` | Import carousel, remove social icons |
| `frontend/src/layouts/MainLayout.tsx` | Add SocialIcons centered in header |
| `frontend/src/styles/globals.css` | slide-in-right keyframe animation |

## Acceptance criteria
- Recommendation tile appears below profile image on Resume page
- One recommendation visible at a time, full text with "— Name, Title" attribution
- Every 8s, new recommendation slides in from right
- Random order, no consecutive repeats
- Social icons (LinkedIn, GitHub, Mail) visible in top header bar on every page
- Icons centered between hamburger menu and theme toggle
- Works on mobile and desktop, dark mode correct
- Existing tests still pass

## Verification
1. `cd frontend && npx vitest run` — all existing tests pass
2. `docker compose down -v && docker compose up -d` — rebuild DB with new seed
3. Browser → Resume page → recommendation tile visible, no icons in page header
4. Browser → any other page → social icons visible in top bar
5. Wait 8s+ → confirm slide animation
6. Mobile viewport + dark mode check
