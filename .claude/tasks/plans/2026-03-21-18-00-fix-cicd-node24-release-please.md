# Plan: CI/CD Node.js 24 Upgrade & Release-Please Auto-Merge

## Context

Three CI/CD issues need addressing:
1. `aws-actions/configure-aws-credentials@v5` uses Node.js 20 (deprecated, forced to Node 24 by June 2026)
2. No automation to merge release-please PRs after Deploy Prod succeeds
3. Confirm CI/deploy correctly skips on release-please merges (it does), simplify tag format

**Branch**: `fix/cicd-node24-release-please`

---

## Change 1: Upgrade `aws-actions/configure-aws-credentials` v5 → v6

**Why**: v6.0.0 (released 2026-02-04) adds Node.js 24 support. Only breaking change is requiring runner v2.327.1+, which `ubuntu-latest` already meets.

**Files** (simple find-and-replace `@v5` → `@v6`):
- `.github/workflows/deploy-stage.yml` — lines 36, 85
- `.github/workflows/deploy-prod.yml` — lines 29, 87

---

## Change 2: Add release-please auto-merge to Prod Deploy Gate rules

**File**: `.claude/rules/git-workflow.md`

Add step 7 after current step 6 in the "Prod Deploy Gate (MANDATORY)" section:

> 7. After Deploy Prod completes successfully and all Prod-Post-deploy validation items pass, check for an open release-please PR (title matches `chore(main): release my-site *`). If one exists, merge it via `gh pr merge --squash`. This triggers the `release-please.yml` workflow which creates the GitHub Release and version tag. Do not trigger Deploy Prod again — the release-please merge only updates version metadata files which are excluded from CI via `paths-ignore`.

---

## Change 3: Simplify tag format to `v*`

**File**: `release-please-config.json`

Add `"include-component-in-tag": false` to the package config. This changes tags from `my-site-v0.3.1` to `v0.3.1`.

```json
{
  "packages": {
    ".": {
      "release-type": "simple",
      "component": "my-site",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false
    }
  }
}
```

---

## No changes needed (confirmed)

- **CI skip on release-please merge**: Already handled by `paths-ignore` in `ci.yml` covering `*.md`, `.release-please-manifest.json`, and `release-please-config.json`
- **Deploy Stage skip**: Triggers on CI success only — if CI is skipped, Deploy Stage doesn't run
- **Deploy Prod skip**: Manual trigger only
- **Version tagging**: Already handled automatically by `release-please.yml` when the release PR is merged

---

## Verification

1. Push branch, verify CI passes
2. On next deploy, confirm no Node.js 20 deprecation warning in deploy workflow logs
3. After next prod deploy, verify Claude follows the new step 7 to merge the release-please PR
4. Verify the merged release-please PR creates a tag in `v*` format (not `my-site-v*`)
5. Verify merging the release-please PR does NOT trigger CI or deploy workflows
