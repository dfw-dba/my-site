# Fix GitHub Actions Node.js 20 Deprecation Warnings

## Context

All workflow jobs emit deprecation warnings that Node.js 20 actions will be forced to Node.js 24 starting June 2, 2026. Rather than using the temporary `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env var, we upgrade all actions to their next major versions that natively target Node.js 24.

## Approach

Bump all action versions across 4 workflow files (20 total edits). `release-please-action@v4` is left as-is — it's a composite action that delegates to the CLI and doesn't ship its own JS runtime.

### Version Upgrade Map

| Action | From | To |
|--------|------|----|
| `actions/checkout` | `@v4` | `@v5` |
| `actions/setup-node` | `@v4` | `@v5` |
| `aws-actions/configure-aws-credentials` | `@v4` | `@v5` |
| `actions/setup-python` | `@v5` | `@v6` |
| `astral-sh/setup-uv` | `@v4` | `@v5` |
| `amannn/action-semantic-pull-request` | `@v5` | `@v6` |

### Files Changed

- `.github/workflows/ci.yml` — 5 changes
- `.github/workflows/deploy-stage.yml` — 7 changes
- `.github/workflows/deploy-prod.yml` — 7 changes
- `.github/workflows/lint-pr.yml` — 1 change

## Verification

- CI workflow passes without Node.js 20 deprecation warnings
- No README update needed — internal CI change only
