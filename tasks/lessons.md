# Lessons Learned

## Process

### Branch before planning (2026-02-28)
- **Problem**: Planning phase updated `tasks/todo.md` on `main`, then creating a new branch lost those changes.
- **Fix**: Always create the feature/fix branch FIRST, before writing any plan or editing any file. Plan within the branch so changes carry forward into implementation.
- **Rule**: Branch → Plan → Implement (never plan on `main`).

### Detailed sprint items in todo.md (2026-02-28)
- **Problem**: Sprint items in `todo.md` lacked enough context for a fresh session to implement without re-researching.
- **Fix**: Each sprint item must include detailed implementation context: files to change, what the change does, acceptance criteria, and technical decisions made during planning.

### Plan files named after branches (2026-03-01)
- **Problem**: Plans were written to ephemeral Claude plan files that disappeared after context clears.
- **Fix**: Create `tasks/plans/<branch-name>.md` during planning. Update it as plans evolve. This file persists in the repo and serves as the implementation spec.

### GitHub Project items must include detail (2026-03-01)
- **Problem**: GitHub Project items were created with bare titles only, making them useless for tracking scope.
- **Fix**: When syncing to the GitHub Project, include compact but meaningful detail in the title or body — not just a task number and name.

### Sync todo.md and GitHub Project at every state change (2026-03-01)
- **Problem**: Sprint 6 sub-items (6.7-6.19) were marked done in `todo.md` but stayed "Todo" in the GitHub Project, causing drift.
- **Fix**: Every time a todo item is created, updated, or completed in `todo.md`, immediately mirror the change in the GitHub Project. Never batch or defer syncing.

### Create branch before planning starts (2026-03-01)
- **Problem**: Planning sometimes started before creating a branch, leading to edits on `main` or lost work.
- **Fix**: When user initiates any change (including "let's plan"), create the branch immediately — before any planning, file edits, or discussion begins.
