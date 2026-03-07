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
