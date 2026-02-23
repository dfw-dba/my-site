# Lessons Learned

_Updated after each correction or insight. Review at session start._

## Process
- **Branch before ANY edit**: NEVER use Edit/Write tools while on `main`. Always `git checkout -b <branch>` FIRST, even for tiny changes like marking a task complete in `todo.md`. The branching rule applies to ALL files, not just code.
- **Background agents can overwrite file moves**: When running subagents in the background, they may recreate files that were moved/deleted in the main context. Always verify file state after all background agents complete.
- **CLAUDE.md lives in `.claude/`**: Not in the project root. Same for `tasks/`.

## Technical
- **SQLAlchemy text() and PostgreSQL casts**: Use `CAST(:param AS jsonb)` not `:param::jsonb` — SQLAlchemy interprets `::jsonb` as a bind parameter named `:jsonb`.

## Project Patterns
- **Database as API**: ALL data access goes through `api.*` stored functions. No direct table queries. No ORM queries.
- **Thin routers**: FastAPI routers delegate to DatabaseAPI service. No business logic in routers.
- **Fork-friendly**: No hardcoded domains, AWS account IDs, or personal info. Everything parameterized via config/site.json.
