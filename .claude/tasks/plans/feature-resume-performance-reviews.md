# Performance Review Carousels for Resume Timeline

## Context

The resume page displays professional entries in a timeline layout. LinkedIn recommendations already have a sliding carousel at the top of the page. This feature adds a similar per-entry carousel for performance reviews, displayed beneath each professional entry that has reviews. Entries with no reviews show nothing.

## Approach

### 1. Database: New `performance_reviews` table

**File: `database/init/02_tables.sql`**

Add after `resume_sections` table (around line 32):

```sql
CREATE TABLE internal.performance_reviews (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id    UUID        NOT NULL REFERENCES internal.professional_entries(id) ON DELETE CASCADE,
    reviewer_name  VARCHAR(255) NOT NULL,
    reviewer_title VARCHAR(255),
    review_date    DATE,
    text           TEXT NOT NULL,
    sort_order     INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

Add trigger (in the triggers section at the bottom):
```sql
CREATE TRIGGER trg_performance_reviews_updated_at
    BEFORE UPDATE ON internal.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();
```

### 2. Database: Modify `api.get_resume()` function

**File: `database/init/03_functions.sql`**

Update the function to include `performance_reviews` array in each entry via `LEFT JOIN LATERAL`:

```sql
CREATE OR REPLACE FUNCTION api.get_resume()
RETURNS JSONB AS $$
DECLARE
    v_sections JSONB;
    v_entries  JSONB;
