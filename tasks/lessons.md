# Lessons Learned

## Process

### Branch before planning (2026-02-28)
- **Problem**: Planning phase updated `tasks/todo.md` on `main`, then creating a new branch lost those changes.
- **Fix**: Always create the feature/fix branch FIRST, before writing any plan or editing any file. Plan within the branch so changes carry forward into implementation.
- **Rule**: Branch → Plan → Implement (never plan on `main`).

### Detailed sprint items in todo.md (2026-02-28)
- **Problem**: Sprint items in `todo.md` lacked enough context for a fresh session to implement without re-researching.
- **Fix**: Each sprint item must include detailed implementation context: files to change, what the change does, acceptance criteria, and technical decisions made during planning.
