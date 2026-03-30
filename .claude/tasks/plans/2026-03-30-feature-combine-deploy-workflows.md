# Combine Deploy Stage + Deploy Prod into Single Workflow

**Branch**: `feature/combine-deploy-workflows`
**Status**: In Progress

## Context

Combine `deploy-stage.yml` and `deploy-prod.yml` into a single `deploy.yml` workflow with a 6-job chain: `deploy-stage-infra` -> `deploy-stage-frontend` -> `stage-post-deploy-validation` -> `deploy-infra` -> `deploy-frontend` -> `post-deploy-validation`. When `DEPLOY_STAGING` is not set, staging jobs are skipped and production jobs run directly.

## Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/deploy.yml` | Create | Combined 6-job deploy workflow |
| `.github/workflows/deploy-stage.yml` | Delete | Replaced by `deploy.yml` |
| `.github/workflows/deploy-prod.yml` | Delete | Replaced by `deploy.yml` |
| `.claude/rules/git-workflow.md` | Edit | Update Deploy Workflows, Prod Deploy Gate, Dependabot sections |
| `.claude/agents/aws-architect.md` | Edit | Update workflow file references (2 locations) |
| `README.md` | Edit | Update Continuous Deployment, Staging, and Production sections |

## Key Technical Decision

Production `deploy-infra` job uses `always() && !cancelled()` with result checks so it evaluates even when staging is skipped, but does not run if the workflow is cancelled or staging fails.
