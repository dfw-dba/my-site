# Lessons Learned

_Updated after each correction or insight. Review at session start._

## Process

- **Branch before ANY edit**: NEVER use Edit/Write tools while on `main`. Always `git checkout -b <branch>` FIRST, even for tiny changes like marking a task complete in `todo.md`. The branching rule applies to ALL files, not just code.
- **Background agents can overwrite file moves**: When running subagents in the background, they may recreate files that were moved/deleted in the main context. Always verify file state after all background agents complete.
- **CLAUDE.md and tasks/ live in `.claude/`**: Not in the project root. All references in CLAUDE.md should use `.claude/tasks/` paths.
- **Detailed sprint items in todo.md (2026-02-28)**: Each sprint item must include detailed implementation context: files to change, what the change does, acceptance criteria, and technical decisions made during planning.
- **Plan files named after branches (2026-03-01)**: Create `.claude/tasks/plans/<branch-name>.md` during planning. Update it as plans evolve. This file persists in the repo and serves as the implementation spec.
- **GitHub Project items must include detail (2026-03-01)**: When syncing to the GitHub Project, include compact but meaningful detail in the title or body — not just a task number and name.
- **Sync todo.md and GitHub Project at every state change (2026-03-01)**: Every time a todo item is created, updated, or completed in `todo.md`, immediately mirror the change in the GitHub Project. Never batch or defer syncing.

## Technical
- **SQLAlchemy text() and PostgreSQL casts**: Use `CAST(:param AS jsonb)` not `:param::jsonb` — SQLAlchemy interprets `::jsonb` as a bind parameter named `:jsonb`.

## Project Patterns
- **Database as API**: ALL data access goes through `api.*` stored functions. No direct table queries. No ORM queries.
- **Thin routers**: FastAPI routers delegate to DatabaseAPI service. No business logic in routers.
- **Fork-friendly**: No hardcoded domains, AWS account IDs, or personal info. Everything parameterized via config/site.json.