# Workflow Orchestration

### 1. Plan Mode Default
When the user initiates any task :

1. The user will create a new branch `feature/<name>` or `fix/<name>` before any exploration, planning, or file edits. No exceptions. If the user starts planning check to see if they are in main, and if they are remind the user to create a new branch before continuing.
2. **Enter plan mode**: Explore the codebase, ask clarifying questions, and design the approach.
3. **Prompt user to clear context**: Before starting implementation, suggest the user clear context and enable auto-accept edits for a clean implementation session.
4. **Finalize plan before implementation**: Ensure the plan has all details a fresh session needs: files to change, what each change does, acceptance criteria, and technical decisions. 
5. After planning is complete, switch to edit mode and **Write plan to `.claude/tasks/plans/<branch-name>.md`**: This is the source of truth — NOT the system-provided ephemeral plan file. This will be a fail safe for when the implementation goes awry. With this we can easily undo any unstaged commits and start over. Or even re-read the plan and compare it to the todo list to identify where things went wrong and possibly be able to get back on track.
5. **Add todo items to `.claude/tasks/todo.md`**: If a to do item is complex and cannot be easily described in one item line, break it out into sub-items. The todo item list along with the plan file will be a source of truth when the plan is being implemented. Once all the todo items are added, commit the changes and push to origin. With the plan and tasks documented, committed, and pushed we will be able to safely disgard implementation changes that go awry and start over on the implementation.


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

### 4. Quality Gates
- Never mark a task complete without proving it works (run tests, check logs, demonstrate correctness)
- For non-trivial changes: pause and ask "Is there a more elegant way?" Skip for simple fixes.
- When given a bug report: just fix it autonomously. Zero user context-switching needed.

### 5. Git Branching, Commit, Merge, Pull Request Rules

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
- Always wait for the CI job to finish after a push, and never suggest a PULL REQUEST if the CI workflow is failing.
- Every PR test plan item must be executable and verified before suggesting the PR is ready to merge. Do not write test plan items that cannot be verified pre-merge.
- After CI passes, execute each test plan item, check them off using `gh api`, and only then suggest the PR is ready to merge.

### 6. Task Management
- **Track Progress**: Mark items complete in `.claude/tasks/todo.md` as you go.
- **Explain Changes**: High-level summary at each step.
- **Document Results**: Add review section to `.claude/tasks/todo.md`.
- **Capture Lessons**: Update `.claude/tasks/lessons.md` after corrections.
- **Pre-commit checklist**: When the user says "commit it" or confirms a commit, BEFORE running `git commit`:
  1. Mark all completed sprint items as `[x]` in `.claude/tasks/todo.md`.
  2. Then stage and commit.

### 7. Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Keep agent/rule files current**: When adding, moving, or removing files referenced in `.claude/agents/` or `.claude/rules/`, update those files to match.
- **Cost vs Quality**: Cost and quality, sustainable architecture are equal. If there is a discrepancy where the lowest cost will impact the quality of the site, engage in conversation to arrive at a compromise.

