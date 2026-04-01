# Workflow Orchestration

### 1. Plan Mode Default
When the user initiates any task:

- **Enter plan mode**: Explore the codebase, ask clarifying questions, and design the approach.
- **Prompt user to clear context**: Before starting implementation, suggest the user clear context and enable auto-accept edits for a clean implementation session.
- **Finalize plan before implementation**: Ensure the plan has all details a fresh session needs: files to change, what each change does, acceptance criteria, and technical decisions. 
- After planning is complete, switch to edit mode and **Write plan to `.claude/tasks/plans/<branch-name>.md`**: This is the source of truth — NOT the system-provided ephemeral plan file. 
- **Add todo items to `.claude/tasks/todo.md`**: If a to do item is complex and cannot be easily described in one item line, break it out into sub-items. The todo item list along with the plan file will be a source of truth when the plan is being implemented. 

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: save the lesson to the appropriate location:
  - **Project rules** (conventions, deployment gotchas, validation rules) → add to the relevant `.claude/rules/*.md` file
  - **Behavioral corrections** (Claude-specific workflow habits) → save to Claude Code memory files
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these rules until mistake rate drops

### 4. Quality Gates
- Never mark a task complete without proving it works (run tests, check logs, demonstrate correctness)
- For non-trivial changes: pause and ask "Is there a more elegant way?" Skip for simple fixes.
- When given a bug report: just fix it autonomously. Zero user context-switching needed.

### 5. Git Workflow Rules (MANDATORY)
- See `.claude/rules/git-workflow.md`

### 6. Task Management
- **Track Progress**: Mark items complete in `.claude/tasks/todo.md` as you go.
- **Explain Changes**: High-level summary at each step.
- **Document Results**: Add review section to `.claude/tasks/todo.md`.
- **Capture Lessons**: Update `.claude/tasks/lessons.md` after corrections.
- **Todo items track implementation work only**: Do NOT add process steps (push, create PR, monitor CI, merge, post-deploy verification) as todo items. These are governed by `git-workflow.md` and happen as part of the standard shipping flow.
- **Archive completed sprints**: Keep only the last 3 completed sprints in `todo.md`. When adding a new completed sprint would exceed 3, move the oldest to `todo-archive.md`.

### 7. Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Keep agent/rule files current**: When adding, moving, or removing files referenced in `.claude/agents/` or `.claude/rules/`, update those files to match.
- **Cost vs Quality**: Cost and quality, sustainable architecture are equal. If there is a discrepancy where the lowest cost will impact the quality of the site, engage in conversation to arrive at a compromise.
- **Optional behavior via flags, not comments**: Never make features optional by requiring users to uncomment code. Use env vars, CLI flags, or scripts with flags instead. Applies to docker-compose, CI workflows, and any config.

### 8. Security strategy
- ***Always perform a security audit for each change***
- ***Perform comprehensive security audit when prompted***
- subagent for security audits: .claude/agents/security-auditor.md

### 9. Documentation
- See `.claude/rules/documentation.md`
- **Every change must evaluate README.md impact** — new features, config changes, infrastructure updates, and workflow changes require README updates in the same PR
- README.md is the fork-and-deploy guide: it must always be complete enough for a human or AI to clone, run locally, and deploy to AWS

### 10. Templates
- New agent files: copy `.claude/templates/agent.md` and fill in sections
- New rule files: copy `.claude/templates/rule.md` — scoped rules get `globs:` frontmatter, universal rules omit frontmatter
- New plan files: copy `.claude/templates/plan.md` — name as `yyyy-mm-dd-hh-mm-branch-name.md` for chronological ordering
