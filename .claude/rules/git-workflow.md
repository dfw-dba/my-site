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

## Deploy Workflow

Deployment uses a **single combined workflow** (`deploy.yml`) with a 6-job chain:

```
deploy-stage-infra → deploy-stage-frontend → stage-post-deploy-validation → deploy-infra → deploy-frontend → post-deploy-validation
```

- **Triggers**: Automatically on CI success (main branch) or via `workflow_dispatch`.
- **Staging jobs** (1-3): Run when `DEPLOY_STAGING=true`. When not set, staging is skipped and production jobs run directly.
- **Production jobs** (4-6): Run after staging succeeds or is skipped. The `deploy-infra` job uses `always() && !cancelled()` so it evaluates even when staging is skipped.
- **Stage validation**: Auto-marks Pre Deploy Checklist items and runs commands from `## Stage Test Plan`.
- **Prod validation**: Runs commands from `## Prod-Post-deploy validation`.

Results are commented on the PR and table items are automatically marked as passed/failed.

## Staging Environment

Staging deploys to a **separate AWS account** using `AWS_STAGE_DEPLOY_ROLE_ARN`, `AWS_STAGE_ACCOUNT_ID`, and `CDK_STAGE_DOMAIN_NAME`. Staging stacks are the same 4 as prod (`MySiteDns`, `MySiteCert`, `MySiteData`, `MySiteApp`). The `CDK_IS_STAGING` env var controls operational differences (backup retention, deletion protection).

## Prod Deploy Gate (MANDATORY)

> **Claude MUST follow this process after every PR merge. No exceptions. The entire flow runs autonomously without user confirmation.**

After merging a PR:
1. Monitor the **Deploy** workflow run to completion (staging and production run as a single workflow).
2. Verify all staging jobs completed **without errors** (if staging is enabled).
3. Verify **all Stage Test Plan items** in the PR table are marked as passed (`:white_check_mark:` in the Passed column).
4. **If staging fails**: notify the user with specific details. Production jobs will not run because staging failed (the `deploy-infra` job requires staging success or skip).
5. Verify all production jobs completed successfully and all **Prod-Post-deploy validation** items pass.
6. **If production fails**: notify the user with specific details.
7. To re-trigger the full pipeline manually: `gh workflow run deploy.yml`.
8. After the Deploy workflow completes successfully (both stages), check for an open release-please PR (title matches `chore(main): release my-site *`). If one exists, merge it via `gh pr merge --squash --admin`. This triggers the `release-please.yml` workflow which creates the GitHub Release and version tag. Do not trigger Deploy again — the release-please merge only updates version metadata files which are excluded from CI via `paths-ignore`.
9. **End-of-cycle cleanup**: Check for open Dependabot PRs and handle them per the Dependabot section below. Then switch to main and pull: `git checkout main && git pull`.

## Pre-merge Workflow (MANDATORY)

> **Claude MUST merge the PR automatically once all Pre Deploy Checklist items are marked as passed. Do not wait for user confirmation.**

1. Monitor CI job after submitting PR.
2. Verify every Pre Deploy Checklist item and mark each as passed/failed.
3. **Once all Pre Deploy Checklist items are marked as passed**: immediately squash-merge the PR (`gh pr merge --squash`). Do **not** prompt the user or wait for approval.
4. After merge, begin the Prod Deploy Gate process above.
5. If a new commit is pushed to the head branch, this invalidates the checklist items and the CI outcome. The CI must be run again, checklist items must be unmarked, re-executed, and marked as complete upon success.

> **All test plan items must be executable and verifiable before merge.** Do not write aspirational items that require post-merge validation. Each item must have a concrete command or manual step that can be run immediately after CI passes.

## Dependabot PRs (GitHub Actions)

Dependabot creates PRs to update GitHub Actions SHAs (configured in `.github/dependabot.yml`). These PRs update pinned commit SHAs in workflow files and are low-risk.

**When Claude sees a Dependabot PR** (author `dependabot[bot]`, title starts with `ci(deps):`):
1. Verify the PR only changes `.github/workflows/*.yml` files (SHA pins and version comments).
2. Verify CI passes on the PR.
3. If both conditions are met: approve and squash-merge the PR (`gh pr merge --squash --admin`).
4. **Monitor after merge**: CI will run on main for the merged commit. Verify it completes successfully. A Deploy workflow will auto-trigger after CI succeeds — since only workflow files changed, it will succeed as a no-op. Verify the Deploy completes without errors.
5. Skip the full Prod Deploy Gate process (no release-please PR will be created for workflow-only changes).
6. If the PR modifies anything beyond workflow SHA pins (e.g., adds new steps, changes env vars, modifies scripts), treat it as a normal PR and flag it for user review.

## Session Start Checks (MANDATORY)

> **Claude MUST run these checks at the start of every new session before beginning any new work.**

1. **Stale branch detection**: If the current branch is not `main`, check if it has already been merged (`gh pr list --head <branch> --state merged`). If merged, switch to main and pull: `git checkout main && git pull`.
2. **Open release-please PR**: Check for an open PR with title matching `chore(main): release *`. If the most recent Deploy workflow on main succeeded, merge it: `gh pr merge --squash --admin`.
3. **Open Dependabot PRs**: Check for open PRs authored by `dependabot[bot]`. Handle each per the Dependabot section above.
4. After handling all pending PRs, ensure you are on `main` with latest: `git checkout main && git pull`.
