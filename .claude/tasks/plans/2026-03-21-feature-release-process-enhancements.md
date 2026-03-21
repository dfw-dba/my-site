# Release Process Enhancements

**Branch**: `feature/release-process-enhancements`
**Status**: In Progress

## Context

The current release process has several inefficiencies: CI and Deploy run unnecessarily for release-please PRs, the deploy workflow combines staging and production in a tightly coupled chain, and the PR checklist format uses basic checkboxes that don't distinguish pass/fail states. This plan restructures CI triggers, splits deploy into independent stage/prod workflows, reorganizes PR sections, and introduces a table-based checklist format.

## Changes

### 1. Exclude release-please from CI triggers
**File(s):** `.github/workflows/ci.yml`

Add `.release-please-manifest.json` and `release-please-config.json` to `paths-ignore` in both `push` and `pull_request` triggers. Release-please PRs only modify `CHANGELOG.md` (already covered by `*.md`) and `.release-please-manifest.json`. This also prevents Deploy Stage from triggering since it uses `workflow_run` on CI -- no CI run means no `workflow_run` event.

### 2. Create Deploy Stage workflow
**File(s):** `.github/workflows/deploy-stage.yml` (new), `.github/workflows/deploy.yml` (delete)

Extract staging jobs from current `deploy.yml` into a new `deploy-stage.yml`:
- **Name**: `Deploy Stage`
- **Triggers**: `workflow_run` from CI on `main` (same as current), `workflow_dispatch` (no inputs -- dispatching always means staging)
- **Jobs**: `deploy-stage-infra` → `deploy-stage-frontend` → `stage-post-deploy-validation`
- `deploy-stage-infra` condition: `(workflow_run success && DEPLOY_STAGING==true) || workflow_dispatch`
- `stage-post-deploy-validation`: reads from section `"Stage Test Plan"` (new name)
- Auto-marks "CI workflow passes" in the Pre Deploy Checklist table at the start of `stage-post-deploy-validation` (since this workflow only triggers after CI succeeds)
- Permissions, env, and job contents identical to current staging jobs

### 3. Create Deploy Prod workflow
**File(s):** `.github/workflows/deploy-prod.yml` (new)

Extract production jobs from current `deploy.yml` into a new `deploy-prod.yml`:
- **Name**: `Deploy Prod`
- **Triggers**: `workflow_dispatch` only (manual, no confirmation input)
- **Jobs**: `deploy-infra` → `deploy-frontend` → `post-deploy-validation`
- No dependency on staging validation -- safety gate is Claude verifying stage results before triggering (see Change 9)
- `deploy-infra` has no conditional (`if`) -- always runs when manually dispatched
- `post-deploy-validation`: reads from section `"Prod-Post-deploy validation"` (renamed)
- Permissions, env, and job contents identical to current production jobs

### 4. Restructure PR sections
**File(s):** `.claude/rules/git-workflow.md`

Old format:
```
## Test plan
## Post-stage-deploy validation
## Post-deploy validation
```

New format:
```
## Pre Deploy Checklist
## Stage Test Plan
## Prod-Post-deploy validation
```

- **Pre Deploy Checklist**: CI status + any pre-deploy manual checks (applies to both stage and prod)
- **Stage Test Plan**: Merged section -- contains both manual staging checks AND automated bash validation items (previously split between "Test plan" and "Post-stage-deploy validation")
- **Prod-Post-deploy validation**: Renamed from "Post-deploy validation", contains automated bash items for prod

### 5. Table format for checklist items (HTML comment anchors)
**File(s):** `.github/scripts/post-deploy-validate.sh`, `.github/scripts/post-deploy-update-checkboxes.sh`, `.claude/rules/git-workflow.md`

Replace checkbox format with table format across all PR sections. Single table per section. Automated bash blocks listed after the table, linked via invisible HTML comments.

**New item format:**
```markdown
## Stage Test Plan

| Passed | Failed | Item |
|--------|--------|------|
| | | CI workflow passes |
| | | Verify health endpoint responds on staging |
| | | Verify API returns valid JSON |

<!-- validate: Verify health endpoint responds on staging -->
```bash
curl -sf "${API_URL}/api/health"
```

<!-- validate: Verify API returns valid JSON -->
```bash
curl -sf "${API_URL}/api/other"
```
```

When marked:
- Passed: `| :white_check_mark: | | Item description |`
- Failed: `| | :x: | Item description |`