BEGIN
    SELECT COALESCE(jsonb_object_agg(rs.section_type, rs.content), '{}'::jsonb)
      INTO v_sections
      FROM internal.resume_sections rs;

    SELECT COALESCE(jsonb_object_agg(sub.entry_type, sub.items), '{}'::jsonb)
      INTO v_entries
      FROM (
          SELECT pe.entry_type,
                 jsonb_agg(
                     jsonb_build_object(
                         'id',           pe.id,
                         'title',        pe.title,
                         'organization', pe.organization,
                         'location',     pe.location,
                         'start_date',   pe.start_date,
                         'end_date',     pe.end_date,
                         'description',  pe.description,
                         'highlights',   pe.highlights,
                         'technologies', pe.technologies,
                         'sort_order',   pe.sort_order,
                         'performance_reviews', COALESCE(pr_agg.reviews, '[]'::jsonb)
                     ) ORDER BY pe.sort_order, pe.start_date DESC
                 ) AS items
            FROM internal.professional_entries pe
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id',             pr.id,
                        'reviewer_name',  pr.reviewer_name,
                        'reviewer_title', pr.reviewer_title,
                        'review_date',    pr.review_date,
                        'text',           pr.text
                    ) ORDER BY pr.sort_order, pr.review_date DESC NULLS LAST
                ) AS reviews
                FROM internal.performance_reviews pr
                WHERE pr.entry_id = pe.id
            ) pr_agg ON TRUE
           GROUP BY pe.entry_type
      ) sub;

    RETURN jsonb_build_object(
        'sections', v_sections,
        'entries',  v_entries
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

No changes needed to `api.get_professional_timeline()`.

### 3. Seed Data

**File: `database/init/05_seed_data.sql`**

Add performance reviews using subqueries to resolve entry IDs by organization name:

| Entry | Review Count |
|-------|-------------|
| Verra Mobility | 3 reviews |
| StoneEagle | 4 reviews |
| GameStop | 5 reviews |
| American Specialty Health | 0 (intentional) |
| LoanBeam | 0 (intentional) |

Reviews are written as realistic manager/peer feedback quotes. Reference entries via:
```sql
(SELECT id FROM internal.professional_entries WHERE organization = 'Verra Mobility' LIMIT 1)
```

Sample seed data:

```sql
INSERT INTO internal.performance_reviews
    (entry_id, reviewer_name, reviewer_title, review_date, text, sort_order)
VALUES
    -- Verra Mobility (3 reviews)
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'Verra Mobility' LIMIT 1),
        'Director of Engineering', 'Engineering Leadership', '2024-09-15',
        'Jason has transformed our database architecture. His work on the single-tenant model has directly enabled our enterprise expansion. He consistently delivers solutions that are both elegant and performant.',
        1
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'Verra Mobility' LIMIT 1),
        'VP of Product', 'Product Leadership', '2025-03-01',
        'Jason''s database-as-API approach through Hasura has dramatically accelerated our development velocity. Features that used to take weeks of backend work now ship in days. His architectural vision has been a game-changer.',
        2
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'Verra Mobility' LIMIT 1),
        'Senior Software Engineer', 'Engineering', '2024-12-01',
        'Working with Jason has elevated the entire team''s understanding of database design. His mentorship on query optimization and schema patterns has made us all better engineers.',
        3
    ),
    -- StoneEagle (4 reviews)
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'StoneEagle' LIMIT 1),
        'Data Services Manager', 'Management', '2022-06-15',
        'Jason''s partitioning implementation was exceptional - reducing our processing window from 72 hours to 12 hours. He takes full ownership of complex problems and delivers production-ready solutions.',
        1
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'StoneEagle' LIMIT 1),
        'Senior Data Engineer', 'Data Services', '2021-12-01',
        'Jason built our entire CI/CD pipeline for database deployments. His DevOps expertise brought modern engineering practices to our data team.',
        2
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'StoneEagle' LIMIT 1),
        'Director of Technology', 'Technology Leadership', '2023-06-01',
        'Jason is a rare engineer who combines deep technical expertise with strong communication skills. His change data capture pipeline design was one of the most impactful projects delivered by the data team.',
        3
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'StoneEagle' LIMIT 1),
        'QA Lead', 'Quality Assurance', '2022-01-15',
        'Jason''s automated deployment pipelines have virtually eliminated deployment-related incidents. His attention to reliability and testing has raised the bar for the entire organization.',
        4
    ),
    -- GameStop (5 reviews)
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'GameStop' LIMIT 1),
        'IT Director', 'IT Leadership', '2018-06-15',
        'Jason''s migration of our SQL Server infrastructure from 2008 R2 to 2016 was executed flawlessly with zero unplanned downtime. His meticulous planning and risk mitigation set the standard for future migrations.',
        1
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'GameStop' LIMIT 1),
        'ERP Systems Manager', 'Business Systems', '2017-12-01',
        'Jason is the go-to person for any database performance issue. His ETL optimization work cut our processing times in half, directly improving our operational reporting capabilities.',
        2
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'GameStop' LIMIT 1),
        'Senior Developer', 'Development', '2019-06-01',
        'As a developer, having Jason as our DBA was invaluable. He proactively identified performance bottlenecks and provided clear, actionable guidance. His GDPR compliance migration was a masterclass in careful data engineering.',
        3
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'GameStop' LIMIT 1),
        'VP of Technology', 'Executive Leadership', '2016-12-15',
        'Jason demonstrates exceptional ownership of our database infrastructure. His Service Broker implementation to address transaction log growth showed creative problem-solving that went beyond standard DBA practices.',
        4
    ),
    (
        (SELECT id FROM internal.professional_entries WHERE organization = 'GameStop' LIMIT 1),
        'Database Team Lead', 'Database Administration', '2015-06-01',
        'Jason consistently exceeds expectations. His index maintenance overhaul using parallel PowerShell workflows reclaimed significant time from our maintenance windows. He also contributes to the broader community through his published articles.',
        5
    );
    -- American Specialty Health: 0 reviews (intentional)
    -- LoanBeam: 0 reviews (intentional)
```

### 4. Frontend Types

**File: `frontend/src/types/index.ts`**

Add new interface (before `ProfessionalEntry`):
```typescript
export interface PerformanceReview {
  id: string;
  reviewer_name: string;
  reviewer_title: string | null;
  review_date: string | null;
  text: string;
}
```

Add field to `ProfessionalEntry`:
```typescript
performance_reviews: PerformanceReview[];
```

### 5. New Component: `PerformanceReviewCarousel`

**File: `frontend/src/components/PerformanceReviewCarousel.tsx`** (new)

Mirrors `RecommendationCarousel.tsx` (at `frontend/src/components/RecommendationCarousel.tsx`) pattern:
- Same `pickRandom()` / `animKey` / `setInterval` rotation logic
- Reuses existing `animate-slide-in-right` CSS utility (defined in `frontend/src/styles/globals.css`)
- Smaller text (`text-sm`/`text-xs`) and tighter padding (`px-3 py-3`) since it lives inside a card
- Uses `<div>` not `<section>`, `rounded-md` not `rounded-lg`
- `mt-3` for spacing above within the card
- Width inherited from parent card (no explicit width styling)
- Props: `items: PerformanceReview[]`, `intervalMs?: number` (default 8000)

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import type { PerformanceReview } from "../types";

interface PerformanceReviewCarouselProps {
  items: PerformanceReview[];
  intervalMs?: number;
}

function pickRandom(items: PerformanceReview[], exclude?: PerformanceReview): PerformanceReview {
  if (items.length <= 1) return items[0]!;
  let next!: PerformanceReview;
  do {
    next = items[Math.floor(Math.random() * items.length)]!;
  } while (next === exclude);
  return next;
}

function ReviewTile({ item }: { item: PerformanceReview }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="italic text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        &ldquo;{item.text}&rdquo;
      </p>
      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        &mdash; {item.reviewer_name}
        {item.reviewer_title && `, ${item.reviewer_title}`}
      </p>
    </div>
  );
}

