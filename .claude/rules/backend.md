---
globs:
  - "backend/**"
---

# Backend Rules

> **MANDATORY**: All DB access through `DatabaseAPI` class — never query the database directly from routers.

## Rules

- Thin routers — no business logic in route handlers
- All DB access through `DatabaseAPI` class in `backend/src/app/services/db_functions.py`
- Use `CAST(:param AS jsonb)` not `::jsonb` for parameter casting
- Pydantic schemas for request validation only — responses are raw JSONB from stored functions
- Admin routes require `Depends(get_admin_auth)` from `backend/src/app/dependencies.py`
- New routers must be registered in `backend/src/app/main.py`
- Router files in `backend/src/app/routers/`, schemas in `backend/src/app/schemas/`
- Storage service in `backend/src/app/services/storage.py`

## Verification

- Lint + format: `cd backend && uv run ruff check && uv run ruff format --check`
- Tests: `cd backend && uv run pytest`
