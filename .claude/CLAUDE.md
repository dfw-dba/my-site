# Workflow Orchestration

### 1. Plan Mode Default
When the user initiates any non-trivial task (3+ steps, architectural decisions, ambiguous features, UI/UX, tradeoffs):

1. **Create branch FIRST**: Create and switch to `feature/<name>` or `fix/<name>` before any exploration, planning, or file edits. No exceptions.
2. **Enter plan mode**: Explore the codebase, ask clarifying questions, and design the approach.
3. **Write plan to `.claude/tasks/plans/<branch-name>.md`**: This is the source of truth — NOT the system-provided ephemeral plan file. Update it as plans evolve during discussion.
4. **Finalize plan before implementation**: Ensure the plan file has all details a fresh session needs: files to change, what each change does, acceptance criteria, and technical decisions.
5. **Add todo items to `.claude/tasks/todo.md`**: Only after the plan is approved. Use compact but detailed descriptions.
6. **Sync todo items to the `my-site` GitHub Project**: Immediately after updating todo.md. Items must include meaningful detail, not just titles.
7. **Prompt user to clear context**: Before starting implementation, suggest the user clear context and enable auto-accept edits for a clean implementation session.

If something goes sideways during implementation, STOP and re-plan immediately.

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `.claude/tasks/lessons.md` with the pattern
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

### 7. Git Branching, Commit, and Merge Rules

> **HARD RULE — NO EXCEPTIONS**: Never edit, stage, or commit files while on the `main` branch.
> Before making ANY file change (including `.claude/tasks/todo.md`, `CLAUDE.md`, or any other file),
> you MUST first create and switch to a feature or fix branch. This applies to every change,
> no matter how small — documentation, config, task tracking, everything.

- **NEVER commit directly to `main`**. All changes must go through a pull request.
- **NEVER edit files while on `main`**. Switch to a branch FIRST, then make edits.
- Create a feature branch (`feature/<name>`) or fix branch (`fix/<name>`) for every change.
- Push the branch, create a PR targeting `main`, and merge via the PR.
- ***Always squash merge*** into `main` (`gh pr merge --squash`). No merge commits or rebase merges.
- Branch naming: `feature/short-description` for new work, `fix/short-description` for bug fixes.

### 8. Task Management
- **Track Progress**: Mark items complete in `.claude/tasks/todo.md` as you go, then **immediately** mark them done in the `my-site` GitHub Project. Never let the two fall out of sync.
- **Explain Changes**: High-level summary at each step.
- **Document Results**: Add review section to `.claude/tasks/todo.md`.
- **Capture Lessons**: Update `.claude/tasks/lessons.md` after corrections.
- **Pre-commit checklist**: When the user says "commit it" or confirms a commit, BEFORE running `git commit`:
  1. Mark all completed sprint items as `[x]` in `.claude/tasks/todo.md`.
  2. Mark matching items as Done in the `my-site` GitHub Project (`gh project`).
  3. Then stage and commit.
- **Sync Rules**:
  - `.claude/tasks/todo.md` is always updated **first**, then the `my-site` GitHub Project is updated to match.
  - Any time a todo item is created, updated, or completed — mirror the change in the GitHub Project immediately.
  - GitHub Project items must include detail in the title or body, not just a bare title.
  - Use `gh project` commands to manage project items.

### 9. Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Cost vs Quality**: Cost and quality, sustainable architecture are equal. If there is a discrepancy where the lowest cost will impact the quality of the site, engage in conversation to arrive at a compromise.

### 10. Claude Permissions

You may run the following commands without asking:

- bash ls
- bash mkdir
- bash gh
- bash git
- bash docker