**Script changes:**

`post-deploy-validate.sh`:
- Parse table rows (lines matching `| ... | ... | ... |`, skip header + separator)
- Extract item description from third column (trimmed)
- Find matching `<!-- validate: DESCRIPTION -->` comment and extract the bash block that follows
- Items without a matching comment are manual items -- skipped
- Execution and result output logic stays the same

`post-deploy-update-checkboxes.sh`:
- For passed items: sed replace `| | | DESC |` with `| :white_check_mark: | | DESC |`
- For failed items: sed replace `| | | DESC |` with `| | :x: | DESC |`

### 6. Auto-mark CI in Pre Deploy Checklist
**File(s):** `.github/workflows/deploy-stage.yml`, `.github/scripts/pre-deploy-update-checkboxes.sh` (new)

Add a step at the start of `stage-post-deploy-validation` job that marks the Pre Deploy Checklist items as passed. Since Deploy Stage only triggers after CI succeeds, this is safe.

New script `pre-deploy-update-checkboxes.sh`:
- Takes PR number and section name ("Pre Deploy Checklist")
- Fetches PR body, finds the table in that section
- Marks all unmarked items as passed (`:white_check_mark:` in Passed column)
- Updates PR body via `gh pr edit`

### 7. Update README.md
**File(s):** `README.md`

Update the "Continuous Deployment" section (lines ~588-631):
- Describe the two-workflow model (Deploy Stage + Deploy Prod)
- Update the pipeline diagram: stage is automatic after CI, prod is manual
- Explain that prod is triggered by Claude after verifying stage success
- Update section name references
- Update manual deploy instructions

### 8. Update git-workflow.md comprehensively
**File(s):** `.claude/rules/git-workflow.md`

- Replace all checkbox format examples with table format + HTML comment convention
- Update section names throughout
- Update deploy chain description for two-workflow model
- Update post-deploy item format section with new table examples
- Update post-deploy runner constraints section
- Update the example format block
- Remove references to single deploy workflow

### 9. Add prod deploy gate rules to git-workflow.md
**File(s):** `.claude/rules/git-workflow.md`

Add a new mandatory section documenting the prod deploy process:

**Claude's prod deploy gate process:**
1. After PR merge, monitor the Deploy Stage workflow to completion
2. Verify Deploy Stage workflow completed without errors
3. Verify all Stage Test Plan items in the PR are marked as passed (`:white_check_mark:` in Passed column)
4. If both conditions met: trigger Deploy Prod via `gh workflow run deploy-prod.yml`
5. If either condition fails: notify the user with details of what failed and do **not** trigger prod deploy
6. After triggering Deploy Prod, monitor it to completion and verify Prod-Post-deploy validation results

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Edit | Add release-please files to paths-ignore |
| `.github/workflows/deploy.yml` | Delete | Replaced by deploy-stage.yml and deploy-prod.yml |
| `.github/workflows/deploy-stage.yml` | Create | Staging deploy workflow (extracted from deploy.yml) |
| `.github/workflows/deploy-prod.yml` | Create | Production deploy workflow (manual trigger only) |
| `.github/scripts/post-deploy-validate.sh` | Edit | Rewrite parser for table format + HTML comment anchors |
| `.github/scripts/post-deploy-update-checkboxes.sh` | Edit | Update from checkbox sed to table cell emoji insertion |
| `.github/scripts/pre-deploy-update-checkboxes.sh` | Create | Auto-mark Pre Deploy Checklist items as passed |
| `.claude/rules/git-workflow.md` | Edit | New sections, table format, two-workflow model, prod gate rules |
| `README.md` | Edit | Update Continuous Deployment section |

## Verification

1. Create a test PR with the new table format and verify GitHub renders it correctly
2. Test `post-deploy-validate.sh` locally with a sample PR body file containing the new format
3. Test `post-deploy-update-checkboxes.sh` locally to verify table cell updates work
4. Test `pre-deploy-update-checkboxes.sh` locally to verify Pre Deploy Checklist marking works
5. Verify CI does not trigger for a release-please PR (check paths-ignore covers all changed files)
6. Verify deploy-stage triggers correctly on CI completion
7. Verify deploy-prod only runs via manual dispatch
8. Run full deploy cycle: merge PR → CI → Deploy Stage → Claude verifies → Deploy Prod
