> **MANDATORY — NO EXCEPTIONS**: Never edit, stage, or commit files while on the `main` branch.
> Before making ANY file change (including `.claude/tasks/todo.md`, `CLAUDE.md`, or any other file),
> you MUST first create and switch to a feature or fix branch. This applies to every change,
> no matter how small — documentation, config, task tracking, everything.
>
> A broken deploy pipeline is **NOT** an exception. Create a `fix/` branch, push, and
> fast-track the PR. It takes under a minute. "It's just one line" is never a justification.

- **NEVER commit directly to `main`**. All changes must go through a pull request.
- **NEVER edit files while on `main`**. Switch to a branch FIRST, then make edits.
- Create a feature branch (`feature/<name>`) or fix branch (`fix/<name>`) for every change.
- Push the branch, create a PR targeting `main`, and merge via the PR.
- ***Always squash merge*** into `main` (`gh pr merge --squash`). No merge commits or rebase merges.
- Branch naming: `feature/short-description` for new work, `fix/short-description` for bug fixes.
- **PR titles MUST follow [Conventional Commits](https://www.conventionalcommits.org/) format** — enforced by `lint-pr.yml`.
  Since we squash-merge, the PR title becomes the commit message on `main`, which Release Please parses for versioning.
  Format: `type: description` or `type(scope): description`. Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.
  Append `!` for breaking changes (e.g., `feat!: redesign API`).

## PR Sections (REQUIRED)

PRs must have **three checklist sections** using table format:

1. `## Pre Deploy Checklist` — CI status and any pre-deploy manual checks. Applies to both stage and prod. Auto-marked as passed by the Deploy Stage workflow when it runs (since it only triggers after CI succeeds).
2. `## Stage Test Plan` — Manual staging verification items AND automated bash validation items (run against the **staging** API, `${API_URL}` points to staging). Staging validation failures are reported but do **not** block production — Claude verifies results before triggering prod (see Prod Deploy Gate below).
3. `## Prod-Post-deploy validation` — Automated bash validation items run against the **production** API (`${API_URL}` points to production).

## Table Format for Checklist Items

All checklist items use a table with columns: Passed, Failed, Item.

```markdown
| Passed | Failed | Item |
|--------|--------|------|
| | | CI workflow passes |
| | | Verify health endpoint responds |
```

When marked:
- Passed: `| :white_check_mark: | | Item description |`
- Failed: `| | :x: | Item description |`

Items with automated bash validation commands are linked via **HTML comment anchors** (invisible when rendered) placed after the table:

```markdown
<!-- validate: Verify health endpoint responds -->
```bash
curl -sf "${API_URL}/api/health"
```
```

Items without a matching `<!-- validate: ... -->` comment are treated as manual items and skipped by the validation scripts.

## Post-deploy Runner Constraints (MANDATORY)

The post-deploy runner is a bare GitHub Actions `ubuntu-latest` environment. It has ONLY these tools and env vars:
- `curl` — for testing HTTP endpoints
- `gh` CLI — for GitHub API operations (authenticated via `${GH_TOKEN}`)
- `${API_URL}` — the deployed API endpoint
- `${DOMAIN_NAME}` — the site domain
- `${GH_TOKEN}` — GitHub token

**DO NOT use in post-deploy items**: `aws` CLI, `psql`, `docker`, or any command requiring
AWS credentials, AWS profiles, database access, or secrets beyond `${GH_TOKEN}`.
If validation requires these, do it in the Pre Deploy Checklist phase (pre-merge) instead.

**IMPORTANT**: `${API_URL}` is the API Gateway domain (e.g. `https://api.example.com`) — it does NOT include
the `/api` path prefix. All backend routes are mounted under `/api/`, so use `${API_URL}/api/...` in commands.

Post-deploy items should test the actual production behavior introduced by the PR. Consider whether the change affects
infrastructure served by the deployed stack (e.g., CloudFront, Lambda, API Gateway) versus local-only configuration (e.g.,
Docker, nginx.conf) and write validation items accordingly.

## Example PR Format

```markdown
## Summary
- Brief description of changes

## Pre Deploy Checklist

| Passed | Failed | Item |
|--------|--------|------|
| | | CI workflow passes |

## Stage Test Plan

| Passed | Failed | Item |
|--------|--------|------|
| | | Verify health endpoint responds on staging |
| | | Verify new feature works on staging |

<!-- validate: Verify health endpoint responds on staging -->
```bash
curl -sf "${API_URL}/api/health"
```

<!-- validate: Verify new feature works on staging -->
```bash
curl -sf "${API_URL}/api/new-feature"
```

## Prod-Post-deploy validation

| Passed | Failed | Item |
|--------|--------|------|
| | | Verify health endpoint responds on production |
| | | Verify new feature works on production |

<!-- validate: Verify health endpoint responds on production -->
```bash
curl -sf "${API_URL}/api/health"
```

<!-- validate: Verify new feature works on production -->
```bash
curl -sf "${API_URL}/api/new-feature"
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Deploy Workflows

Deployment uses **two separate workflows**:

1. **Deploy Stage** (`deploy-stage.yml`): Triggers automatically on CI success (when `DEPLOY_STAGING=true`) or via manual dispatch. Runs: `deploy-stage-infra` → `deploy-stage-frontend` → `stage-post-deploy-validation`. The validation job auto-marks Pre Deploy Checklist items and extracts/runs commands from the `## Stage Test Plan` section.

2. **Deploy Prod** (`deploy-prod.yml`): Manual trigger only (`workflow_dispatch`). Runs: `deploy-infra` → `deploy-frontend` → `post-deploy-validation`. The validation job extracts/runs commands from the `## Prod-Post-deploy validation` section.

Results are commented on the PR and table items are automatically marked as passed/failed.

## Prod Deploy Gate (MANDATORY)

> **Claude MUST follow this process after every PR merge. No exceptions.**

After merging a PR:
1. Monitor the **Deploy Stage** workflow run to completion.
2. Verify Deploy Stage completed **without errors** (all jobs succeeded).
3. Verify **all Stage Test Plan items** in the PR table are marked as passed (`:white_check_mark:` in the Passed column).
4. **If both conditions are met**: trigger Deploy Prod via `gh workflow run deploy-prod.yml`.
5. **If either condition fails**: notify the user with specific details of what failed. Do **NOT** trigger Deploy Prod.
6. After triggering Deploy Prod, monitor it to completion and verify Prod-Post-deploy validation results.

## Pre-merge Workflow

- Every PR Pre Deploy Checklist item must be verified before suggesting the PR is ready to merge.
- Monitor CI job after submitting PR and mark CI checklist item complete if it completes successfully. Never suggest to merge a PR if the CI workflow is failing.
- After successful completion of CI and Pre Deploy Checklist items, merge the PR and begin the Prod Deploy Gate process above.
- If a new commit is pushed to the head branch, this invalidates the checklist items and the CI outcome. The CI must be run again and checklist items must be unmarked, re-executed, and marked as complete upon success.
