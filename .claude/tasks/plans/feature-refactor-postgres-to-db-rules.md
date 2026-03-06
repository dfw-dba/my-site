# Plan: Refactor PostgreSQL Database to Match DB Rules

## Context

The project has database coding rules in `.claude/rules/postgresql_database.md` but the existing schema predates them. Only `performance_reviews` (added later) follows the rules. This refactor brings all 7 tables, 20+ stored functions, seed data, and backend Python code into compliance.

## Summary of Changes

| Category | What changes |
|----------|-------------|
| PK types | UUID → `int4 generated always as identity` (6 tables); `resume_sections` → `int2 generated always as identity` |
| FK types | All UUID FKs → `int4` |
| SQL keywords | UPPERCASE → lowercase everywhere |
| Data types | `varchar(N)` → `text` |
| Comments | Add `comment on table` and `comment on column` for all tables |
| Triggers | Remove all 7 `updated_at` triggers + trigger function; set `updated_at = now()` in stored functions |
| Extensions | Remove `uuid-ossp` and `pgcrypto` (no longer used) |
| Upsert pattern | `professional_entries`: switch from `ON CONFLICT (id)` to IF/ELSE pattern (identity PKs can't be supplied on insert) |
| Formatting | Reformat all SQL per style guide (root keywords left-aligned, parentheses rules, etc.) |

## Files to Modify (in order)

1. `database/init/00_extensions.sql` - Remove extensions, lowercase
2. `database/init/01_schemas.sql` - Lowercase keywords
3. `database/init/02_tables.sql` - Full rewrite (PK types, FK types, varchar→text, comments, remove triggers)
4. `database/init/03_functions.sql` - Full rewrite (lowercase, int4 types, remove uuid, IF/ELSE for professional_entries, updated_at in UPDATEs)
5. `database/init/04_permissions.sql` - Lowercase keywords
6. `database/init/05_seed_data.sql` - Lowercase keywords
7. `backend/src/app/services/db_functions.py` - delete_professional_entry: str→int, remove UUID cast
8. `backend/src/app/routers/admin.py` - entry_id: str→int
9. `backend/src/app/schemas/resume.py` - id: str→int, entry_id: str→int
10. `backend/src/app/schemas/blog.py` - showcase_item_id: str→int
11. `backend/src/app/schemas/media.py` - album_id: str→int, cover_image_id: str→int
12. `backend/tests/test_db_functions.py` - Remove CAST(:id AS uuid)
