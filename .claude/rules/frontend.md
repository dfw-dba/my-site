---
globs:
  - "frontend/**"
---

# Frontend Rules

- React 19 functional components only, TypeScript strict mode
- Tailwind 4 utilities for styling, no CSS modules
- TanStack Query for all data fetching — never `useEffect` for API calls
- All API calls go through `frontend/src/services/api.ts` (nested `api` object)
- Types in `frontend/src/types/index.ts`
- Hooks in `frontend/src/hooks/` with `use` prefix
- Admin components in `frontend/src/components/admin/`
- Admin pages in `frontend/src/pages/admin/`
- Public pages in `frontend/src/pages/`
- Layouts in `frontend/src/layouts/`
- Test with Vitest + Testing Library, use `renderWithProviders` from `frontend/tests/setup.tsx`
- Test files live in `frontend/tests/` mirroring src structure
- Run `npx tsc --noEmit` before committing frontend changes
- Run `cd frontend && npx vitest run` to verify tests pass