export default function PerformanceReviewCarousel({
  items,
  intervalMs = 8000,
}: PerformanceReviewCarouselProps) {
  const [current, setCurrent] = useState(() => pickRandom(items));
  const [animKey, setAnimKey] = useState(0);
  const currentRef = useRef(current);
  currentRef.current = current;

  const rotate = useCallback(() => {
    const incoming = pickRandom(items, currentRef.current);
    setCurrent(incoming);
    setAnimKey((k) => k + 1);
  }, [items]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(rotate, intervalMs);
    return () => clearInterval(id);
  }, [rotate, intervalMs, items.length]);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div key={animKey} className="animate-slide-in-right">
        <ReviewTile item={current} />
      </div>
    </div>
  );
}
```

### 6. Timeline Integration

**File: `frontend/src/components/Timeline.tsx`**

Add import at top:
```typescript
import PerformanceReviewCarousel from "./PerformanceReviewCarousel";
```

In `TimelineCard`, after the technologies `<div>` (after line 115), add:
```tsx
{entry.performance_reviews && entry.performance_reviews.length > 0 && (
  <PerformanceReviewCarousel items={entry.performance_reviews} />
)}
```

### 7. Test Updates

**File: `frontend/tests/components/Timeline.test.tsx`**
- Add `performance_reviews: []` to `makeEntry` helper defaults (line 18)

**File: `frontend/tests/pages/Resume.test.tsx`**
- Add `performance_reviews: []` to the mock entry object (around line 44)

### 8. No Changes Needed

- **Backend Python** (router, schemas, db_functions) - data flows through as raw JSONB
- **CSS** - reuses existing `animate-slide-in-right`
- **Admin UI** - no admin management for reviews yet (seed data only)
- **Permissions** - existing defaults cover new table

## Files Changed

| File | Action |
|------|--------|
| `database/init/02_tables.sql` | Add `performance_reviews` table + trigger |
| `database/init/03_functions.sql` | Modify `api.get_resume()` with lateral join |
| `database/init/05_seed_data.sql` | Add review seed data for 3 entries |
| `frontend/src/types/index.ts` | Add `PerformanceReview`, extend `ProfessionalEntry` |
| `frontend/src/components/PerformanceReviewCarousel.tsx` | New component |
| `frontend/src/components/Timeline.tsx` | Render carousel in TimelineCard |
| `frontend/tests/components/Timeline.test.tsx` | Update helper defaults |
| `frontend/tests/pages/Resume.test.tsx` | Update mock data |

## Verification

1. Rebuild database container to apply schema + seed changes
2. Hit `/api/resume/` endpoint and confirm each entry has `performance_reviews` array
3. Load resume page - verify carousels appear under Verra Mobility, StoneEagle, GameStop entries
4. Verify no carousel under American Specialty Health and LoanBeam
5. Verify carousel auto-rotates with slide animation
6. Verify carousel width matches card width on both desktop and mobile
7. Run `npm test` - all existing + new tests pass
