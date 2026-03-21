# Fix Release Please Label Application Failure

**Branch**: `fix/release-please-labeling`
**Status**: In Progress

## Context

Release Please workflow run 23380274073 failed when adding the `autorelease: pending` label to PR #89 via GitHub's GraphQL API. The PR was created successfully but the GraphQL node ID wasn't resolvable immediately after creation (timing issue). We want to keep the labels but prevent this from happening again.

## Changes

### 1. Use REST API for labeling instead of GraphQL
**File(s):** `.github/workflows/release-please.yml`

- Add `skip-labeling: true` to disable Release Please's built-in GraphQL-based labeling
- Add `id: release` to access action outputs
- Add separate step to apply `autorelease: pending` label via `gh pr edit` (REST API)
- Add separate step to swap to `autorelease: tagged` when a release is created

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/release-please.yml` | Edit | Skip built-in labeling, add REST API label steps |

## Verification

1. Workflow YAML passes syntax validation
2. After merging, push a feature commit to main and confirm Release Please workflow succeeds with labels applied
