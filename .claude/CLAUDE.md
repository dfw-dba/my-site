# Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode and use AskUserQuestionTool for ANY non-trivial task (3+ steps, architectural decisions, clarification when features are ambiguous, technical implementation, UI and UX, concerns, tradeoffs, etc)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

# Git Branching Rules

> **HARD RULE — NO EXCEPTIONS**: Never edit, stage, or commit files while on the `main` branch.
> Before making ANY file change (including `tasks/todo.md`, `CLAUDE.md`, or any other file),
> you MUST first create and switch to a feature or fix branch. This applies to every change,
> no matter how small — documentation, config, task tracking, everything.

- **NEVER commit directly to `main`**. All changes must go through a pull request.
- **NEVER edit files while on `main`**. Switch to a branch FIRST, then make edits.
- Create a feature branch (`feature/<name>`) or fix branch (`fix/<name>`) for every change.
- Push the branch, create a PR targeting `main`, and merge via the PR.
- **Always squash merge** into `main` (`gh pr merge --squash`). No merge commits or rebase merges.
- Branch naming: `feature/short-description` for new work, `fix/short-description` for bug fixes.

# Task Management

### Planning Phase
1. **Create branch immediately**: When the user says "let's plan" or initiates any change, create and switch to the appropriate branch (`feature/<name>` or `fix/<name>`) **before** any planning or file edits begin. This applies to all changes — code, docs, config, task tracking, everything.
2. **Create plan file named after branch**: Create `tasks/plans/<branch-name>.md` and update it throughout the planning process. If plans change during discussion, edit the plan file accordingly. The plan file is the source of truth for the current sprint's implementation details.
3. **Finalize plan before implementation**: Before starting implementation, ensure the plan file has all details needed for a fresh session to implement without re-researching: files to change, what each change does, acceptance criteria, and technical decisions.
4. **Add todo items after plan is finalized**: Only after planning is complete and approved, add items to `tasks/todo.md` with compact but detailed descriptions. Then immediately sync to the `my-site` GitHub Project with matching detail (not just titles).
5. **Verify Plans**: Check in with the user before starting implementation.

### Implementation Phase
6. **Track Progress**: Mark items complete in `tasks/todo.md` as you go, then **immediately** mark them done in the `my-site` GitHub Project. Never let the two fall out of sync.
7. **Explain Changes**: High-level summary at each step.
8. **Document Results**: Add review section to `tasks/todo.md`.
9. **Capture Lessons**: Update `tasks/lessons.md` after corrections.

### Sync Rules
- `tasks/todo.md` is always updated **first**, then the `my-site` GitHub Project is updated to match.
- Any time a todo item is created, updated, or completed — mirror the change in the GitHub Project immediately.
- GitHub Project items must include detail in the title or body, not just a bare title.
- Use `gh project` commands to manage project items.

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Cost vs Quality**: Cost and quality, sustainable architecture are equal. If there is a discrepancy where the lowest cost will impact the quality of the site, engage in conversation to arrive at a compromise.

# Claude permissions

### You may run the following commands without asking:

- bash ls
- bash mkdir
- bash gh
- bash git
- bash docker