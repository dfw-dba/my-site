# Regression Tests and Deploy Lifecycle Automation

**Branch**: `feature/regression-tests`
**Status**: In Progress

## Context

Two problems:
1. The `stage-post-deploy-validation` job only runs PR-specific validation commands. There is no comprehensive regression test that verifies all site functions on every deploy.
2. The post-deploy lifecycle is not fully automated. After a successful deploy, Claude should autonomously: merge release-please PRs, handle dependabot PRs, and switch back to main. Currently these steps get dropped between sessions, leaving stale PRs open.

## Design Decisions

- **Standalone bash script** (`.github/scripts/regression-test.sh`) -- easy to maintain, add/remove tests as features change
- **Runs before PR-specific validation** -- regression failures are more fundamental; both still run and report independently
- **Admin endpoints tested for auth enforcement only** -- no credentials available in runner, so verify unauthenticated requests get 401/403
- **Separate PR comment** from existing validation results -- different purposes, cleaner separation
- **Reused in both staging and production** -- same script, different env vars and label argument

## Changes

### 1. Create regression test script
**File:** `.github/scripts/regression-test.sh`

New bash script with:
- `run_test` helper function that executes a command with 30s timeout, captures output/exit code, supports optional jq assertion
- `expect_status` helper for HTTP status code assertions (admin auth tests)
- 7 tests covering all public functionality:

| # | Test | Assertion |
|---|------|-----------|
| 1 | `GET ${API_URL}/api/health` | HTTP 200, `.status == "healthy"`, `.version` exists |
| 2 | `GET ${API_URL}/api/resume/` | HTTP 200, valid JSON with content |
| 3 | `GET ${API_URL}/api/resume/contact` | HTTP 200, valid JSON |
| 4 | `GET ${API_URL}/api/resume/timeline` | HTTP 200, valid JSON |
| 5 | `GET ${API_URL}/api/admin/logs` (no auth) | HTTP 401 or 403 |
| 6 | `POST ${API_URL}/api/admin/resume/entry` (no auth) | HTTP 401 or 403 |
| 7 | `GET https://${DOMAIN_NAME}/` | HTTP 200, contains `<!DOCTYPE` or `<html` |

- Output files: `/tmp/regression-results.md` (markdown for PR comment) and exit code 1 on any failure
- Uses `curl -sfL` everywhere per lessons.md (follow FastAPI redirects)
- Accepts `$1` as environment label ("Stage" or "Production")

### 2. Add regression steps to staging validation job
**File:** `.github/workflows/deploy.yml` (lines ~207-283)

Insert 3 new steps into `stage-post-deploy-validation`:
1. **"Run regression tests"** -- runs unconditionally (no PR guard), env: `API_URL`, `DOMAIN_NAME`, calls `regression-test.sh "Stage"`
2. **"Comment regression results on PR"** -- `if: always() && steps.find-pr.outputs.skip != 'true'`, posts `/tmp/regression-results.md` as PR comment
3. **"Fail if any validation failed"** -- final step, `if: always()`, checks both `steps.regression.outcome` and `steps.validate.outcome`

Modify existing PR-specific steps to use `if: always() && ...` so they still run even if regression tests fail.

### 3. Add regression steps to production validation job
**File:** `.github/workflows/deploy.yml` (lines ~486-551)

Mirror the same 3 new steps with production env vars (`API_URL` from `deploy-frontend` outputs, `DOMAIN_NAME` from `vars.CDK_DOMAIN_NAME`, label "Production").

### 4. Update Prod Deploy Gate with end-of-cycle cleanup
**File:** `.claude/rules/git-workflow.md`

Add step 9 to the Prod Deploy Gate section:
- After release-please PR is merged (or if none exists), check for open dependabot PRs and handle per the Dependabot section
- After all PRs are handled, switch to main and pull: `git checkout main && git pull`

### 5. Update Dependabot section with monitoring
**File:** `.claude/rules/git-workflow.md`

Update the Dependabot PRs section:
- After merging, monitor the CI run on main to confirm success
- Note that deploy will auto-trigger (CI success → deploy) but is a no-op for workflow-only changes — verify it completes without errors
- Claude should proactively check for dependabot PRs during end-of-cycle cleanup, not just "when Claude sees" them

### 6. Add Session Start Checks section
**File:** `.claude/rules/git-workflow.md`

New section instructing Claude to check at session start for:
- Open release-please PRs (merge if last deploy succeeded)
- Open dependabot PRs ready to merge
- Whether current branch is stale (already merged) — switch to main if so

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/scripts/regression-test.sh` | Create | Regression test script with 7 tests |
| `.github/workflows/deploy.yml` | Edit | Add regression steps to both validation jobs |
| `.claude/rules/git-workflow.md` | Edit | Add end-of-cycle cleanup, dependabot monitoring, session start checks |

## Verification

1. Push to a branch, create PR, merge -- verify the deploy workflow runs regression tests in the staging job
2. Check PR comment contains regression test results with all 7 tests passing
3. Verify production validation job also runs regression tests
4. Verify job fails if any regression test fails (can test by temporarily breaking an assertion)
5. Verify existing PR-specific validation still runs and reports independently
6. Read through updated git-workflow.md and verify the full lifecycle is documented end-to-end
